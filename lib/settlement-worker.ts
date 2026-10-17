import { prisma } from '@/lib/prisma'
import AiSettlementWorker from './ai-settlement-worker'

interface MatchResult {
  id: string
  homeTeam: string
  awayTeam: string
  homeScore: number
  awayScore: number
  status: string
  kickoffTime: string
}

/**
 * Main settlement worker that processes finished matches
 * and evaluates both user predictions and AI predictions
 */
export class SettlementWorker {
  /**
   * Process all finished matches
   */
  static async processFinishedMatches() {
    console.log('Starting settlement worker...')
    
    try {
      // Process user predictions (existing functionality)
      await this.processUserPredictions()
      
      // Process AI predictions (new feedback loop)
      await AiSettlementWorker.run()
      
      console.log('Settlement worker completed successfully')
    } catch (error) {
      console.error('Settlement worker failed:', error)
      throw error
    }
  }

  /**
   * Process user predictions (existing logic)
   */
  private static async processUserPredictions() {
    // Add existing user prediction settlement logic here
    console.log('Processing user predictions...')
    // ... existing implementation
  }
}

interface Prediction {
  id: string
  userId: string
  matchId: string
  marketType: string
  predictedValue: string
  confidence: number
  result: string
}

export async function settleFinishedMatches() {
  console.log('Starting match settlement worker...')
  
  try {
    // Get all finished matches that haven't been settled
    const unsettledMatches = await prisma.$queryRaw<MatchResult[]>`
      SELECT 
        id, homeTeam, awayTeam, homeScore, awayScore, 
        status, kickoffTime
      FROM matches 
      WHERE status = 'finished' 
      AND id NOT IN (
        SELECT DISTINCT matchId FROM predictions WHERE result != 'pending'
      )
      ORDER BY kickoffTime DESC
      LIMIT 50
    `

    console.log(`📊 Found ${unsettledMatches.length} unsettled matches`)

    for (const match of unsettledMatches) {
      await settleMatch(match)
    }

    console.log(' Match settlement worker completed')
  } catch (error) {
    console.error(' Match settlement worker error:', error)
  }
}

async function settleMatch(match: MatchResult) {
  console.log(` Settling match: ${match.homeTeam} vs ${match.awayTeam}`)
  
  try {
    // Get all predictions for this match
    const predictions = await prisma.$queryRaw<Prediction[]>`
      SELECT * FROM predictions 
      WHERE matchId = ${match.id} AND result = 'pending'
    `

    console.log(` Processing ${predictions.length} predictions`)

    for (const prediction of predictions) {
      const result = evaluatePrediction(prediction, match)
      await updatePredictionResult(prediction.id, result)
      await updateUserReputation(prediction.userId)
    }

    console.log(`Settled match: ${match.homeTeam} ${match.homeScore}-${match.awayScore} ${match.awayTeam}`)
  } catch (error) {
    console.error(` Error settling match ${match.id}:`, error)
  }
}

function evaluatePrediction(prediction: Prediction, match: MatchResult): string {
  const { marketType, predictedValue } = prediction
  const { homeScore, awayScore } = match
  const totalGoals = homeScore + awayScore
  const bothTeamsScored = homeScore > 0 && awayScore > 0

  switch (marketType) {
    case '1X2':
      if (predictedValue === '1' && homeScore > awayScore) return 'won'
      if (predictedValue === 'X' && homeScore === awayScore) return 'won'
      if (predictedValue === '2' && awayScore > homeScore) return 'won'
      return 'lost'

    case 'OVER_UNDER_2_5':
      if (predictedValue === 'OVER' && totalGoals > 2.5) return 'won'
      if (predictedValue === 'UNDER' && totalGoals <= 2.5) return 'won'
      return 'lost'

    case 'BTTS':
      if (predictedValue === 'YES' && bothTeamsScored) return 'won'
      if (predictedValue === 'NO' && !bothTeamsScored) return 'won'
      return 'lost'

    case 'OVER_UNDER_CORNERS':
      // Note: This would need actual corner data from match API
      // For now, assume average of 10 corners per match
      const corners = 10 // Placeholder
      if (predictedValue.startsWith('OVER') && corners > parseFloat(predictedValue.split(' ')[1])) return 'won'
      if (predictedValue.startsWith('UNDER') && corners <= parseFloat(predictedValue.split(' ')[1])) return 'won'
      return 'lost'

    case 'CARDS_OVER_UNDER':
      // Note: This would need actual card data from match API
      // For now, assume average of 3 cards per match
      const cards = 3 // Placeholder
      if (predictedValue.startsWith('OVER') && cards > parseFloat(predictedValue.split(' ')[1])) return 'won'
      if (predictedValue.startsWith('UNDER') && cards <= parseFloat(predictedValue.split(' ')[1])) return 'won'
      return 'lost'

    case 'AI_GENERATED':
      // AI predictions follow same logic as their market type
      return evaluateAIPrediction(prediction, match)

    default:
      return 'lost'
  }
}

function evaluateAIPrediction(prediction: Prediction, match: MatchResult): string {
  // AI predictions would have their own evaluation logic
  // For now, treat as regular 1X2 prediction
  const { predictedValue } = prediction
  const { homeScore, awayScore } = match

  if (predictedValue === '1' && homeScore > awayScore) return 'won'
  if (predictedValue === 'X' && homeScore === awayScore) return 'won'
  if (predictedValue === '2' && awayScore > homeScore) return 'won'
  return 'lost'
}

async function updatePredictionResult(predictionId: string, result: string) {
  // Get current prediction state for audit
  const currentPrediction = await prisma.$queryRaw<Prediction[]>`
    SELECT * FROM predictions WHERE id = ${predictionId}
  `

  if (!currentPrediction.length) return

  const oldState = JSON.stringify(currentPrediction[0])
  const newState = JSON.stringify({ ...currentPrediction[0], result })

  // Update prediction result
  await prisma.$queryRaw`
    UPDATE predictions 
    SET result = ${result}
    WHERE id = ${predictionId}
  `

  // Create audit log
  await prisma.$queryRaw`
    INSERT INTO prediction_audit_logs (
      id, predictionId, oldState, newState, changedAt
    ) VALUES (
      'audit_' || hex(randomblob(9)), 
      ${predictionId}, ${oldState}, ${newState}, datetime('now')
    )
  `
}

async function updateUserReputation(userId: string) {
  const stats = await prisma.$queryRaw<any[]>`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN result = 'won' THEN 1 ELSE 0 END) as correct
    FROM predictions 
    WHERE userId = ${userId}
  `

  const total = stats[0]?.total || 0
  const correct = stats[0]?.correct || 0
  const accuracy = total > 0 ? (correct / total) * 100 : 0

  // Calculate reputation points with confidence bonus/penalty
  const pointsResult = await prisma.$queryRaw<any[]>`
    SELECT 
      SUM(
        CASE 
          WHEN result = 'won' THEN 
            CASE WHEN confidence >= 4 THEN 15 ELSE 10 END
          WHEN result = 'lost' THEN 
            CASE WHEN confidence >= 4 THEN -11 ELSE -6 END
          ELSE 0 
        END
      ) as totalPoints
    FROM predictions 
    WHERE userId = ${userId}
  `

  const reputationPoints = pointsResult[0]?.totalPoints || 0

  // Determine rank tier
  let rankTier = 'Beginner'
  if (reputationPoints >= 800) rankTier = 'Verified Predictor'
  else if (reputationPoints >= 400) rankTier = 'Elite'
  else if (reputationPoints >= 150) rankTier = 'Expert'
  else if (reputationPoints >= 50) rankTier = 'Analyst'

  // Upsert reputation record
  await prisma.$queryRaw`
    INSERT OR REPLACE INTO user_reputations (
      id, userId, totalPredictions, correctPredictions, 
      accuracyScore, reputationPoints, rankTier, lastUpdated
    ) VALUES (
      COALESCE((SELECT id FROM user_reputations WHERE userId = ${userId}), 'rep_' || hex(randomblob(9))),
      ${userId}, ${total}, ${correct}, ${accuracy}, ${reputationPoints}, ${rankTier}, datetime('now')
    )
  `

  console.log(`Updated reputation for user ${userId}: ${reputationPoints}pts (${rankTier})`)
}

// Export for use in API routes
export { updateUserReputation }

// Run settlement worker if called directly
if (require.main === module) {
  settleFinishedMatches()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Settlement worker failed:', error)
      process.exit(1)
    })
}

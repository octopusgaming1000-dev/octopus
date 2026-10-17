import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken, JWTPayload } from '@/lib/auth'

// Import mission tracking
async function trackMissionProgress(userId: string, missionType: string, increment: number = 1) {
  const today = new Date().toISOString().split('T')[0]
  
  // Get today's mission for this type
  const mission = await prisma.$queryRaw<any[]>`
    SELECT dm.*, ump.progress, ump.completed
    FROM daily_missions dm
    LEFT JOIN user_mission_progress ump ON dm.id = ump.missionId AND ump.userId = ${userId}
    WHERE dm.date = ${today} AND dm.missionType = ${missionType}
  `
  
  if (mission.length > 0) {
    const missionData = mission[0]
    const newProgress = Math.min((missionData.progress || 0) + increment, missionData.requirementValue)
    const isCompleted = newProgress >= missionData.requirementValue && !missionData.completed
    
    // Update progress
    await prisma.$queryRaw`
      INSERT OR REPLACE INTO user_mission_progress (id, userId, missionId, progress, completed, completedAt)
      VALUES (
        COALESCE((SELECT id FROM user_mission_progress WHERE userId = ${userId} AND missionId = ${missionData.id}), 'ump_' || hex(randomblob(9))),
        ${userId}, ${missionData.id}, ${newProgress}, ${isCompleted ? 1 : 0},
        CASE WHEN ${isCompleted} = 1 THEN datetime('now') ELSE NULL END
      )
    `
    
    // Award reputation points if newly completed
    if (isCompleted) {
      await prisma.$queryRaw`
        UPDATE user_reputations 
        SET reputationPoints = reputationPoints + 2, lastUpdated = datetime('now')
        WHERE userId = ${userId}
      `
    }
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const matchId = searchParams.get('matchId')
    const userId = searchParams.get('userId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    // Authentication
    const user = await authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    switch (action) {
      case 'match-predictions':
        if (!matchId) {
          return NextResponse.json({ error: 'Match ID required' }, { status: 400 })
        }

        const predictions = await prisma.$queryRaw`
          SELECT 
            p.*,
            u.name as userName,
            ur.reputationPoints,
            ur.rankTier,
            ur.accuracyScore
          FROM predictions p
          LEFT JOIN users u ON p.userId = u.id
          LEFT JOIN user_reputations ur ON p.userId = ur.userId
          WHERE p.matchId = ${matchId}
          ORDER BY p.createdAt DESC
          LIMIT ${limit} OFFSET ${(page - 1) * limit}
        `

        return NextResponse.json({
          success: true,
          data: { predictions }
        })

      case 'user-predictions':
        if (!userId) {
          return NextResponse.json({ error: 'User ID required' }, { status: 400 })
        }

        const userPredictions = await prisma.$queryRaw`
          SELECT 
            p.*,
            m.homeTeam,
            m.awayTeam,
            m.league,
            m.homeScore,
            m.awayScore,
            m.status as matchStatus
          FROM predictions p
          LEFT JOIN matches m ON p.matchId = m.id
          WHERE p.userId = ${userId}
          ORDER BY p.createdAt DESC
          LIMIT ${limit} OFFSET ${(page - 1) * limit}
        `

        return NextResponse.json({
          success: true,
          data: { predictions: userPredictions }
        })

      case 'leaderboard':
        const leaderboard = await prisma.$queryRaw`
          SELECT 
            u.id,
            u.name,
            u.image,
            ur.totalPredictions,
            ur.correctPredictions,
            ur.accuracyScore,
            ur.reputationPoints,
            ur.rankTier
          FROM users u
          LEFT JOIN user_reputations ur ON u.id = ur.userId
          WHERE ur.totalPredictions >= 10
          ORDER BY ur.reputationPoints DESC
          LIMIT 100
        `

        return NextResponse.json({
          success: true,
          data: { leaderboard }
        })

      case 'user-reputation':
        if (!userId) {
          return NextResponse.json({ error: 'User ID required' }, { status: 400 })
        }

        const reputation = await prisma.$queryRaw<any[]>`
          SELECT 
            ur.*,
            u.name,
            u.image
          FROM user_reputations ur
          LEFT JOIN users u ON ur.userId = u.id
          WHERE ur.userId = ${userId}
        `

        return NextResponse.json({
          success: true,
          data: reputation[0] || null
        })

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Prediction GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    // Authentication
    const user = await authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    switch (action) {
      case 'create-prediction':
        const { matchId, marketType, predictedValue, confidence } = body

        if (!matchId || !marketType || !predictedValue) {
          return NextResponse.json(
            { error: 'Match ID, market type, and predicted value required' },
            { status: 400 }
          )
        }

        if (confidence < 1 || confidence > 5) {
          return NextResponse.json(
            { error: 'Confidence must be between 1 and 5' },
            { status: 400 }
          )
        }

        // Check if match is still scheduled (not started)
        const match = await prisma.$queryRaw<any[]>`
          SELECT kickoffTime, status FROM matches WHERE id = ${matchId}
        `

        if (!match.length) {
          return NextResponse.json({ error: 'Match not found' }, { status: 404 })
        }

        const matchData = match[0]
        const now = new Date()
        const kickoffTime = new Date(matchData.kickoffTime)

        if (matchData.status !== 'scheduled' || kickoffTime <= now) {
          return NextResponse.json(
            { error: 'Predictions are only allowed before kickoff' },
            { status: 400 }
          )
        }

        // Check daily prediction limit
        const today = now.toISOString().split('T')[0]
        const dailyCount = await prisma.$queryRaw<any[]>`
          SELECT COUNT(*) as count FROM predictions 
          WHERE userId = ${user.userId} 
          AND DATE(created_at) = ${today}
        `

        if (dailyCount[0].count >= 30) {
          return NextResponse.json(
            { error: 'Daily prediction limit reached (30 per day)' },
            { status: 429 }
          )
        }

        // Check for existing prediction on same market
        const existingPrediction = await prisma.$queryRaw<any[]>`
          SELECT id FROM predictions 
          WHERE userId = ${user.userId} 
          AND matchId = ${matchId} 
          AND marketType = ${marketType}
        `

        if (existingPrediction.length > 0) {
          return NextResponse.json(
            { error: 'Prediction already exists for this market' },
            { status: 400 }
          )
        }

        // Create prediction
        const prediction = await prisma.$queryRaw<any[]>`
          INSERT INTO predictions (
            id, userId, matchId, marketType, predictedValue, 
            confidence, createdAt, lockedAt
          ) VALUES (
            'pred_' || hex(randomblob(9)), 
            ${user.userId}, ${matchId}, ${marketType}, ${predictedValue}, 
            ${confidence || 3}, datetime('now'), datetime('now')
          )
          RETURNING *
        `

        // Update user reputation record
        await updateUserReputation(user.userId)

        // Track mission progress
        await trackMissionProgress(user.userId, 'PREDICT_3_MATCHES', 1)
        
        // Track high confidence prediction
        if (confidence >= 4) {
          await trackMissionProgress(user.userId, 'HIGH_CONFIDENCE_PREDICTION', 1)
        }

        return NextResponse.json({
          success: true,
          data: { prediction: prediction[0] }
        })

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Prediction POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, predictionId } = body

    // Authentication
    const user = await authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    switch (action) {
      case 'edit-prediction':
        const { predictedValue, confidence } = body

        if (!predictedValue) {
          return NextResponse.json(
            { error: 'Predicted value required' },
            { status: 400 }
          )
        }

        // Check if prediction is still editable (before kickoff)
        const predictionCheck = await prisma.$queryRaw<any[]>`
          SELECT p.*, m.kickoffTime, m.status as matchStatus
          FROM predictions p
          LEFT JOIN matches m ON p.matchId = m.id
          WHERE p.id = ${predictionId} AND p.userId = ${user.userId}
        `

        if (!predictionCheck.length) {
          return NextResponse.json(
            { error: 'Prediction not found or unauthorized' },
            { status: 404 }
          )
        }

        const predData = predictionCheck[0]
        const now = new Date()
        const kickoffTime = new Date(predData.kickoffTime)

        if (predData.matchStatus !== 'scheduled' || kickoffTime <= now) {
          return NextResponse.json(
            { error: 'Predictions can only be edited before kickoff' },
            { status: 400 }
          )
        }

        // Store old state for audit
        const oldState = JSON.stringify({
          predictedValue: predictionCheck[0].predictedValue,
          confidence: predictionCheck[0].confidence
        })

        // Update prediction
        await prisma.$queryRaw`
          UPDATE predictions 
          SET predictedValue = ${predictedValue}, confidence = ${confidence || 3}
          WHERE id = ${predictionId} AND userId = ${user.userId}
        `

        // Create audit log
        const newState = JSON.stringify({ predictedValue, confidence })
        await prisma.$queryRaw`
          INSERT INTO prediction_audit_logs (
            id, predictionId, oldState, newState, changedAt
          ) VALUES (
            'audit_' || hex(randomblob(9)), 
            ${predictionId}, ${oldState}, ${newState}, datetime('now')
          )
        `

        return NextResponse.json({
          success: true,
          message: 'Prediction updated successfully'
        })

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Prediction PUT error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const predictionId = searchParams.get('predictionId')

    // Authentication
    const user = await authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!predictionId) {
      return NextResponse.json({ error: 'Prediction ID required' }, { status: 400 })
    }

    // Check if prediction is still deletable (before kickoff)
    const predictionCheck = await prisma.$queryRaw<any[]>`
      SELECT p.*, m.kickoffTime, m.status as matchStatus
      FROM predictions p
      LEFT JOIN matches m ON p.matchId = m.id
      WHERE p.id = ${predictionId} AND p.userId = ${user.userId}
    `

    if (!predictionCheck.length) {
      return NextResponse.json(
        { error: 'Prediction not found or unauthorized' },
        { status: 404 }
      )
    }

    const predData = predictionCheck[0]
    const now = new Date()
    const kickoffTime = new Date(predData.kickoffTime)

    if (predData.matchStatus !== 'scheduled' || kickoffTime <= now) {
      return NextResponse.json(
        { error: 'Predictions can only be deleted before kickoff' },
        { status: 400 }
      )
    }

    // Delete prediction
    await prisma.$queryRaw`
      DELETE FROM predictions WHERE id = ${predictionId} AND userId = ${user.userId}
    `

    // Update user reputation
    await updateUserReputation(user.userId)

    return NextResponse.json({
      success: true,
      message: 'Prediction deleted successfully'
    })
  } catch (error) {
    console.error('Prediction DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Helper functions
async function authenticateRequest(request: NextRequest): Promise<JWTPayload | null> {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.substring(7)
  return verifyToken(token)
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
}

import { prisma } from '@/lib/prisma'
import { AiPredictionService } from '@/lib/ai-prediction-service'

interface MatchResult {
  id: string
  homeTeam: string
  awayTeam: string
  homeScore: number
  awayScore: number
  status: string
  kickoffTime: string
}

export class AiSettlementWorker {
  /**
   * Process finished matches and evaluate AI predictions
   */
  static async processFinishedMatches() {
    try {
      console.log('🤖 Starting AI prediction settlement worker...')
      
      // Get all finished matches that haven't been processed
      const finishedMatches = await prisma.match.findMany({
        where: {
          status: 'finished',
          homeScore: { not: null },
          awayScore: { not: null },
        },
        include: {
          aiPredictions: {
            where: {
              results: {
                none: {},
              },
            },
          },
        },
      })

      console.log(`📊 Found ${finishedMatches.length} finished matches to process`)

      for (const match of finishedMatches) {
        await this.evaluateMatchPredictions(match)
      }

      console.log('✅ AI prediction settlement worker completed')
    } catch (error) {
      console.error('❌ AI settlement worker failed:', error)
    }
  }

  /**
   * Evaluate all predictions for a specific match
   */
  private static async evaluateMatchPredictions(match: any) {
    const predictions = match.aiPredictions
    console.log(`🔍 Evaluating ${predictions.length} predictions for match: ${match.homeTeam} vs ${match.awayTeam}`)

    for (const prediction of predictions) {
      try {
        const result = await this.evaluatePrediction(prediction, match)
        await this.updateMarketCalibration(prediction.marketType, result.wasCorrect)
        console.log(`✓ Evaluated ${prediction.marketType} prediction: ${result.wasCorrect ? 'CORRECT' : 'WRONG'}`)
      } catch (error) {
        console.error(`❌ Failed to evaluate prediction ${prediction.id}:`, error)
      }
    }
  }

  /**
   * Evaluate a single prediction against actual match result
   */
  private static async evaluatePrediction(prediction: any, match: any) {
    const actualOutcome = this.getActualOutcome(prediction.marketType, match)
    const wasCorrect = this.determineCorrectness(prediction.predictedValue, actualOutcome)
    const errorMargin = wasCorrect ? 0 : prediction.predictedProbability

    // Store the evaluation result
    const result = await prisma.aiPredictionResult.create({
      data: {
        aiPredictionId: prediction.id,
        actualOutcome,
        wasCorrect,
        errorMargin,
        evaluatedAt: new Date(),
      },
    })

    return result
  }

  /**
   * Determine actual outcome based on match result and market type
   */
  private static getActualOutcome(marketType: string, match: any): string {
    const { homeScore, awayScore } = match
    const totalGoals = homeScore + awayScore

    switch (marketType) {
      case '1X2':
        if (homeScore > awayScore) return 'HOME'
        if (awayScore > homeScore) return 'AWAY'
        return 'DRAW'
      
      case 'BTTS':
        return (homeScore > 0 && awayScore > 0) ? 'YES' : 'NO'
      
      case 'OVER_2_5':
        return totalGoals > 2.5 ? 'OVER' : 'UNDER'
      
      case 'CORNERS':
        // Note: This would need actual corner data - using placeholder logic
        return totalGoals > 1.5 ? 'OVER' : 'UNDER'
      
      case 'CARDS':
        // Note: This would need actual card data - using placeholder logic
        return totalGoals > 0.5 ? 'OVER' : 'UNDER'
      
      default:
        throw new Error(`Unknown market type: ${marketType}`)
    }
  }

  /**
   * Determine if prediction was correct
   */
  private static determineCorrectness(predictedValue: string, actualOutcome: string): boolean {
    return predictedValue.toUpperCase() === actualOutcome.toUpperCase()
  }

  /**
   * Update market calibration based on prediction result
   */
  private static async updateMarketCalibration(marketType: string, wasCorrect: boolean) {
    const calibration = await prisma.aiMarketCalibration.upsert({
      where: { marketType },
      update: {
        totalPredictions: { increment: 1 },
        correctPredictions: wasCorrect ? { increment: 1 } : undefined,
        lastUpdated: new Date(),
      },
      create: {
        marketType,
        totalPredictions: 1,
        correctPredictions: wasCorrect ? 1 : 0,
        calibrationFactor: 1.0,
      },
    })

    // Recalculate calibration factor if we have enough data
    if (calibration.totalPredictions >= 50) {
      const accuracyRate = calibration.correctPredictions / calibration.totalPredictions
      const newCalibrationFactor = 0.5 + (accuracyRate / 2)
      
      // Apply caps to prevent overfitting
      const cappedFactor = Math.max(0.85, Math.min(1.15, newCalibrationFactor))

      await prisma.aiMarketCalibration.update({
        where: { marketType },
        data: {
          calibrationFactor: cappedFactor,
        },
      })
    }
  }

  /**
   * Run the settlement worker (can be called by cron job)
   */
  static async run() {
    await this.processFinishedMatches()
  }
}

// Export for use in API routes or cron jobs
export default AiSettlementWorker

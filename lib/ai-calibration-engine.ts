import { prisma } from '@/lib/prisma'

export class AiCalibrationEngine {
  /**
   * Get calibrated prediction with reliability information
   */
  static async getCalibratedPrediction(
    marketType: string,
    rawProbability: number,
    predictedValue: string,
    matchId: string
  ) {
    // Get calibration data
    const calibration = await this.getMarketCalibration(marketType)
    
    // Apply calibration if we have enough data
    let adjustedProbability = rawProbability
    let calibrationFactor = 1.0
    
    if (calibration && calibration.totalPredictions >= 50) {
      calibrationFactor = Math.max(0.85, Math.min(1.15, calibration.calibrationFactor))
      adjustedProbability = rawProbability * calibrationFactor
      adjustedProbability = Math.max(0.01, Math.min(0.99, adjustedProbability))
    }

    // Calculate reliability
    const reliability = calibration && calibration.totalPredictions >= 50
      ? Math.round((calibration.correctPredictions / calibration.totalPredictions) * 100)
      : 0

    // Store the prediction for later evaluation
    await this.storePrediction({
      matchId,
      marketType,
      predictedProbability: rawProbability,
      predictedValue,
      confidenceLevel: adjustedProbability,
    })

    return {
      originalProbability: rawProbability,
      adjustedProbability,
      calibrationFactor,
      reliability,
      marketType,
      sampleSize: calibration?.totalPredictions || 0,
    }
  }

  /**
   * Get market calibration data
   */
  private static async getMarketCalibration(marketType: string) {
    return await prisma.aiMarketCalibration.findUnique({
      where: { marketType },
    })
  }

  /**
   * Store prediction for evaluation
   */
  private static async storePrediction(data: {
    matchId: string
    marketType: string
    predictedProbability: number
    predictedValue: string
    confidenceLevel: number
  }) {
    try {
      await prisma.aiPrediction.create({
        data: {
          matchId: data.matchId,
          marketType: data.marketType,
          predictedProbability: data.predictedProbability,
          predictedValue: data.predictedValue,
          confidenceLevel: data.confidenceLevel,
        },
      })
    } catch (error) {
      console.error('Failed to store AI prediction:', error)
      // Don't throw error to avoid breaking main flow
    }
  }

  /**
   * Get all market calibrations for admin dashboard
   */
  static async getAllMarketCalibrations() {
    const calibrations = await prisma.aiMarketCalibration.findMany({
      orderBy: {
        totalPredictions: 'desc',
      },
    })

    return calibrations.map(cal => ({
      marketType: cal.marketType,
      totalPredictions: cal.totalPredictions,
      correctPredictions: cal.correctPredictions,
      accuracyRate: cal.totalPredictions > 0 
        ? Math.round((cal.correctPredictions / cal.totalPredictions) * 100) 
        : 0,
      calibrationFactor: cal.calibrationFactor,
      reliability: cal.totalPredictions >= 50 
        ? Math.round((cal.correctPredictions / cal.totalPredictions) * 100)
        : 0,
      lastUpdated: cal.lastUpdated,
      isCalibrated: cal.totalPredictions >= 50,
    }))
  }

  /**
   * Get market difficulty ranking
   */
  static async getMarketDifficultyRanking() {
    const calibrations = await prisma.aiMarketCalibration.findMany({
      where: {
        totalPredictions: { gte: 20 }, // Minimum samples for ranking
      },
      orderBy: {
        correctPredictions: 'asc', // Hardest markets first
      },
    })

    return calibrations.map((cal, index) => ({
      rank: index + 1,
      marketType: cal.marketType,
      accuracyRate: cal.totalPredictions > 0 
        ? Math.round((cal.correctPredictions / cal.totalPredictions) * 100) 
        : 0,
      totalPredictions: cal.totalPredictions,
      difficulty: this.getDifficultyLabel(cal.totalPredictions > 0 
        ? cal.correctPredictions / cal.totalPredictions 
        : 0),
    }))
  }

  /**
   * Get difficulty label based on accuracy
   */
  private static getDifficultyLabel(accuracyRate: number): 'Easy' | 'Medium' | 'Hard' | 'Very Hard' {
    if (accuracyRate >= 0.7) return 'Easy'
    if (accuracyRate >= 0.55) return 'Medium'
    if (accuracyRate >= 0.45) return 'Hard'
    return 'Very Hard'
  }

  /**
   * Reset calibration for a market (admin function)
   */
  static async resetMarketCalibration(marketType: string) {
    await prisma.aiMarketCalibration.update({
      where: { marketType },
      data: {
        totalPredictions: 0,
        correctPredictions: 0,
        calibrationFactor: 1.0,
        lastUpdated: new Date(),
      },
    })
  }
}

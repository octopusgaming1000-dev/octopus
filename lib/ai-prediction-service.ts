import { prisma } from '@/lib/prisma'

export interface AiPredictionData {
  matchId: string
  marketType: '1X2' | 'BTTS' | 'OVER_2_5' | 'CORNERS' | 'CARDS'
  predictedProbability: number
  predictedValue: string
  confidenceLevel?: number
}

export interface CalibrationResult {
  adjustedProbability: number
  calibrationFactor: number
  reliability: number
  sampleSize: number
  isCalibrated: boolean
}

export interface MarketPerformance {
  marketType: string
  totalPredictions: number
  correctPredictions: number
  accuracyRate: number
  calibrationFactor: number
  reliability: number
  isCalibrated: boolean
}

export class AiPredictionService {
  private static readonly MIN_PREDICTIONS_FOR_CALIBRATION = 50
  private static readonly MIN_CALIBRATION_FACTOR = 0.85
  private static readonly MAX_CALIBRATION_FACTOR = 1.15
  private static readonly MIN_PROBABILITY = 0.01
  private static readonly MAX_PROBABILITY = 0.99

  /**
   * Store AI prediction for later evaluation
   */
  static async storePrediction(data: AiPredictionData) {
    // Input validation
    if (!data.matchId || !data.marketType || !data.predictedValue) {
      throw new Error('Missing required fields: matchId, marketType, predictedValue')
    }

    if (data.predictedProbability < 0 || data.predictedProbability > 1) {
      throw new Error('predictedProbability must be between 0 and 1')
    }

    if (data.confidenceLevel !== undefined && (data.confidenceLevel < 0 || data.confidenceLevel > 1)) {
      throw new Error('confidenceLevel must be between 0 and 1')
    }

    try {
      const prediction = await prisma.prediction.create({
        data: {
          matchId: data.matchId,
          marketType: data.marketType,
          predictedProbability: data.predictedProbability,
          predictedValue: data.predictedValue.toUpperCase(),
          confidenceLevel: data.confidenceLevel || 0.5,
        },
      })
      
      return prediction
    } catch (error) {
      console.error('Failed to store AI prediction:', error)
      throw new Error(`Failed to store prediction: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get all predictions for a match that haven't been evaluated
   */
  static async getUnevaluatedPredictions(matchId: string) {
    if (!matchId) {
      throw new Error('matchId is required')
    }

    try {
      return await prisma.prediction.findMany({
        where: {
          matchId,
          results: {
            none: {},
          },
        },
        include: {
          match: {
            select: {
              id: true,
              homeTeam: true,
              awayTeam: true,
              kickoffTime: true,
              status: true,
              homeScore: true,
              awayScore: true,
            },
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
      })
    } catch (error) {
      console.error('Failed to get unevaluated predictions:', error)
      throw new Error(`Failed to get predictions: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get calibration data for a market type
   */
  static async getCalibrationData(marketType: string) {
    if (!marketType) {
      throw new Error('marketType is required')
    }

    try {
      return await prisma.aiMarketCalibration.findUnique({
        where: { marketType },
      })
    } catch (error) {
      console.error('Failed to get calibration data:', error)
      
      // If table doesn't exist, return null
      if (error instanceof Error && error.message.includes('no such table')) {
        console.warn('aiMarketCalibration table does not exist yet')
        return null
      }
      
      // For other errors, return null to prevent crashes
      return null
    }
  }

  /**
   * Get calibration factor for a market type
   */
  static async getCalibrationFactor(marketType: string): Promise<number> {
    const calibration = await this.getCalibrationData(marketType)

    // No calibration for insufficient data or no calibration record
    if (!calibration || calibration.totalPredictions < this.MIN_PREDICTIONS_FOR_CALIBRATION) {
      return 1.0
    }

    // Apply caps to prevent overfitting
    return Math.max(
      this.MIN_CALIBRATION_FACTOR, 
      Math.min(this.MAX_CALIBRATION_FACTOR, calibration.calibrationFactor)
    )
  }

  /**
   * Apply calibration to raw probability
   */
  static async applyCalibration(
    marketType: string, 
    rawProbability: number
  ): Promise<CalibrationResult> {
    // Input validation
    if (!marketType) {
      throw new Error('marketType is required')
    }

    if (rawProbability < 0 || rawProbability > 1) {
      throw new Error('rawProbability must be between 0 and 1')
    }

    const calibration = await this.getCalibrationData(marketType)
    
    // Default values for insufficient data
    let calibrationFactor = 1.0
    let reliability = 0
    let sampleSize = 0
    let isCalibrated = false
    
    if (calibration && calibration.totalPredictions >= this.MIN_PREDICTIONS_FOR_CALIBRATION) {
      calibrationFactor = Math.max(
        this.MIN_CALIBRATION_FACTOR, 
        Math.min(this.MAX_CALIBRATION_FACTOR, calibration.calibrationFactor)
      )
      reliability = Math.round((calibration.correctPredictions / calibration.totalPredictions) * 100)
      sampleSize = calibration.totalPredictions
      isCalibrated = true
    }
    
    const adjustedProbability = rawProbability * calibrationFactor
    
    // Ensure probability stays within valid range
    const finalProbability = Math.max(
      this.MIN_PROBABILITY, 
      Math.min(this.MAX_PROBABILITY, adjustedProbability)
    )

    return {
      adjustedProbability: finalProbability,
      calibrationFactor,
      reliability,
      sampleSize,
      isCalibrated,
    }
  }

  /**
   * Get market performance statistics
   */
  static async getMarketPerformance(): Promise<MarketPerformance[]> {
    try {
      const markets = await prisma.aiMarketCalibration.findMany({
        orderBy: {
          totalPredictions: 'desc',
        },
      })

      // Return empty array if no calibration data exists
      if (!markets || markets.length === 0) {
        return []
      }

      return markets.map(market => {
        const accuracyRate = market.totalPredictions > 0 
          ? Math.round((market.correctPredictions / market.totalPredictions) * 100 * 100) / 100
          : 0
        
        const reliability = market.totalPredictions >= this.MIN_PREDICTIONS_FOR_CALIBRATION 
          ? Math.round((market.correctPredictions / market.totalPredictions) * 100)
          : 0

        return {
          marketType: market.marketType,
          totalPredictions: market.totalPredictions,
          correctPredictions: market.correctPredictions,
          accuracyRate,
          calibrationFactor: market.calibrationFactor,
          reliability,
          isCalibrated: market.totalPredictions >= this.MIN_PREDICTIONS_FOR_CALIBRATION,
        }
      })
    } catch (error) {
      console.error('Failed to get market performance:', error)
      
      // If table doesn't exist or other database error, return empty array
      if (error instanceof Error && error.message.includes('no such table')) {
        console.warn('aiMarketCalibration table does not exist yet')
        return []
      }
      
      // For other errors, still return empty array to prevent UI crashes
      console.warn('Returning empty market performance data due to error')
      return []
    }
  }

  /**
   * Get reliability percentage for a market
   */
  static async getReliability(marketType: string): Promise<number> {
    if (!marketType) {
      throw new Error('marketType is required')
    }

    const calibration = await this.getCalibrationData(marketType)
    
    if (!calibration || calibration.totalPredictions < this.MIN_PREDICTIONS_FOR_CALIBRATION) {
      return 0
    }
    
    return Math.round((calibration.correctPredictions / calibration.totalPredictions) * 100)
  }

  /**
   * Check if market is calibrated (has sufficient data)
   */
  static async isMarketCalibrated(marketType: string): Promise<boolean> {
    if (!marketType) {
      throw new Error('marketType is required')
    }

    const calibration = await this.getCalibrationData(marketType)
    return calibration ? calibration.totalPredictions >= this.MIN_PREDICTIONS_FOR_CALIBRATION : false
  }

  /**
   * Get all supported market types
   */
  static getSupportedMarketTypes(): readonly string[] {
    return ['1X2', 'BTTS', 'OVER_2_5', 'CORNERS', 'CARDS'] as const
  }

  /**
   * Validate market type
   */
  static isValidMarketType(marketType: string): marketType is AiPredictionData['marketType'] {
    return this.getSupportedMarketTypes().includes(marketType)
  }

  /**
   * Get market display name
   */
  static getMarketDisplayName(marketType: string): string {
    const displayNames: Record<string, string> = {
      '1X2': 'Match Result',
      'BTTS': 'Both Teams to Score',
      'OVER_2_5': 'Over 2.5 Goals',
      'CORNERS': 'Total Corners',
      'CARDS': 'Total Cards',
    }
    return displayNames[marketType] || marketType
  }
}

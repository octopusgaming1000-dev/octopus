import { AiCalibrationEngine } from './ai-calibration-engine'

export interface PredictionWithCalibration {
  marketType: string
  prediction: string
  probability: number
  confidence: number
  calibratedProbability: number
  reliability: number
  calibrationFactor: number
  sampleSize: number
}

export class AiPredictionHelper {
  /**
   * Process AI predictions with calibration for a match
   */
  static async processPredictionsWithCalibration(
    matchId: string,
    rawPredictions: Array<{
      marketType: string
      prediction: string
      probability: number
      confidence: number
    }>
  ): Promise<PredictionWithCalibration[]> {
    const calibratedPredictions: PredictionWithCalibration[] = []

    for (const rawPred of rawPredictions) {
      try {
        const calibrated = await AiCalibrationEngine.getCalibratedPrediction(
          rawPred.marketType,
          rawPred.probability,
          rawPred.prediction,
          matchId
        )

        calibratedPredictions.push({
          marketType: rawPred.marketType,
          prediction: rawPred.prediction,
          probability: rawPred.probability,
          confidence: rawPred.confidence,
          calibratedProbability: calibrated.adjustedProbability,
          reliability: calibrated.reliability,
          calibrationFactor: calibrated.calibrationFactor,
          sampleSize: calibrated.sampleSize,
        })
      } catch (error) {
        console.error(`Failed to calibrate prediction for ${rawPred.marketType}:`, error)
        // Fallback to uncalibrated prediction
        calibratedPredictions.push({
          ...rawPred,
          calibratedProbability: rawPred.probability,
          reliability: 0,
          calibrationFactor: 1.0,
          sampleSize: 0,
        })
      }
    }

    return calibratedPredictions
  }

  /**
   * Format prediction for display with reliability information
   */
  static formatPredictionForDisplay(prediction: PredictionWithCalibration) {
    const reliabilityText = prediction.sampleSize >= 50 
      ? `AI Reliability: ${prediction.reliability}%`
      : `AI Learning: ${prediction.sampleSize} samples`

    return {
      market: prediction.marketType,
      prediction: prediction.prediction,
      originalProbability: `${Math.round(prediction.probability * 100)}%`,
      calibratedProbability: `${Math.round(prediction.calibratedProbability * 100)}%`,
      confidence: Math.round(prediction.confidence * 100),
      reliability: reliabilityText,
      isCalibrated: prediction.sampleSize >= 50,
      adjustment: prediction.calibrationFactor !== 1.0 
        ? `${prediction.calibrationFactor > 1 ? '+' : ''}${Math.round((prediction.calibrationFactor - 1) * 100)}%`
        : null,
    }
  }

  /**
   * Get market type display name
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

  /**
   * Get prediction display value
   */
  static getPredictionDisplayValue(marketType: string, prediction: string): string {
    const displayValues: Record<string, Record<string, string>> = {
      '1X2': {
        'HOME': 'Home Win',
        'AWAY': 'Away Win',
        'DRAW': 'Draw',
      },
      'BTTS': {
        'YES': 'Yes',
        'NO': 'No',
      },
      'OVER_2_5': {
        'OVER': 'Over 2.5',
        'UNDER': 'Under 2.5',
      },
      'CORNERS': {
        'OVER': 'Over Corners',
        'UNDER': 'Under Corners',
      },
      'CARDS': {
        'OVER': 'Over Cards',
        'UNDER': 'Under Cards',
      },
    }

    return displayValues[marketType]?.[prediction] || prediction
  }
}

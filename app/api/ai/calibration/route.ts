import { NextRequest, NextResponse } from 'next/server'
import { AiCalibrationEngine } from '@/lib/ai-calibration-engine'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const marketType = searchParams.get('marketType')

    if (marketType) {
      // Get specific market calibration
      const calibrations = await AiCalibrationEngine.getAllMarketCalibrations()
      const market = calibrations.find(c => c.marketType === marketType)
      
      if (!market) {
        return NextResponse.json(
          { error: 'Market not found' },
          { status: 404 }
        )
      }

      return NextResponse.json({
        marketType: market.marketType,
        reliability: market.reliability,
        sampleSize: market.totalPredictions,
        accuracyRate: market.accuracyRate,
        isCalibrated: market.isCalibrated,
        calibrationFactor: market.calibrationFactor,
      })
    } else {
      // Get all market calibrations
      const calibrations = await AiCalibrationEngine.getAllMarketCalibrations()
      const difficultyRanking = await AiCalibrationEngine.getMarketDifficultyRanking()

      return NextResponse.json({
        calibrations,
        difficultyRanking,
        summary: {
          totalMarkets: calibrations.length,
          calibratedMarkets: calibrations.filter(c => c.isCalibrated).length,
          averageReliability: calibrations.length > 0
            ? Math.round(calibrations.reduce((sum, c) => sum + c.reliability, 0) / calibrations.length)
            : 0,
        },
      })
    }
  } catch (error) {
    console.error('❌ Calibration API error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

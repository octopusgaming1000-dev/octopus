/**
 * Match Feature Engine Interface
 * 
 * Provides the architecture for calculating match features from normalized data.
 * This is the boundary between data and the probability engine.
 * 
 * IMPORTANT: This creates the interface/contract only.
 * The actual feature calculation logic will be implemented when real data is available.
 */

import { prisma } from './prisma'

export interface MatchFeatures {
  matchId: string
  homeForm?: number
  awayForm?: number
  homeAttackStrength?: number
  awayAttackStrength?: number
  homeDefenseStrength?: number
  awayDefenseStrength?: number
  homeXgAverage?: number
  awayXgAverage?: number
  homeXgaAverage?: number
  awayXgaAverage?: number
  homeAdvantage?: number
  h2hSignal?: number
  injuryImpactHome?: number
  injuryImpactAway?: number
  refereeSignal?: number
  weatherSignal?: number
  dataQualityScore: number
  calculatedAt: Date
}

export interface FeatureInput {
  matchId: string
  // Team statistics (will be populated from TeamMatchStats, TeamSeasonStats)
  homeTeamStats?: any
  awayTeamStats?: any
  // xG data (will be populated from XgTeamMatch)
  homeXgData?: any
  awayXgData?: any
  // Head-to-head data
  h2hData?: any
  // Injury data (will be populated from MatchInjury)
  injuryData?: any
  // Referee data (will be populated from Referee model)
  refereeData?: any
  // Weather data (will be populated from MatchWeather)
  weatherData?: any
  // Data quality indicators
  dataAvailability: {
    teamStats: boolean
    xgData: boolean
    h2hData: boolean
    injuryData: boolean
    refereeData: boolean
    weatherData: boolean
  }
}

export class FeatureEngine {
  /**
   * Calculate features for a match
   * 
   * This is the main entry point for feature calculation.
   * When real data is available, this will:
   * 1. Fetch all relevant data from the database
   * 2. Calculate statistical features
   * 3. Compute data quality score
   * 4. Store the features in the database
   */
  static async calculateFeatures(matchId: string): Promise<MatchFeatures | null> {
    try {
      // Check if features already exist and are recent (within 24 hours)
      const existing = await prisma.matchFeature.findUnique({
        where: { matchId }
      })

      if (existing) {
        const age = Date.now() - existing.calculatedAt.getTime()
        if (age < 24 * 60 * 60 * 1000) {
          // Return existing features if less than 24 hours old
          return {
            matchId: existing.matchId,
            homeForm: existing.homeForm || undefined,
            awayForm: existing.awayForm || undefined,
            homeAttackStrength: existing.homeAttackStrength || undefined,
            awayAttackStrength: existing.awayAttackStrength || undefined,
            homeDefenseStrength: existing.homeDefenseStrength || undefined,
            awayDefenseStrength: existing.awayDefenseStrength || undefined,
            homeXgAverage: existing.homeXgAverage || undefined,
            awayXgAverage: existing.awayXgAverage || undefined,
            homeXgaAverage: existing.homeXgaAverage || undefined,
            awayXgaAverage: existing.awayXgaAverage || undefined,
            homeAdvantage: existing.homeAdvantage || undefined,
            h2hSignal: existing.h2hSignal || undefined,
            injuryImpactHome: existing.injuryImpactHome || undefined,
            injuryImpactAway: existing.injuryImpactAway || undefined,
            refereeSignal: existing.refereeSignal || undefined,
            weatherSignal: existing.weatherSignal || undefined,
            dataQualityScore: existing.dataQualityScore,
            calculatedAt: existing.calculatedAt
          }
        }
      }

      // Fetch input data
      const input = await this.fetchFeatureInput(matchId)

      // Calculate features (placeholder - will be implemented with real data)
      const features = this.computeFeatures(input)

      // Store features
      await this.storeFeatures(features)

      return features
    } catch (error) {
      console.error('Failed to calculate features:', error)
      return null
    }
  }

  /**
   * Fetch all input data needed for feature calculation
   */
  private static async fetchFeatureInput(matchId: string): Promise<FeatureInput> {
    // Placeholder - will fetch real data when available
    return {
      matchId,
      dataAvailability: {
        teamStats: false,
        xgData: false,
        h2hData: false,
        injuryData: false,
        refereeData: false,
        weatherData: false
      }
    }
  }

  /**
   * Compute features from input data
   * 
   * IMPORTANT: This is a placeholder implementation.
   * Real feature calculation will be implemented when:
   * - Team statistics are available from TeamMatchStats/TeamSeasonStats
   * - xG data is available from XgTeamMatch
   * - H2H data is computed from historical matches
   * - Injury data is available from MatchInjury
   * - Referee statistics are available
   * - Weather data is available from MatchWeather
   */
  private static computeFeatures(input: FeatureInput): MatchFeatures {
    // Calculate data quality score based on data availability
    const availableCount = Object.values(input.dataAvailability).filter(Boolean).length
    const totalCount = Object.keys(input.dataAvailability).length
    const dataQualityScore = availableCount / totalCount

    return {
      matchId: input.matchId,
      dataQualityScore,
      calculatedAt: new Date()
      // Other features will be calculated when real data is available
    }
  }

  /**
   * Store features in database
   */
  private static async storeFeatures(features: MatchFeatures): Promise<void> {
    try {
      await prisma.matchFeature.upsert({
        where: { matchId: features.matchId },
        update: {
          homeForm: features.homeForm,
          awayForm: features.awayForm,
          homeAttackStrength: features.homeAttackStrength,
          awayAttackStrength: features.awayAttackStrength,
          homeDefenseStrength: features.homeDefenseStrength,
          awayDefenseStrength: features.awayDefenseStrength,
          homeXgAverage: features.homeXgAverage,
          awayXgAverage: features.awayXgAverage,
          homeXgaAverage: features.homeXgaAverage,
          awayXgaAverage: features.awayXgaAverage,
          homeAdvantage: features.homeAdvantage,
          h2hSignal: features.h2hSignal,
          injuryImpactHome: features.injuryImpactHome,
          injuryImpactAway: features.injuryImpactAway,
          refereeSignal: features.refereeSignal,
          weatherSignal: features.weatherSignal,
          dataQualityScore: features.dataQualityScore,
          calculatedAt: features.calculatedAt
        },
        create: {
          matchId: features.matchId,
          homeForm: features.homeForm,
          awayForm: features.awayForm,
          homeAttackStrength: features.homeAttackStrength,
          awayAttackStrength: features.awayAttackStrength,
          homeDefenseStrength: features.homeDefenseStrength,
          awayDefenseStrength: features.awayDefenseStrength,
          homeXgAverage: features.homeXgAverage,
          awayXgAverage: features.awayXgAverage,
          homeXgaAverage: features.homeXgaAverage,
          awayXgaAverage: features.awayXgaAverage,
          homeAdvantage: features.homeAdvantage,
          h2hSignal: features.h2hSignal,
          injuryImpactHome: features.injuryImpactHome,
          injuryImpactAway: features.injuryImpactAway,
          refereeSignal: features.refereeSignal,
          weatherSignal: features.weatherSignal,
          dataQualityScore: features.dataQualityScore,
          calculatedAt: features.calculatedAt
        }
      })
    } catch (error) {
      console.error('Failed to store features:', error)
      throw error
    }
  }

  /**
   * Get features for a match
   */
  static async getFeatures(matchId: string): Promise<MatchFeatures | null> {
    try {
      const features = await prisma.matchFeature.findUnique({
        where: { matchId }
      })

      if (!features) {
        return null
      }

      return {
        matchId: features.matchId,
        homeForm: features.homeForm || undefined,
        awayForm: features.awayForm || undefined,
        homeAttackStrength: features.homeAttackStrength || undefined,
        awayAttackStrength: features.awayAttackStrength || undefined,
        homeDefenseStrength: features.homeDefenseStrength || undefined,
        awayDefenseStrength: features.awayDefenseStrength || undefined,
        homeXgAverage: features.homeXgAverage || undefined,
        awayXgAverage: features.awayXgAverage || undefined,
        homeXgaAverage: features.homeXgaAverage || undefined,
        awayXgaAverage: features.awayXgaAverage || undefined,
        homeAdvantage: features.homeAdvantage || undefined,
        h2hSignal: features.h2hSignal || undefined,
        injuryImpactHome: features.injuryImpactHome || undefined,
        injuryImpactAway: features.injuryImpactAway || undefined,
        refereeSignal: features.refereeSignal || undefined,
        weatherSignal: features.weatherSignal || undefined,
        dataQualityScore: features.dataQualityScore,
        calculatedAt: features.calculatedAt
      }
    } catch (error) {
      console.error('Failed to get features:', error)
      return null
    }
  }

  /**
   * Batch calculate features for multiple matches
   */
  static async batchCalculateFeatures(matchIds: string[]): Promise<{
    successful: number
    failed: number
    errors: string[]
  }> {
    let successful = 0
    let failed = 0
    const errors: string[] = []

    for (const matchId of matchIds) {
      try {
        const features = await this.calculateFeatures(matchId)
        if (features) {
          successful++
        } else {
          failed++
          errors.push(`Failed to calculate features for match ${matchId}`)
        }
      } catch (error) {
        failed++
        errors.push(`Error calculating features for match ${matchId}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    return { successful, failed, errors }
  }

  /**
   * Invalidate features for a match (force recalculation on next request)
   */
  static async invalidateFeatures(matchId: string): Promise<void> {
    try {
      await prisma.matchFeature.delete({
        where: { matchId }
      })
    } catch (error) {
      // Ignore if not found
      if ((error as any).code !== 'P2025') {
        console.error('Failed to invalidate features:', error)
      }
    }
  }

  /**
   * Get feature statistics
   */
  static async getStatistics(): Promise<{
    totalFeatures: number
    averageDataQualityScore: number
    featuresWithHighQuality: number
    featuresWithLowQuality: number
  }> {
    try {
      const features = await prisma.matchFeature.findMany()

      const totalFeatures = features.length
      const averageDataQualityScore = totalFeatures > 0
        ? features.reduce((sum, f) => sum + f.dataQualityScore, 0) / totalFeatures
        : 0
      const featuresWithHighQuality = features.filter(f => f.dataQualityScore >= 0.7).length
      const featuresWithLowQuality = features.filter(f => f.dataQualityScore < 0.5).length

      return {
        totalFeatures,
        averageDataQualityScore,
        featuresWithHighQuality,
        featuresWithLowQuality
      }
    } catch (error) {
      console.error('Failed to get feature statistics:', error)
      return {
        totalFeatures: 0,
        averageDataQualityScore: 0,
        featuresWithHighQuality: 0,
        featuresWithLowQuality: 0
      }
    }
  }
}

export default FeatureEngine

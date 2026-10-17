/**
 * Probability Engine Interface
 * 
 * Provides the architecture for calculating market probabilities from features.
 * This is the boundary between the feature engine and AI reasoning.
 * 
 * IMPORTANT: This creates the interface/contract only.
 * The actual probability calculation logic will be implemented when real data is available.
 * 
 * The probability engine should NOT ask the LLM to invent probabilities.
 * It should use mathematical/statistical models to produce probability outputs.
 */

import { prisma } from './prisma'
import { FeatureEngine, MatchFeatures } from './feature-engine'

export type MarketType = '1X2' | 'OVER_UNDER_2_5' | 'BTTS' | 'CORNERS' | 'CARDS'

export interface MarketProbabilities {
  matchId: string
  marketType: MarketType
  homeProbability?: number
  drawProbability?: number
  awayProbability?: number
  overProbability?: number
  underProbability?: number
  yesProbability?: number
  noProbability?: number
  calculatedAt: Date
  version: string
}

export interface ProbabilityInput {
  matchId: string
  features: MatchFeatures
  marketType: MarketType
  // Additional context that may influence probabilities
  historicalData?: any
  marketContext?: any
}

export class ProbabilityEngine {
  private static readonly CURRENT_VERSION = 'v1'

  /**
   * Calculate probabilities for a specific market
   * 
   * This is the main entry point for probability calculation.
   * When real data is available, this will:
   * 1. Fetch or calculate features for the match
   * 2. Apply mathematical/statistical models
   * 3. Calculate market-specific probabilities
   * 4. Store the probabilities in the database
   */
  static async calculateProbabilities(
    matchId: string,
    marketType: MarketType
  ): Promise<MarketProbabilities | null> {
    try {
      // Check if probabilities already exist and are recent (within 24 hours)
      const existing = await prisma.marketProbability.findUnique({
        where: {
          matchId_marketType: {
            matchId,
            marketType
          }
        }
      })

      if (existing) {
        const age = Date.now() - existing.calculatedAt.getTime()
        if (age < 24 * 60 * 60 * 1000) {
          // Return existing probabilities if less than 24 hours old
          return this.formatProbabilities(existing)
        }
      }

      // Get features for the match
      const features = await FeatureEngine.getFeatures(matchId)
      if (!features) {
        console.warn(`No features available for match ${matchId}`)
        return null
      }

      // Prepare input
      const input: ProbabilityInput = {
        matchId,
        features,
        marketType
      }

      // Calculate probabilities (placeholder - will be implemented with real data)
      const probabilities = this.computeProbabilities(input)

      // Store probabilities
      await this.storeProbabilities(probabilities)

      return probabilities
    } catch (error) {
      console.error('Failed to calculate probabilities:', error)
      return null
    }
  }

  /**
   * Compute probabilities from features
   * 
   * IMPORTANT: This is a placeholder implementation.
   * Real probability calculation will be implemented when:
   * - Features are calculated from real data
   * - Mathematical/statistical models are developed
   * - Historical data is available for calibration
   * 
   * The probability engine should use:
   * - Poisson distribution for goals
   * - Logistic regression for binary outcomes
   * - Monte Carlo simulation for complex markets
   * - Machine learning models when sufficient training data exists
   */
  private static computeProbabilities(input: ProbabilityInput): MarketProbabilities {
    // Placeholder - will implement real probability models when data is available
    // For now, return null probabilities to indicate not yet calculated
    
    return {
      matchId: input.matchId,
      marketType: input.marketType,
      calculatedAt: new Date(),
      version: this.CURRENT_VERSION
    }
  }

  /**
   * Store probabilities in database
   */
  private static async storeProbabilities(probabilities: MarketProbabilities): Promise<void> {
    try {
      await prisma.marketProbability.upsert({
        where: {
          matchId_marketType: {
            matchId: probabilities.matchId,
            marketType: probabilities.marketType
          }
        },
        update: {
          homeProbability: probabilities.homeProbability,
          drawProbability: probabilities.drawProbability,
          awayProbability: probabilities.awayProbability,
          overProbability: probabilities.overProbability,
          underProbability: probabilities.underProbability,
          yesProbability: probabilities.yesProbability,
          noProbability: probabilities.noProbability,
          calculatedAt: probabilities.calculatedAt,
          version: probabilities.version
        },
        create: {
          matchId: probabilities.matchId,
          marketType: probabilities.marketType,
          homeProbability: probabilities.homeProbability,
          drawProbability: probabilities.drawProbability,
          awayProbability: probabilities.awayProbability,
          overProbability: probabilities.overProbability,
          underProbability: probabilities.underProbability,
          yesProbability: probabilities.yesProbability,
          noProbability: probabilities.noProbability,
          calculatedAt: probabilities.calculatedAt,
          version: probabilities.version
        }
      })
    } catch (error) {
      console.error('Failed to store probabilities:', error)
      throw error
    }
  }

  /**
   * Format database record to MarketProbabilities interface
   */
  private static formatProbabilities(record: any): MarketProbabilities {
    return {
      matchId: record.matchId,
      marketType: record.marketType as MarketType,
      homeProbability: record.homeProbability || undefined,
      drawProbability: record.drawProbability || undefined,
      awayProbability: record.awayProbability || undefined,
      overProbability: record.overProbability || undefined,
      underProbability: record.underProbability || undefined,
      yesProbability: record.yesProbability || undefined,
      noProbability: record.noProbability || undefined,
      calculatedAt: record.calculatedAt,
      version: record.version
    }
  }

  /**
   * Get probabilities for a match and market
   */
  static async getProbabilities(
    matchId: string,
    marketType: MarketType
  ): Promise<MarketProbabilities | null> {
    try {
      const probabilities = await prisma.marketProbability.findUnique({
        where: {
          matchId_marketType: {
            matchId,
            marketType
          }
        }
      })

      if (!probabilities) {
        return null
      }

      return this.formatProbabilities(probabilities)
    } catch (error) {
      console.error('Failed to get probabilities:', error)
      return null
    }
  }

  /**
   * Get all probabilities for a match
   */
  static async getAllProbabilitiesForMatch(matchId: string): Promise<MarketProbabilities[]> {
    try {
      const records = await prisma.marketProbability.findMany({
        where: { matchId }
      })

      return records.map(r => this.formatProbabilities(r))
    } catch (error) {
      console.error('Failed to get all probabilities for match:', error)
      return []
    }
  }

  /**
   * Batch calculate probabilities for multiple matches
   */
  static async batchCalculateProbabilities(
    matchIds: string[],
    marketTypes: MarketType[]
  ): Promise<{
    successful: number
    failed: number
    errors: string[]
  }> {
    let successful = 0
    let failed = 0
    const errors: string[] = []

    for (const matchId of matchIds) {
      for (const marketType of marketTypes) {
        try {
          const probabilities = await this.calculateProbabilities(matchId, marketType)
          if (probabilities) {
            successful++
          } else {
            failed++
            errors.push(`Failed to calculate probabilities for match ${matchId}, market ${marketType}`)
          }
        } catch (error) {
          failed++
          errors.push(`Error calculating probabilities for match ${matchId}, market ${marketType}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }
    }

    return { successful, failed, errors }
  }

  /**
   * Invalidate probabilities for a match (force recalculation on next request)
   */
  static async invalidateProbabilities(matchId: string, marketType?: MarketType): Promise<void> {
    try {
      if (marketType) {
        await prisma.marketProbability.delete({
          where: {
            matchId_marketType: {
              matchId,
              marketType
            }
          }
        })
      } else {
        await prisma.marketProbability.deleteMany({
          where: { matchId }
        })
      }
    } catch (error) {
      // Ignore if not found
      if ((error as any).code !== 'P2025') {
        console.error('Failed to invalidate probabilities:', error)
      }
    }
  }

  /**
   * Get supported market types
   */
  static getSupportedMarketTypes(): MarketType[] {
    return ['1X2', 'OVER_UNDER_2_5', 'BTTS', 'CORNERS', 'CARDS']
  }

  /**
   * Validate market type
   */
  static isValidMarketType(marketType: string): marketType is MarketType {
    return this.getSupportedMarketTypes().includes(marketType as MarketType)
  }

  /**
   * Get probability statistics
   */
  static async getStatistics(): Promise<{
    totalProbabilities: number
    byMarketType: Record<MarketType, number>
    averageAge: number | null
  }> {
    try {
      const probabilities = await prisma.marketProbability.findMany()

      const totalProbabilities = probabilities.length

      const byMarketType: Record<MarketType, number> = {
        '1X2': 0,
        'OVER_UNDER_2_5': 0,
        'BTTS': 0,
        'CORNERS': 0,
        'CARDS': 0
      }

      for (const p of probabilities) {
        const marketType = p.marketType as MarketType
        if (marketType in byMarketType) {
          byMarketType[marketType]++
        }
      }

      const averageAge = totalProbabilities > 0
        ? probabilities.reduce((sum, p) => {
            const age = Date.now() - p.calculatedAt.getTime()
            return sum + age
          }, 0) / totalProbabilities
        : null

      return {
        totalProbabilities,
        byMarketType,
        averageAge: averageAge ? Math.round(averageAge / 1000 / 60) : null // Convert to minutes
      }
    } catch (error) {
      console.error('Failed to get probability statistics:', error)
      return {
        totalProbabilities: 0,
        byMarketType: {
          '1X2': 0,
          'OVER_UNDER_2_5': 0,
          'BTTS': 0,
          'CORNERS': 0,
          'CARDS': 0
        },
        averageAge: null
      }
    }
  }
}

export default ProbabilityEngine

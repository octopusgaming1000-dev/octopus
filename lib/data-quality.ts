/**
 * Data Quality Service
 * 
 * Assesses the completeness and quality of match data.
 * Provides data quality scores to inform AI confidence and user expectations.
 */

import { prisma } from './prisma'

export interface DataQualityAssessment {
  matchId: string
  overallScore: number // 0.0 to 1.0
  fixtureData: boolean
  teamStatistics: boolean
  xgData: boolean
  lineups: boolean
  injuries: boolean
  weather: boolean
  referee: boolean
  events: boolean
  lastUpdated: Date
  dataFreshness: 'fresh' | 'stale' | 'outdated'
}

export interface QualityThresholds {
  excellent: number // >= 0.8
  good: number // >= 0.6
  fair: number // >= 0.4
  poor: number // < 0.4
}

export class DataQualityService {
  private static readonly THRESHOLDS: QualityThresholds = {
    excellent: 0.8,
    good: 0.6,
    fair: 0.4,
    poor: 0.0
  }

  /**
   * Assess data quality for a match
   */
  static async assessMatchQuality(matchId: string): Promise<DataQualityAssessment> {
    try {
      const match = await prisma.match.findUnique({
        where: { id: matchId },
        include: {
          teamMatchStats: true,
          xgTeamMatches: true,
          lineups: true,
          injuries: true,
          weatherData: true,
          refereeEntity: true,
          events: true
        }
      })

      if (!match) {
        throw new Error(`Match ${matchId} not found`)
      }

      // Check each data component
      const fixtureData = !!match.homeTeam && !!match.awayTeam && !!match.kickoffTime
      const teamStatistics = match.teamMatchStats.length > 0
      const xgData = match.xgTeamMatches.length > 0
      const lineups = match.lineups.length > 0
      const injuries = match.injuries.length > 0
      const weather = !!match.weatherData
      const referee = !!match.refereeEntity
      const events = match.events.length > 0

      // Calculate overall score
      const components = [
        fixtureData,
        teamStatistics,
        xgData,
        lineups,
        injuries,
        weather,
        referee,
        events
      ]

      const availableCount = components.filter(Boolean).length
      const totalCount = components.length
      const overallScore = availableCount / totalCount

      // Determine data freshness based on most recent data update
      const lastDataUpdate = this.getMostRecentDataUpdate(match)
      const dataFreshness = this.determineFreshness(match.kickoffTime, lastDataUpdate)

      return {
        matchId,
        overallScore,
        fixtureData,
        teamStatistics,
        xgData,
        lineups,
        injuries,
        weather,
        referee,
        events,
        lastUpdated: lastDataUpdate,
        dataFreshness
      }
    } catch (error) {
      console.error('Failed to assess match quality:', error)
      // Return minimal assessment on error
      return {
        matchId,
        overallScore: 0,
        fixtureData: false,
        teamStatistics: false,
        xgData: false,
        lineups: false,
        injuries: false,
        weather: false,
        referee: false,
        events: false,
        lastUpdated: new Date(),
        dataFreshness: 'outdated'
      }
    }
  }

  /**
   * Get the most recent data update timestamp from all related data
   */
  private static getMostRecentDataUpdate(match: any): Date {
    const timestamps: Date[] = []

    if (match.teamMatchStats.length > 0) {
      timestamps.push(...match.teamMatchStats.map((s: any) => s.updatedAt))
    }
    if (match.xgTeamMatches.length > 0) {
      timestamps.push(...match.xgTeamMatches.map((x: any) => x.createdAt))
    }
    if (match.lineups.length > 0) {
      timestamps.push(...match.lineups.map((l: any) => l.createdAt))
    }
    if (match.injuries.length > 0) {
      timestamps.push(...match.injuries.map((i: any) => i.createdAt))
    }
    if (match.weatherData) {
      timestamps.push(match.weatherData.fetchedAt)
    }
    if (match.events.length > 0) {
      timestamps.push(...match.events.map((e: any) => e.createdAt))
    }

    // If no data updates, use kickoff time as baseline
    if (timestamps.length === 0) {
      return match.kickoffTime
    }

    return new Date(Math.max(...timestamps.map(t => t.getTime())))
  }

  /**
   * Determine data freshness based on match time and last update
   */
  private static determineFreshness(kickoffTime: Date, lastUpdated: Date): 'fresh' | 'stale' | 'outdated' {
    const now = new Date()
    const isPastMatch = kickoffTime < now

    if (isPastMatch) {
      // For past matches, data should be updated within 24 hours of match end
      const hoursSinceMatch = (now.getTime() - kickoffTime.getTime()) / (1000 * 60 * 60)
      const hoursSinceUpdate = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60)

      if (hoursSinceUpdate < 24) {
        return 'fresh'
      } else if (hoursSinceUpdate < 168) { // 1 week
        return 'stale'
      } else {
        return 'outdated'
      }
    } else {
      // For upcoming matches, data should be updated within 7 days
      const hoursSinceUpdate = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60)

      if (hoursSinceUpdate < 168) { // 7 days
        return 'fresh'
      } else if (hoursSinceUpdate < 336) { // 14 days
        return 'stale'
      } else {
        return 'outdated'
      }
    }
  }

  /**
   * Get quality rating label
   */
  static getQualityLabel(score: number): string {
    if (score >= this.THRESHOLDS.excellent) return 'Excellent'
    if (score >= this.THRESHOLDS.good) return 'Good'
    if (score >= this.THRESHOLDS.fair) return 'Fair'
    return 'Poor'
  }

  /**
   * Get quality color (for UI)
   */
  static getQualityColor(score: number): string {
    if (score >= this.THRESHOLDS.excellent) return 'green'
    if (score >= this.THRESHOLDS.good) return 'blue'
    if (score >= this.THRESHOLDS.fair) return 'yellow'
    return 'red'
  }

  /**
   * Batch assess quality for multiple matches
   */
  static async batchAssessQuality(matchIds: string[]): Promise<{
    assessments: DataQualityAssessment[]
    averageScore: number
    distribution: Record<string, number>
  }> {
    const assessments: DataQualityAssessment[] = []

    for (const matchId of matchIds) {
      const assessment = await this.assessMatchQuality(matchId)
      assessments.push(assessment)
    }

    const averageScore = assessments.length > 0
      ? assessments.reduce((sum, a) => sum + a.overallScore, 0) / assessments.length
      : 0

    const distribution: Record<string, number> = {
      Excellent: 0,
      Good: 0,
      Fair: 0,
      Poor: 0
    }

    for (const assessment of assessments) {
      const label = this.getQualityLabel(assessment.overallScore)
      distribution[label]++
    }

    return {
      assessments,
      averageScore,
      distribution
    }
  }

  /**
   * Get overall data quality statistics
   */
  static async getOverallStatistics(): Promise<{
    totalMatches: number
    averageQualityScore: number
    qualityDistribution: Record<string, number>
    freshnessDistribution: Record<string, number>
    matchesWithExcellentQuality: number
    matchesWithPoorQuality: number
  }> {
    try {
      const matches = await prisma.match.findMany({
        select: { id: true, kickoffTime: true }
      })

      const totalMatches = matches.length

      if (totalMatches === 0) {
        return {
          totalMatches: 0,
          averageQualityScore: 0,
          qualityDistribution: { Excellent: 0, Good: 0, Fair: 0, Poor: 0 },
          freshnessDistribution: { fresh: 0, stale: 0, outdated: 0 },
          matchesWithExcellentQuality: 0,
          matchesWithPoorQuality: 0
        }
      }

      // Sample a subset for performance (max 100 matches)
      const sampleSize = Math.min(totalMatches, 100)
      const sample = matches.slice(0, sampleSize)

      const assessments: DataQualityAssessment[] = []
      for (const match of sample) {
        const assessment = await this.assessMatchQuality(match.id)
        assessments.push(assessment)
      }

      const averageQualityScore = assessments.reduce((sum, a) => sum + a.overallScore, 0) / assessments.length

      const qualityDistribution: Record<string, number> = {
        Excellent: 0,
        Good: 0,
        Fair: 0,
        Poor: 0
      }

      const freshnessDistribution: Record<string, number> = {
        fresh: 0,
        stale: 0,
        outdated: 0
      }

      for (const assessment of assessments) {
        const qualityLabel = this.getQualityLabel(assessment.overallScore)
        qualityDistribution[qualityLabel]++
        freshnessDistribution[assessment.dataFreshness]++
      }

      const matchesWithExcellentQuality = qualityDistribution.Excellent
      const matchesWithPoorQuality = qualityDistribution.Poor

      return {
        totalMatches,
        averageQualityScore,
        qualityDistribution,
        freshnessDistribution,
        matchesWithExcellentQuality,
        matchesWithPoorQuality
      }
    } catch (error) {
      console.error('Failed to get overall statistics:', error)
      return {
        totalMatches: 0,
        averageQualityScore: 0,
        qualityDistribution: { Excellent: 0, Good: 0, Fair: 0, Poor: 0 },
        freshnessDistribution: { fresh: 0, stale: 0, outdated: 0 },
        matchesWithExcellentQuality: 0,
        matchesWithPoorQuality: 0
      }
    }
  }

  /**
   * Identify matches with poor data quality
   */
  static async identifyPoorQualityMatches(threshold: number = 0.4): Promise<string[]> {
    try {
      const matches = await prisma.match.findMany({
        select: { id: true }
      })

      const poorQualityMatches: string[] = []

      for (const match of matches) {
        const assessment = await this.assessMatchQuality(match.id)
        if (assessment.overallScore < threshold) {
          poorQualityMatches.push(match.id)
        }
      }

      return poorQualityMatches
    } catch (error) {
      console.error('Failed to identify poor quality matches:', error)
      return []
    }
  }

  /**
   * Get data quality thresholds
   */
  static getThresholds(): QualityThresholds {
    return { ...this.THRESHOLDS }
  }

  /**
   * Check if data quality is sufficient for AI analysis
   */
  static isSufficientForAI(assessment: DataQualityAssessment, minimumScore: number = 0.5): boolean {
    return assessment.overallScore >= minimumScore
  }

  /**
   * Get recommended actions to improve data quality
   */
  static getRecommendations(assessment: DataQualityAssessment): string[] {
    const recommendations: string[] = []

    if (!assessment.fixtureData) {
      recommendations.push('Ensure basic fixture data (teams, kickoff time) is available')
    }

    if (!assessment.teamStatistics) {
      recommendations.push('Fetch team statistics from provider')
    }

    if (!assessment.xgData) {
      recommendations.push('Fetch xG data from statistics provider')
    }

    if (!assessment.lineups) {
      recommendations.push('Fetch lineups when available')
    }

    if (!assessment.injuries) {
      recommendations.push('Fetch injury reports')
    }

    if (!assessment.weather) {
      recommendations.push('Fetch weather data')
    }

    if (!assessment.referee) {
      recommendations.push('Fetch referee information')
    }

    if (assessment.dataFreshness === 'outdated') {
      recommendations.push('Update stale data from provider')
    }

    return recommendations
  }
}

export default DataQualityService

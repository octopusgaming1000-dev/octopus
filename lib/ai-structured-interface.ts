/**
 * AI Structured Data Interface
 * 
 * Provides a clean interface for passing structured data to the AI reasoning layer.
 * This ensures AI receives normalized, validated data rather than raw provider responses.
 * 
 * IMPORTANT: This creates the interface/contract only.
 * The existing AI analysis system should remain intact.
 * This interface will be used to enhance AI with structured data when available.
 */

import { prisma } from './prisma'
import { FeatureEngine, MatchFeatures } from './feature-engine'
import { ProbabilityEngine, MarketProbabilities } from './probability-engine'
import { DataQualityService, DataQualityAssessment } from './data-quality'

export interface StructuredMatchData {
  matchId: string
  homeTeam: string
  awayTeam: string
  league: string
  kickoffTime: Date
  venue?: string
  status: string
  homeScore?: number
  awayScore?: number
  source: string
}

export interface StructuredStatistics {
  teamStats: {
    home: any | null
    away: any | null
  }
  xgData: {
    home: any | null
    away: any | null
  }
  h2h: any | null
}

export interface StructuredContext {
  injuries: any[]
  weather: any | null
  referee: any | null
  lineups: any[]
}

export interface StructuredIntelligence {
  features: MatchFeatures | null
  probabilities: MarketProbabilities[]
  dataQuality: DataQualityAssessment
  communityIntelligence: any | null
}

export interface AIAnalysisInput {
  match: StructuredMatchData
  statistics: StructuredStatistics
  context: StructuredContext
  intelligence: StructuredIntelligence
  marketType?: string
  selection?: string
}

export class AIStructuredInterface {
  /**
   * Prepare structured data for AI analysis
   * 
   * This is the main entry point for preparing data for AI.
   * It aggregates all available structured data into a clean format.
   */
  static async prepareForAI(matchId: string, marketType?: string, selection?: string): Promise<AIAnalysisInput> {
    try {
      // Fetch match data
      const match = await this.fetchMatchData(matchId)
      if (!match) {
        throw new Error(`Match ${matchId} not found`)
      }

      // Fetch statistics
      const statistics = await this.fetchStatistics(matchId)

      // Fetch context data
      const context = await this.fetchContext(matchId)

      // Fetch intelligence data
      const intelligence = await this.fetchIntelligence(matchId)

      return {
        match,
        statistics,
        context,
        intelligence,
        marketType,
        selection
      }
    } catch (error) {
      console.error('Failed to prepare data for AI:', error)
      throw error
    }
  }

  /**
   * Fetch basic match data
   */
  private static async fetchMatchData(matchId: string): Promise<StructuredMatchData | null> {
    try {
      const match = await prisma.match.findUnique({
        where: { id: matchId }
      })

      if (!match) {
        return null
      }

      return {
        matchId: match.id,
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        league: match.league,
        kickoffTime: match.kickoffTime,
        venue: match.venue || undefined,
        status: match.status,
        homeScore: match.homeScore || undefined,
        awayScore: match.awayScore || undefined,
        source: match.source
      }
    } catch (error) {
      console.error('Failed to fetch match data:', error)
      return null
    }
  }

  /**
   * Fetch statistical data
   */
  private static async fetchStatistics(matchId: string): Promise<StructuredStatistics> {
    try {
      const [teamStats, xgData] = await Promise.all([
        prisma.teamMatchStats.findMany({
          where: { matchId },
          include: { team: true }
        }),
        prisma.xgTeamMatch.findMany({
          where: { matchId },
          include: { team: true }
        })
      ])

      const homeStats = teamStats.find(s => s.team?.name?.toLowerCase().includes('home')) || teamStats[0] || null
      const awayStats = teamStats.find(s => s.team?.name?.toLowerCase().includes('away')) || teamStats[1] || null

      const homeXg = xgData.find(x => x.team?.name?.toLowerCase().includes('home')) || xgData[0] || null
      const awayXg = xgData.find(x => x.team?.name?.toLowerCase().includes('away')) || xgData[1] || null

      // H2H data would be computed from historical matches
      // Placeholder for now
      const h2h = null

      return {
        teamStats: {
          home: homeStats,
          away: awayStats
        },
        xgData: {
          home: homeXg,
          away: awayXg
        },
        h2h
      }
    } catch (error) {
      console.error('Failed to fetch statistics:', error)
      return {
        teamStats: { home: null, away: null },
        xgData: { home: null, away: null },
        h2h: null
      }
    }
  }

  /**
   * Fetch context data (injuries, weather, referee, lineups)
   */
  private static async fetchContext(matchId: string): Promise<StructuredContext> {
    try {
      const [injuries, weather, lineups] = await Promise.all([
        prisma.matchInjury.findMany({
          where: { matchId }
        }),
        prisma.matchWeather.findUnique({
          where: { matchId }
        }),
        prisma.matchLineup.findMany({
          where: { matchId }
        })
      ])

      const match = await prisma.match.findUnique({
        where: { id: matchId },
        include: { refereeEntity: true }
      })

      return {
        injuries,
        weather,
        referee: match?.refereeEntity || null,
        lineups
      }
    } catch (error) {
      console.error('Failed to fetch context:', error)
      return {
        injuries: [],
        weather: null,
        referee: null,
        lineups: []
      }
    }
  }

  /**
   * Fetch intelligence data (features, probabilities, data quality, community)
   */
  private static async fetchIntelligence(matchId: string): Promise<StructuredIntelligence> {
    try {
      const [features, probabilities, dataQuality] = await Promise.all([
        FeatureEngine.getFeatures(matchId),
        ProbabilityEngine.getAllProbabilitiesForMatch(matchId),
        DataQualityService.assessMatchQuality(matchId)
      ])

      // Community intelligence would come from community-intelligence service
      // Placeholder for now
      const communityIntelligence = null

      return {
        features,
        probabilities,
        dataQuality,
        communityIntelligence
      }
    } catch (error) {
      console.error('Failed to fetch intelligence:', error)
      return {
        features: null,
        probabilities: [],
        dataQuality: {
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
        },
        communityIntelligence: null
      }
    }
  }

  /**
   * Format structured data for AI prompt
   * 
   * This converts the structured data into a format suitable for AI prompts.
   * The existing AI analysis system can use this when available.
   */
  static formatForAI(input: AIAnalysisInput): string {
    const sections: string[] = []

    // Match Information
    sections.push(`## Match Information`)
    sections.push(`Home Team: ${input.match.homeTeam}`)
    sections.push(`Away Team: ${input.match.awayTeam}`)
    sections.push(`League: ${input.match.league}`)
    sections.push(`Kickoff: ${input.match.kickoffTime.toISOString()}`)
    sections.push(`Status: ${input.match.status}`)
    if (input.match.venue) sections.push(`Venue: ${input.match.venue}`)
    sections.push(`Data Source: ${input.match.source}`)

    // Data Quality
    sections.push(`\n## Data Quality`)
    sections.push(`Overall Score: ${(input.intelligence.dataQuality.overallScore * 100).toFixed(0)}%`)
    sections.push(`Freshness: ${input.intelligence.dataQuality.dataFreshness}`)

    // Statistics (if available)
    if (input.statistics.teamStats.home || input.statistics.teamStats.away) {
      sections.push(`\n## Team Statistics`)
      if (input.statistics.teamStats.home) {
        sections.push(`Home Team Stats: Goals Scored ${input.statistics.teamStats.home.goalsScored}, Goals Conceded ${input.statistics.teamStats.home.goalsConceded}`)
      }
      if (input.statistics.teamStats.away) {
        sections.push(`Away Team Stats: Goals Scored ${input.statistics.teamStats.away.goalsScored}, Goals Conceded ${input.statistics.teamStats.away.goalsConceded}`)
      }
    }

    // xG Data (if available)
    if (input.statistics.xgData.home || input.statistics.xgData.away) {
      sections.push(`\n## Expected Goals (xG)`)
      if (input.statistics.xgData.home) {
        sections.push(`Home Team xG: ${input.statistics.xgData.home.xg || 'N/A'}`)
      }
      if (input.statistics.xgData.away) {
        sections.push(`Away Team xG: ${input.statistics.xgData.away.xg || 'N/A'}`)
      }
    }

    // Context
    sections.push(`\n## Context`)
    if (input.context.injuries.length > 0) {
      sections.push(`Injuries: ${input.context.injuries.length} reported`)
    }
    if (input.context.weather) {
      sections.push(`Weather: ${input.context.weather.weatherCondition || 'N/A'}, ${input.context.weather.temperature || 'N/A'}°C`)
    }
    if (input.context.referee) {
      sections.push(`Referee: ${input.context.referee.name}`)
    }

    // Probabilities (if available)
    if (input.intelligence.probabilities.length > 0) {
      sections.push(`\n## Market Probabilities`)
      for (const prob of input.intelligence.probabilities) {
        sections.push(`${prob.marketType}:`)
        if (prob.homeProbability) sections.push(`  Home: ${(prob.homeProbability * 100).toFixed(1)}%`)
        if (prob.drawProbability) sections.push(`  Draw: ${(prob.drawProbability * 100).toFixed(1)}%`)
        if (prob.awayProbability) sections.push(`  Away: ${(prob.awayProbability * 100).toFixed(1)}%`)
        if (prob.overProbability) sections.push(`  Over: ${(prob.overProbability * 100).toFixed(1)}%`)
        if (prob.underProbability) sections.push(`  Under: ${(prob.underProbability * 100).toFixed(1)}%`)
        if (prob.yesProbability) sections.push(`  Yes: ${(prob.yesProbability * 100).toFixed(1)}%`)
        if (prob.noProbability) sections.push(`  No: ${(prob.noProbability * 100).toFixed(1)}%`)
      }
    }

    // Features (if available)
    if (input.intelligence.features) {
      sections.push(`\n## Match Features`)
      sections.push(`Data Quality Score: ${(input.intelligence.features.dataQualityScore * 100).toFixed(0)}%`)
    }

    return sections.join('\n')
  }

  /**
   * Check if structured data is sufficient for AI analysis
   */
  static isSufficientForAI(input: AIAnalysisInput, minimumQuality: number = 0.5): boolean {
    return DataQualityService.isSufficientForAI(input.intelligence.dataQuality, minimumQuality)
  }

  /**
   * Get data availability summary
   */
  static getDataAvailabilitySummary(input: AIAnalysisInput): {
    hasBasicData: boolean
    hasStatistics: boolean
    hasXg: boolean
    hasContext: boolean
    hasProbabilities: boolean
    hasFeatures: boolean
    overallReadiness: number
  } {
    const hasBasicData = !!input.match
    const hasStatistics = !!(input.statistics.teamStats.home || input.statistics.teamStats.away)
    const hasXg = !!(input.statistics.xgData.home || input.statistics.xgData.away)
    const hasContext = !!(input.context.injuries.length > 0 || input.context.weather || input.context.referee)
    const hasProbabilities = input.intelligence.probabilities.length > 0
    const hasFeatures = !!input.intelligence.features

    const availableCount = [hasBasicData, hasStatistics, hasXg, hasContext, hasProbabilities, hasFeatures].filter(Boolean).length
    const overallReadiness = availableCount / 6

    return {
      hasBasicData,
      hasStatistics,
      hasXg,
      hasContext,
      hasProbabilities,
      hasFeatures,
      overallReadiness
    }
  }
}

export default AIStructuredInterface

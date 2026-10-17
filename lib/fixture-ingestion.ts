/**
 * Football Fixture Ingestion System
 * 
 * Provider-agnostic fixture data ingestion with safety rules:
 * - No automatic AI analysis
 * - No duplicate matches
 * - No breaking manual match input
 */

import { prisma } from './prisma'
import redis from './redis'
import { ProviderMappingService } from './provider-mappings'
import { RawDataStorageService } from './raw-data-storage'
import { ProviderSyncLogger } from './provider-sync-logger'

// Normalized fixture data interface
export interface NormalizedFixture {
  match_id: string // External provider ID
  home_team: string
  away_team: string
  league: string
  kickoff_time: Date
  venue?: string
  match_status: 'upcoming' | 'live' | 'finished'
  source: string // Provider identifier
}

// Provider interface for extensibility
export interface FixtureProvider {
  name: string
  fetchDailyFixtures(date: Date): Promise<NormalizedFixture[]>
  isConfigured(): boolean
}

// Ingestion result tracking
export interface IngestionResult {
  added: number
  updated: number
  skipped: number
  errors: string[]
}

/**
 * Abstract base class for fixture providers
 */
export abstract class BaseFixtureProvider implements FixtureProvider {
  abstract name: string
  abstract fetchDailyFixtures(date: Date): Promise<NormalizedFixture[]>
  abstract isConfigured(): boolean

  /**
   * Normalize provider-specific data to our standard format
   */
  protected normalizeFixture(rawData: any): NormalizedFixture {
    throw new Error('normalizeFixture must be implemented by provider')
  }

  /**
   * Validate fixture data before processing
   */
  protected validateFixture(fixture: NormalizedFixture): boolean {
    return !!(
      fixture.match_id &&
      fixture.home_team &&
      fixture.away_team &&
      fixture.league &&
      fixture.kickoff_time &&
      fixture.match_status
    )
  }
}

/**
 * Mock provider for testing and development
 */
export class MockFixtureProvider extends BaseFixtureProvider {
  name = 'MockProvider'

  isConfigured(): boolean {
    return true // Always configured for testing
  }

  async fetchDailyFixtures(date: Date): Promise<NormalizedFixture[]> {
    // Generate mock fixtures for testing
    const mockFixtures: NormalizedFixture[] = [
      {
        match_id: `mock_${date.toISOString().split('T')[0]}_1`,
        home_team: 'Manchester United',
        away_team: 'Liverpool',
        league: 'Premier League',
        kickoff_time: new Date(date.getTime() + 10 * 60 * 60 * 1000), // 10 AM
        venue: 'Old Trafford',
        match_status: 'upcoming',
        source: this.name
      },
      {
        match_id: `mock_${date.toISOString().split('T')[0]}_2`,
        home_team: 'Arsenal',
        away_team: 'Chelsea',
        league: 'Premier League',
        kickoff_time: new Date(date.getTime() + 13 * 60 * 60 * 1000), // 1 PM
        venue: 'Emirates Stadium',
        match_status: 'upcoming',
        source: this.name
      },
      {
        match_id: `mock_${date.toISOString().split('T')[0]}_3`,
        home_team: 'Barcelona',
        away_team: 'Real Madrid',
        league: 'La Liga',
        kickoff_time: new Date(date.getTime() + 16 * 60 * 60 * 1000), // 4 PM
        venue: 'Camp Nou',
        match_status: 'upcoming',
        source: this.name
      }
    ]

    return mockFixtures.filter(fixture => this.validateFixture(fixture))
  }

  protected validateFixture(fixture: NormalizedFixture): boolean {
    return super.validateFixture(fixture)
  }
}

/**
 * Football Data API provider (example implementation)
 * This would be configured with real API credentials in production
 */
export class FootballDataAPIProvider extends BaseFixtureProvider {
  name = 'FootballDataAPI'
  private apiKey: string | null = null
  private baseUrl = 'https://api.football-data.org/v4'

  constructor() {
    super()
    this.apiKey = process.env.FOOTBALL_DATA_API_KEY || null
  }

  isConfigured(): boolean {
    return !!this.apiKey
  }

  async fetchDailyFixtures(date: Date): Promise<NormalizedFixture[]> {
    if (!this.isConfigured()) {
      throw new Error('Football Data API not configured')
    }

    try {
      // Example API call - adjust based on actual API structure
      const response = await fetch(
        `${this.baseUrl}/matches?date=${date.toISOString().split('T')[0]}`,
        {
          headers: {
            'X-Auth-Token': this.apiKey!
          }
        }
      )

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`)
      }

      const data = await response.json()
      return this.transformApiResponse(data.matches || [])
    } catch (error) {
      console.error('Football Data API error:', error)
      throw error
    }
  }

  private transformApiResponse(matches: any[]): NormalizedFixture[] {
    return matches
      .map(match => ({
        match_id: match.id.toString(),
        home_team: match.homeTeam.name,
        away_team: match.awayTeam.name,
        league: match.competition.name,
        kickoff_time: new Date(match.utcDate),
        venue: match.venue || undefined,
        match_status: this.mapStatus(match.status),
        source: this.name
      }))
      .filter(fixture => this.validateFixture(fixture))
  }

  private mapStatus(status: string): 'upcoming' | 'live' | 'finished' {
    switch (status.toLowerCase()) {
      case 'in_play':
      case 'paused':
        return 'live'
      case 'finished':
        return 'finished'
      default:
        return 'upcoming'
    }
  }
}

/**
 * Fixture ingestion manager
 */
export class FixtureIngestionManager {
  private providers: FixtureProvider[] = []
  private cache = new Map<string, { data: NormalizedFixture[]; timestamp: number }>()
  private readonly CACHE_TTL = 30 * 60 * 1000 // 30 minutes

  constructor() {
    this.registerProvider(new MockFixtureProvider())
    
    // Only register real providers if configured
    const footballDataProvider = new FootballDataAPIProvider()
    if (footballDataProvider.isConfigured()) {
      this.registerProvider(footballDataProvider)
    }
  }

  /**
   * Register a new fixture provider
   */
  registerProvider(provider: FixtureProvider): void {
    this.providers.push(provider)
  }

  /**
   * Get all registered providers
   */
  getProviders(): FixtureProvider[] {
    return [...this.providers]
  }

  /**
   * Fetch fixtures from all providers for a specific date
   */
  async fetchFixturesForDate(date: Date): Promise<NormalizedFixture[]> {
    const cacheKey = date.toISOString().split('T')[0]
    
    // Check cache first
    const cached = this.cache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data
    }

    const allFixtures: NormalizedFixture[] = []
    const errors: string[] = []

    for (const provider of this.providers) {
      try {
        if (!provider.isConfigured()) {
          console.warn(`Provider ${provider.name} is not configured, skipping`)
          continue
        }

        const fixtures = await provider.fetchDailyFixtures(date)
        allFixtures.push(...fixtures)
        console.log(`Fetched ${fixtures.length} fixtures from ${provider.name}`)
      } catch (error) {
        const errorMsg = `Failed to fetch from ${provider.name}: ${error instanceof Error ? error.message : 'Unknown error'}`
        errors.push(errorMsg)
        console.error(errorMsg)
      }
    }

    // Cache the results
    this.cache.set(cacheKey, {
      data: allFixtures,
      timestamp: Date.now()
    })

    return allFixtures
  }

  /**
   * Sync fixtures to database with provider infrastructure integration
   */
  async syncFixturesToDatabase(date: Date): Promise<IngestionResult> {
    const result: IngestionResult = {
      added: 0,
      updated: 0,
      skipped: 0,
      errors: []
    }

    // Start sync log
    const syncLogId = await ProviderSyncLogger.startSync(
      'match_api' as any,
      'daily_fixtures',
      { date: date.toISOString() }
    )

    try {
      const fixtures = await this.fetchFixturesForDate(date)

      for (const fixture of fixtures) {
        try {
          // Store raw data for audit/debugging
          await RawDataStorageService.store(
            'match_api' as any,
            '/fixtures',
            fixture,
            fixture.match_id,
            'success'
          )

          // Create provider mappings for teams
          await ProviderMappingService.getOrCreateMapping(
            'team',
            'match_api',
            fixture.home_team,
            fixture.home_team
          )
          await ProviderMappingService.getOrCreateMapping(
            'team',
            'match_api',
            fixture.away_team,
            fixture.away_team
          )

          // Sync fixture to database
          const syncResult = await this.syncSingleFixture(fixture)

          switch (syncResult) {
            case 'added':
              result.added++
              break
            case 'updated':
              result.updated++
              break
            case 'skipped':
              result.skipped++
              break
          }
        } catch (error) {
          const errorMsg = `Failed to sync fixture ${fixture.match_id}: ${error instanceof Error ? error.message : 'Unknown error'}`
          result.errors.push(errorMsg)
          console.error(errorMsg)

          // Store error in sync log
          await ProviderSyncLogger.incrementErrorCount(syncLogId, errorMsg)
        }
      }

      // Complete sync log
      await ProviderSyncLogger.completeSync(syncLogId, {
        recordsFetched: fixtures.length,
        recordsCreated: result.added,
        recordsUpdated: result.updated,
        recordsSkipped: result.skipped,
        errors: result.errors
      })

      console.log(`Fixture sync completed for ${date.toISOString().split('T')[0]}:`, result)
      return result
    } catch (error) {
      const errorMsg = `Failed to sync fixtures: ${error instanceof Error ? error.message : 'Unknown error'}`
      result.errors.push(errorMsg)
      console.error(errorMsg)

      // Mark sync as failed
      await ProviderSyncLogger.failSync(syncLogId, errorMsg, {
        recordsFetched: result.added + result.updated + result.skipped,
        recordsCreated: result.added,
        recordsUpdated: result.updated,
        recordsSkipped: result.skipped,
        errors: result.errors
      })

      return result
    }
  }

  /**
   * Sync a single fixture to the database
   */
  private async syncSingleFixture(fixture: NormalizedFixture): Promise<'added' | 'updated' | 'skipped'> {
    // Check if match already exists by external match_id
    const existingMatch = await prisma.match.findFirst({
      where: {
        OR: [
          // Try to find by external ID first
          { id: fixture.match_id },
          // If not found, check for duplicates by team names and time
          {
            homeTeam: fixture.home_team,
            awayTeam: fixture.away_team,
            kickoffTime: fixture.kickoff_time
          }
        ]
      }
    })

    if (existingMatch) {
      // Don't update manually created matches
      if (existingMatch.id.startsWith('manual_')) {
        return 'skipped'
      }

      // Check if anything changed
      const hasChanges = 
        existingMatch.league !== fixture.league ||
        existingMatch.kickoffTime.getTime() !== fixture.kickoff_time.getTime() ||
        existingMatch.venue !== fixture.venue ||
        existingMatch.status !== fixture.match_status

      if (hasChanges) {
        // Update only the changed fields
        await prisma.match.update({
          where: { id: existingMatch.id },
          data: {
            ...(existingMatch.league !== fixture.league && { league: fixture.league }),
            ...(existingMatch.kickoffTime.getTime() !== fixture.kickoff_time.getTime() && { kickoffTime: fixture.kickoff_time }),
            ...(existingMatch.venue !== fixture.venue && { venue: fixture.venue }),
            ...(existingMatch.status !== fixture.match_status && { status: fixture.match_status })
          }
        })
        return 'updated'
      }

      return 'skipped'
    }

    // Create new match with external ID
    await prisma.match.create({
      data: {
        id: fixture.match_id,
        homeTeam: fixture.home_team,
        awayTeam: fixture.away_team,
        league: fixture.league,
        kickoffTime: fixture.kickoff_time,
        venue: fixture.venue,
        status: fixture.match_status,
        source: fixture.source
      }
    })

    return 'added'
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear()
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; entries: Array<{ key: string; age: number }> } {
    const entries = Array.from(this.cache.entries()).map(([key, value]) => ({
      key,
      age: Date.now() - value.timestamp
    }))

    return {
      size: this.cache.size,
      entries
    }
  }
}

// Singleton instance
export const fixtureIngestionManager = new FixtureIngestionManager()

export default {
  FixtureIngestionManager,
  BaseFixtureProvider,
  MockFixtureProvider,
  FootballDataAPIProvider,
  fixtureIngestionManager
}

import { BaseDecoder } from './base-decoder'
import { DecodedBookingCode, DecodedSelection } from '@/lib/types'

/**
 * SportyBet decoder
 * SportyBet codes typically follow patterns like: ABC123XYZ or similar
 */
export class SportyBetDecoder extends BaseDecoder {
  bookmaker = 'sportybet' as const

  canDecode(code: string): boolean {
    // SportyBet codes are typically alphanumeric, 6-12 characters
    // May contain hyphens or underscores
    const cleaned = code.trim().replace(/[\s-]/g, '')
    return /^[A-Z0-9]{6,12}$/i.test(cleaned)
  }

  async decode(code: string): Promise<DecodedBookingCode> {
    if (!this.canDecode(code)) {
      throw new Error('Invalid SportyBet booking code format')
    }

    // SportyBet API integration
    const apiUrl = process.env.SPORTYBET_API_URL || 'https://api.sportybet.com/v1'
    const apiKey = process.env.SPORTYBET_API_KEY

    if (!apiKey) {
      console.warn('SportyBet API key not configured, using sample data for testing')
      
      // Return sample data for testing when API key is not available
      const sampleSelections: DecodedSelection[] = [
        {
          fixture: {
            homeTeam: 'Manchester United',
            awayTeam: 'Liverpool',
            competition: 'Premier League',
            matchDate: new Date().toISOString(),
            status: 'scheduled',
          },
          market: '1X2',
          selection: 'Home',
          odds: 2.5,
        },
        {
          fixture: {
            homeTeam: 'Arsenal',
            awayTeam: 'Chelsea',
            competition: 'Premier League',
            matchDate: new Date().toISOString(),
            status: 'scheduled',
          },
          market: 'Over/Under 2.5',
          selection: 'Over 2.5',
          odds: 1.85,
        },
        {
          fixture: {
            homeTeam: 'Real Madrid',
            awayTeam: 'Barcelona',
            competition: 'La Liga',
            matchDate: new Date().toISOString(),
            status: 'scheduled',
          },
          market: 'Both Teams to Score',
          selection: 'Yes',
          odds: 1.95,
        },
      ]

      return {
        bookmaker: this.bookmaker,
        code: code.trim(),
        selections: sampleSelections,
        metadata: {
          source: 'sportybet',
          decodedAt: new Date().toISOString(),
          note: 'Sample data - API key not configured',
        },
      }
    }

    try {
      const response = await fetch(`${apiUrl}/booking-codes/${code}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'User-Agent': 'BetCode-Intelligence/1.0'
        }
      })

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`Booking code "${code}" not found in SportyBet system`)
        } else if (response.status === 401) {
          throw new Error('Invalid SportyBet API key')
        } else {
          throw new Error(`SportyBet API error: ${response.status} ${response.statusText}`)
        }
      }

      const sportybetData = await response.json()

      // Validate response structure
      if (!sportybetData.selections || !Array.isArray(sportybetData.selections)) {
        throw new Error('Invalid SportyBet API response format')
      }

      // Map SportyBet response to our structure
      const selections: DecodedSelection[] = sportybetData.selections.map((item: any) => ({
        fixture: {
          homeTeam: item.homeTeam || 'Unknown Team',
          awayTeam: item.awayTeam || 'Unknown Team',
          competition: item.competition || 'Unknown Competition',
          matchDate: item.matchDate || new Date().toISOString(),
          status: 'scheduled',
        },
        market: item.market || '1X2',
        selection: item.selection || 'Unknown',
        odds: item.odds || 1.0,
      }))

      if (selections.length === 0) {
        throw new Error(`No games found for booking code: ${code}`)
      }

      return {
        bookmaker: this.bookmaker,
        code: code.trim(),
        selections,
        metadata: {
          source: 'sportybet',
          decodedAt: new Date().toISOString(),
          apiResponse: sportybetData,
        },
      }

    } catch (error) {
      if (error instanceof Error) {
        throw error
      }
      throw new Error(`Failed to fetch SportyBet data: ${error}`)
    }
  }
}


import { BaseDecoder } from './base-decoder'
import { DecodedBookingCode, DecodedSelection } from '@/lib/types'

/**
 * Bet9ja decoder
 * Bet9ja codes are typically numeric or alphanumeric
 */
export class Bet9jaDecoder extends BaseDecoder {
  bookmaker = 'bet9ja' as const

  canDecode(code: string): boolean {
    // Bet9ja codes are typically numeric, 6-10 digits
    // May also be alphanumeric in some cases
    const cleaned = code.trim().replace(/[\s-]/g, '')
    return /^[0-9]{6,10}$/i.test(cleaned) || /^[A-Z0-9]{6,12}$/i.test(cleaned)
  }

  async decode(code: string): Promise<DecodedBookingCode> {
    if (!this.canDecode(code)) {
      throw new Error('Invalid Bet9ja booking code format')
    }

    // TODO: Implement actual Bet9ja API integration
    // Placeholder implementation
    const selections: DecodedSelection[] = [
      {
        fixture: {
          homeTeam: 'Team A',
          awayTeam: 'Team B',
          competition: 'Premier League',
          matchDate: new Date().toISOString(),
          status: 'scheduled',
        },
        market: '1X2',
        selection: 'Home',
        odds: 2.5,
      },
    ]

    return {
      bookmaker: this.bookmaker,
      code: code.trim(),
      selections,
      metadata: {
        source: 'bet9ja',
        decodedAt: new Date().toISOString(),
      },
    }
  }
}


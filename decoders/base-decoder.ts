import { BookmakerDecoder, DecodedBookingCode } from '@/lib/types'
import { Bookmaker } from '@/lib/types'

export abstract class BaseDecoder implements BookmakerDecoder {
  abstract bookmaker: Bookmaker

  abstract canDecode(code: string): boolean
  abstract decode(code: string): Promise<DecodedBookingCode>

  protected normalizeTeamName(name: string): string {
    return name
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/fc\s*$/i, '')
      .trim()
  }

  protected parseOdds(odds: string | number): number {
    const num = typeof odds === 'string' ? parseFloat(odds) : odds
    if (isNaN(num) || num <= 0) {
      throw new Error(`Invalid odds: ${odds}`)
    }
    return num
  }

  protected parseDate(dateStr: string): string {
    // Normalize date strings to ISO format
    try {
      const date = new Date(dateStr)
      if (isNaN(date.getTime())) {
        throw new Error(`Invalid date: ${dateStr}`)
      }
      return date.toISOString()
    } catch (error) {
      throw new Error(`Failed to parse date: ${dateStr}`)
    }
  }
}


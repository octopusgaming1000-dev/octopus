import { DecodedBookingCode, Bookmaker } from './types'
import { detectBookmaker } from './bookmaker-detector'

/**
 * Base interface for all bookmaker decoders
 */
export interface BookmakerDecoder {
  /**
   * The bookmaker this decoder handles
   */
  bookmaker: Bookmaker

  /**
   * Check if a booking code matches this bookmaker's format
   */
  canDecode(code: string): boolean

  /**
   * Decode a booking code into normalized structure
   * @throws Error if code is invalid or cannot be decoded
   */
  decode(code: string): Promise<DecodedBookingCode>
}

/**
 * Registry of all available decoders
 */
export class DecoderRegistry {
  private decoders: Map<Bookmaker, BookmakerDecoder> = new Map()

  register(decoder: BookmakerDecoder): void {
    this.decoders.set(decoder.bookmaker, decoder)
  }

  /**
   * Auto-detect bookmaker and decode booking code
   */
  async autoDecode(code: string): Promise<DecodedBookingCode> {
    const detection = detectBookmaker(code)
    console.log(`Detected bookmaker: ${detection.bookmaker} (${detection.confidence} confidence)`)
    
    // Try detected bookmaker first
    if (detection.bookmaker !== 'unknown') {
      const decoder = this.decoders.get(detection.bookmaker as Bookmaker)
      if (decoder) {
        try {
          return await decoder.decode(code)
        } catch (error) {
          console.warn(`Failed to decode with ${detection.bookmaker}:`, error)
        }
      }
    }
    
    // Fallback to existing tier-based detection
    const tier1: Bookmaker[] = ['sportybet', 'bet9ja', 'betking']
    for (const bookmaker of tier1) {
      const decoder = this.decoders.get(bookmaker)
      if (decoder && decoder.canDecode(code)) {
        return decoder.decode(code)
      }
    }

    // Try Tier 2
    const tier2: Bookmaker[] = ['1xbet', 'merrybet', 'naijabet', 'betway', 'bangbet', 'livescorebet']
    for (const bookmaker of tier2) {
      const decoder = this.decoders.get(bookmaker)
      if (decoder && decoder.canDecode(code)) {
        try {
          return decoder.decode(code)
        } catch (error) {
          // Graceful failure for Tier 2
          console.warn(`Failed to decode ${bookmaker} code:`, error)
          continue
        }
      }
    }

    throw new Error('Unable to identify bookmaker from booking code')
  }

  getDecoder(bookmaker: Bookmaker): BookmakerDecoder | undefined {
    return this.decoders.get(bookmaker)
  }
}

// Global registry instance
export const decoderRegistry = new DecoderRegistry()


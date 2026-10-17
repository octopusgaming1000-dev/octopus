import { DecodedBookingCode } from './types'

/**
 * Interface for booking slip data providers
 * Different bookmakers can implement this to provide game data
 */
export interface BookingSlipProvider {
  /**
   * Get games from a booking code
   * @param code - The booking code to decode
   * @returns Promise<DecodedBookingCode | null> - Game data or null if invalid
   */
  getGamesFromCode(code: string): Promise<DecodedBookingCode | null>
}

/**
 * No API Provider
 * 
 * This provider always returns null - used when no API access is available
 * Perfect for development, testing, or offline scenarios
 */
export class NoApiProvider implements BookingSlipProvider {
  
  /**
   * Always returns null since we have no API access
   * This prevents errors and allows the app to run without external dependencies
   */
  async getGamesFromCode(code: string): Promise<DecodedBookingCode | null> {
    // Log the attempt for debugging
    console.log(`NoApiProvider: Received code "${code}" but returning null (no API configured)`)
    
    // Always return null to indicate no data available
    // The UI can show appropriate "no data" message
    return null
  }
}

/**
 * SportyBet API Provider
 * 
 * This would connect to SportyBet's real API
 * Placeholder for future implementation when API access is available
 */
export class SportyBetProvider implements BookingSlipProvider {
  
  /**
   * Connect to SportyBet API to get real game data
   * TODO: Implement when SportyBet API access is available
   */
  async getGamesFromCode(code: string): Promise<DecodedBookingCode | null> {
    try {
      // TODO: Add real SportyBet API integration here
      // const response = await fetch(`${SPORTYBET_API_URL}/booking-codes/${code}`)
      // return await response.json()
      
      console.log(`SportyBetProvider: API not implemented for code "${code}"`)
      return null
    } catch (error) {
      console.error('SportyBet API error:', error)
      return null
    }
  }
}

/**
 * Bet9ja API Provider
 * 
 * This would connect to Bet9ja's real API
 * Placeholder for future implementation
 */
export class Bet9jaProvider implements BookingSlipProvider {
  
  /**
   * Connect to Bet9ja API to get real game data
   * TODO: Implement when Bet9ja API access is available
   */
  async getGamesFromCode(code: string): Promise<DecodedBookingCode | null> {
    try {
      // TODO: Add real Bet9ja API integration here
      // const response = await fetch(`${BET9JA_API_URL}/booking-codes/${code}`)
      // return await response.json()
      
      console.log(`Bet9jaProvider: API not implemented for code "${code}"`)
      return null
    } catch (error) {
      console.error('Bet9ja API error:', error)
      return null
    }
  }
}

/**
 * BetKing API Provider
 * 
 * This would connect to BetKing's real API
 * Placeholder for future implementation
 */
export class BetKingProvider implements BookingSlipProvider {
  
  /**
   * Connect to BetKing API to get real game data
   * TODO: Implement when BetKing API access is available
   */
  async getGamesFromCode(code: string): Promise<DecodedBookingCode | null> {
    try {
      // TODO: Add real BetKing API integration here
      // const response = await fetch(`${BETKING_API_URL}/booking-codes/${code}`)
      // return await response.json()
      
      console.log(`BetKingProvider: API not implemented for code "${code}"`)
      return null
    } catch (error) {
      console.error('BetKing API error:', error)
      return null
    }
  }
}

/**
 * Provider Factory
 * 
 * Creates the appropriate provider based on configuration
 */
export class ProviderFactory {
  
  /**
   * Get the right provider for current environment
   * @returns BookingSlipProvider - The configured provider
   */
  static getProvider(): BookingSlipProvider {
    // Check if we have API credentials configured
    const hasSportyBetApi = process.env.SPORTYBET_API_KEY
    const hasBet9jaApi = process.env.BET9JA_API_KEY
    const hasBetKingApi = process.env.BETKING_API_KEY
    
    // Return appropriate provider based on what's configured
    if (hasSportyBetApi) {
      return new SportyBetProvider()
    } else if (hasBet9jaApi) {
      return new Bet9jaProvider()
    } else {
      // Default to NoApiProvider when no APIs are configured
      return new NoApiProvider()
    }
  }
  
  /**
   * Get provider for specific bookmaker
   * @param bookmaker - The bookmaker name
   * @returns BookingSlipProvider - The specific provider
   */
  static getProviderForBookmaker(bookmaker: string): BookingSlipProvider {
    switch (bookmaker.toLowerCase()) {
      case 'sportybet':
        return process.env.SPORTYBET_API_KEY ? new SportyBetProvider() : new NoApiProvider()
      case 'bet9ja':
        return process.env.BET9JA_API_KEY ? new Bet9jaProvider() : new NoApiProvider()
      case 'betking':
        return process.env.BETKING_API_KEY ? new BetKingProvider() : new NoApiProvider()
      default:
        return new NoApiProvider()
    }
  }
}

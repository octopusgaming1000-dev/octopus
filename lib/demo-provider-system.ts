import { BookingSlipProvider, NoApiProvider, SportyBetProvider, Bet9jaProvider, BetKingProvider, ProviderFactory } from './booking-slip-provider'

/**
 * Demo of the BookingSlipProvider system
 * Shows how different providers work and when they're used
 */
export async function demoProviderSystem() {
  console.log('🏗️  BookingSlipProvider System Demo')
  console.log('='.repeat(50))
  
  // Test codes for different bookmakers
  const testCodes = [
    { code: 'k8zkpe', bookmaker: 'sportybet' },
    { code: '1234567890', bookmaker: 'bet9ja' },
    { code: 'K8ZKPE1', bookmaker: 'betking' },
    { code: 'unknown123', bookmaker: 'unknown' }
  ]
  
  console.log('\n📋 Testing different providers with sample codes:\n')
  
  for (const { code, bookmaker } of testCodes) {
    console.log(`--- Testing ${code} (${bookmaker}) ---`)
    
    // Get the appropriate provider for this bookmaker
    const provider = ProviderFactory.getProviderForBookmaker(bookmaker)
    
    try {
      // Try to get games from the code
      const result = await provider.getGamesFromCode(code)
      
      if (result) {
        console.log(`✅ Success: Found ${result.selections.length} games`)
        console.log(`   Bookmaker: ${result.bookmaker}`)
        console.log(`   First game: ${result.selections[0]?.fixture?.homeTeam} vs ${result.selections[0]?.fixture?.awayTeam}`)
      } else {
        console.log(`⚠️  No data available (API not configured)`)
        console.log(`   Provider: ${provider.constructor.name}`)
      }
    } catch (error) {
      console.log(`❌ Error: ${error}`)
    }
    
    console.log('') // Empty line for readability
  }
  
  console.log('\n🏭 Provider Selection Logic:')
  console.log('   NoApiProvider: Used when no API keys are configured')
  console.log('   SportyBetProvider: Used when SPORTYBET_API_KEY is set')
  console.log('   Bet9jaProvider: Used when BET9JA_API_KEY is set')
  console.log('   BetKingProvider: Used when BETKING_API_KEY is set')
  
  console.log('\n💡 Usage in Production:')
  console.log('   1. Add API keys to .env file')
  console.log('   2. ProviderFactory automatically selects correct provider')
  console.log('   3. Real booking code data will be fetched')
  console.log('   4. Users get actual game selections and odds')
  
  console.log('\n' + '='.repeat(50))
  console.log('✅ Demo Complete!')
}

/**
 * Test the NoApiProvider specifically
 */
export async function testNoApiProvider() {
  console.log('\n🧪 Testing NoApiProvider:')
  
  const noApiProvider = new NoApiProvider()
  const result = await noApiProvider.getGamesFromCode('k8zkpe')
  
  console.log(`Result: ${result}`)
  console.log('Expected: null (always returns null)')
  
  return result
}

// Export for easy testing
export { demoProviderSystem as default }

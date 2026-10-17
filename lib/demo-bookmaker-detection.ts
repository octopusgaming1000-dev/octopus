import { detectBookmaker } from './bookmaker-detector.js'

/**
 * Demo function to show bookmaker detection in action
 */
export function demoBookmakerDetection() {
  console.log('🎯 Octopus - Bookmaker Detection Demo')
  console.log('=' .repeat(50))
  
  const sampleCodes = [
    { code: 'k8zkpe', description: 'SportyBet example' },
    { code: '1234567890', description: 'Bet9ja example' },
    { code: 'K8ZKPE1', description: 'BetKing example' },
    { code: 'unknown123', description: 'Unknown format' }
  ]
  
  sampleCodes.forEach(({ code, description }) => {
    const detection = detectBookmaker(code)
    
    console.log(`\n📋 Code: ${code}`)
    console.log(`📝 Description: ${description}`)
    console.log(`🏷️  Bookmaker: ${detection.bookmaker.toUpperCase()}`)
    console.log(`🎯 Confidence: ${detection.confidence.toUpperCase()}`)
    
    // Show confidence indicator
    const confidenceIcon = detection.confidence === 'high' ? '🟢' : 
                        detection.confidence === 'medium' ? '🟡' : '🔴'
    console.log(`   ${confidenceIcon} ${detection.confidence} confidence`)
  })
  
  console.log('\n' + '='.repeat(50))
  console.log('✅ Detection Complete!')
  console.log('\n💡 Usage: This function will automatically detect the bookmaker')
  console.log('   when users enter booking codes in the main application.')
}

// Export for easy testing
export { demoBookmakerDetection as default }

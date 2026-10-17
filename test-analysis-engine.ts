// Test file for the AI Football Analysis Engine
import { footballAnalysisEngine, MatchData } from './lib/analysis-engine'

// Test data matching ManualGameSelection output format
const testMatches: MatchData[] = [
  {
    homeTeam: 'Manchester United',
    awayTeam: 'Liverpool',
    market: '1X2',
    selection: 'Home',
    odds: 2.10
  },
  {
    homeTeam: 'Arsenal',
    awayTeam: 'Chelsea',
    market: 'Over/Under 2.5 Goals',
    selection: 'Over',
    odds: 1.85
  },
  {
    homeTeam: 'Real Madrid',
    awayTeam: 'Barcelona',
    market: 'Both Teams To Score',
    selection: 'Yes',
    odds: 1.65
  },
  {
    homeTeam: 'Bayern Munich',
    awayTeam: 'Borussia Dortmund',
    market: 'Over / Under 8.5 Corners',
    selection: 'Over',
    odds: 1.95
  },
  {
    homeTeam: 'Manchester City',
    awayTeam: 'Tottenham',
    market: 'Over / Under 3.5 Cards',
    selection: 'Under',
    odds: 1.75
  }
]

console.log('🤖 Testing AI Football Analysis Engine...')
console.log('==========================================\n')

testMatches.forEach((match, index) => {
  console.log(`📊 Test ${index + 1}: ${match.homeTeam} vs ${match.awayTeam}`)
  console.log(`📈 Market: ${match.market} - Selection: ${match.selection}`)
  console.log(`💰 Odds: ${match.odds}`)
  console.log('---')
  
  const analysis = footballAnalysisEngine.analyzeMatch(match)
  
  console.log(`🎯 Probability Range: ${analysis.probability_range[0]}% - ${analysis.probability_range[1]}%`)
  console.log(`⚠️  Risk Level: ${analysis.risk_level}`)
  console.log(`📝 Explanation: ${analysis.explanation}`)
  console.log(`⚠️  Caution: ${analysis.caution_note}`)
  console.log('\n' + '='.repeat(50) + '\n')
})

console.log('✅ Analysis Engine Test Complete!')
console.log('🚀 Ready for integration with ManualGameSelection component!')

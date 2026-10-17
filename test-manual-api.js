// Test the manual analysis API endpoint
const testManualAPI = async () => {
  console.log('🧪 Testing Manual Analysis API')
  console.log('='.repeat(40))

  // Sample manual games data
  const sampleGames = [
    {
      homeTeam: 'Manchester United',
      awayTeam: 'Liverpool',
      market: '1X2',
      selection: 'Home',
      odds: 2.5
    },
    {
      homeTeam: 'Arsenal',
      awayTeam: 'Chelsea',
      market: 'Over/Under 2.5',
      selection: 'Over 2.5',
      odds: 1.85
    }
  ]

  try {
    console.log('📤 Sending request to /api/analyze-manual...')
    
    const response = await fetch('http://localhost:3000/api/analyze-manual', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        games: sampleGames,
        bookingCode: 'MANUAL'
      }),
    })

    if (response.ok) {
      const data = await response.json()
      console.log('✅ API Response Success!')
      console.log('📊 Results summary:')
      console.log(`   - Booking Code ID: ${data.data.bookingCode.id}`)
      console.log(`   - Number of selections: ${data.data.selections.length}`)
      console.log(`   - Manual Selection: ${data.data.manualSelection}`)
      
      // Show first selection details
      if (data.data.selections.length > 0) {
        const firstSelection = data.data.selections[0]
        console.log(`   - First game: ${firstSelection.fixture.homeTeam} vs ${firstSelection.fixture.awayTeam}`)
        console.log(`   - Market: ${firstSelection.market}`)
        console.log(`   - Selection: ${firstSelection.selection}`)
        console.log(`   - Odds: ${firstSelection.odds}`)
        console.log(`   - Risk Level: ${firstSelection.analysis.riskLevel}`)
      }
      
    } else {
      const errorData = await response.json()
      console.log('❌ API Error:', response.status)
      console.log('   Error message:', errorData.error)
    }
    
  } catch (error) {
    console.log('❌ Network Error:', error.message)
    console.log('💡 Make sure the dev server is running: npm run dev')
  }

  console.log('\n' + '='.repeat(40))
  console.log('🧪 Manual API Test Complete!')
}

// Run the test
testManualAPI()

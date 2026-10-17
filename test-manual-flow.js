// Test the manual selection flow
const testManualFlow = async () => {
  console.log('🧪 Testing Manual Selection Flow')
  console.log('='.repeat(40))

  try {
    // Simulate API call with a code that will return null from provider
    const response = await fetch('http://localhost:3000/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code: 'unknown123' })
    })

    if (response.ok) {
      const data = await response.json()
      console.log('✅ API Response:', data)
      
      if (data.data?.manualSelection) {
        console.log('✅ Manual selection flag detected!')
        console.log('📝 Message:', data.data.message)
      } else {
        console.log('❌ Manual selection flag not found')
      }
    } else {
      console.log('❌ API Error:', response.status)
    }
  } catch (error) {
    console.log('❌ Network Error:', error.message)
    console.log('💡 Make sure the dev server is running: npm run dev')
  }

  console.log('='.repeat(40))
  console.log('🧪 Test Complete!')
}

// Run test
testManualFlow()

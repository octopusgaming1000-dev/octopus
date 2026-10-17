// Test script to check auth/me endpoint
// Run this in browser console on any page

async function testAuthMe() {
  console.log('Testing /api/auth/me endpoint...')
  
  // Check for token
  const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
  console.log('Token found:', !!token)
  console.log('Token value:', token?.substring(0, 20) + '...')
  
  if (!token) {
    console.log('No token found. Please login first.')
    return
  }
  
  try {
    const response = await fetch('/api/auth/me', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    
    console.log('Response status:', response.status)
    console.log('Response headers:', Object.fromEntries(response.headers.entries()))
    
    const data = await response.json()
    console.log('Response data:', data)
    
    if (response.ok) {
      console.log('✅ Auth check successful!')
    } else {
      console.log('❌ Auth check failed:', data.error)
    }
  } catch (error) {
    console.error('❌ Network error:', error)
  }
}

// Auto-run the test
testAuthMe()

// Also make it available globally
window.testAuthMe = testAuthMe

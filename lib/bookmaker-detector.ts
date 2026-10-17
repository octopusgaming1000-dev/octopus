interface BookmakerDetection {
  bookmaker: string
  confidence: 'high' | 'medium' | 'low'
}

/**
 * Detects Nigerian bookmaker based on booking code format
 */
export function detectBookmaker(code: string): BookmakerDetection {
  const cleanedCode = code.trim()
  
  // Bet9ja: 6-10 numeric characters (most specific - check first)
  if (/^[0-9]{6,10}$/.test(cleanedCode)) {
    return {
      bookmaker: 'bet9ja',
      confidence: 'high'
    }
  }
  
  // SportyBet: 6-8 lowercase alphanumeric characters (check second)
  if (/^[a-z0-9]{6,8}$/.test(cleanedCode)) {
    return {
      bookmaker: 'sportybet',
      confidence: 'high'
    }
  }
  
  // BetKing: 7-10 mixed case alphanumeric with at least one uppercase letter
  if (/^[a-zA-Z0-9]{7,10}$/.test(cleanedCode) && /[A-Z]/.test(cleanedCode)) {
    return {
      bookmaker: 'betking',
      confidence: 'high'
    }
  }
  
  // Fallback for partial matches or edge cases
  if (/^[0-9]+$/.test(cleanedCode) && cleanedCode.length >= 6 && cleanedCode.length <= 10) {
    return {
      bookmaker: 'bet9ja',
      confidence: 'medium'
    }
  }
  
  if (/^[a-z0-9]+$/.test(cleanedCode) && cleanedCode.length >= 6 && cleanedCode.length <= 8) {
    return {
      bookmaker: 'sportybet',
      confidence: 'medium'
    }
  }
  
  if (/^[a-zA-Z0-9]+$/.test(cleanedCode) && cleanedCode.length >= 7 && cleanedCode.length <= 10 && /[A-Z]/.test(cleanedCode)) {
    return {
      bookmaker: 'betking',
      confidence: 'medium'
    }
  }
  
  // Unknown format
  return {
    bookmaker: 'unknown',
    confidence: 'low'
  }
}

/**
 * Tests the bookmaker detection with sample codes
 */
export function testBookmakerDetection() {
  const testCodes = [
    'k8zkpe',      // SportyBet (lowercase, 6 chars)
    'abc12345',     // SportyBet (lowercase, 8 chars)
    '123456',       // Bet9ja (numeric, 6 chars)
    '9876543210',   // Bet9ja (numeric, 10 chars)
    'K8ZKPE1',     // BetKing (mixed case, 7 chars)
    'ABC123XYZ',     // BetKing (mixed case, 9 chars)
    'xyz',          // Unknown (too short)
    '123456789012345', // Unknown (too long)
  ]
  
  console.log('=== Bookmaker Detection Test ===')
  testCodes.forEach(code => {
    const detection = detectBookmaker(code)
    console.log(`${code.padEnd(16)} -> ${detection.bookmaker.padEnd(10)} (${detection.confidence})`)
  })
  console.log('=== End Test ===')
}

// Run test if this file is executed directly
if (typeof window === 'undefined' && require.main === module) {
  testBookmakerDetection()
}

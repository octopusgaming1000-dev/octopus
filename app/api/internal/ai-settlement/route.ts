import { NextRequest, NextResponse } from 'next/server'
import AiSettlementWorker from '@/lib/ai-settlement-worker'

export async function POST(request: NextRequest) {
  try {
    // Verify this is an internal request (add auth if needed)
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.INTERNAL_API_KEY}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('🚀 Triggering AI settlement worker...')
    await AiSettlementWorker.run()
    
    return NextResponse.json({
      success: true,
      message: 'AI settlement worker completed successfully',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('❌ Settlement worker API error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

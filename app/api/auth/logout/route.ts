import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  // For now, just return success
  // In a real app, you'd invalidate the session/token
  return NextResponse.json({
    success: true,
    message: 'Logged out successfully'
  })
}

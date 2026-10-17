import { NextResponse } from 'next/server'
import { getGoogleAuthUrl } from '@/lib/google-oauth'

export async function GET() {
  try {
    // Check if Google OAuth credentials are configured
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return NextResponse.json({
        error: 'Google OAuth is not configured. Please use email signup instead.',
        setupRequired: true,
        message: 'Google OAuth credentials need to be configured in the environment variables.'
      }, { status: 503 })
    }

    const authUrl = getGoogleAuthUrl()
    return NextResponse.json({ authUrl })
  } catch (error) {
    console.error('Google auth error:', error)
    return NextResponse.json(
      { error: 'Failed to generate Google auth URL' },
      { status: 500 }
    )
  }
}

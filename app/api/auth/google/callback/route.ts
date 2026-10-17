import { NextRequest, NextResponse } from 'next/server'
import { getGoogleUserInfo } from '@/lib/google-oauth'
import { createOrUpdateGoogleUser, generateToken } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const error = searchParams.get('error')

    if (error) {
      return NextResponse.redirect(
        new URL('/login?error=google_auth_failed', request.url)
      )
    }

    if (!code) {
      return NextResponse.redirect(
        new URL('/login?error=no_code', request.url)
      )
    }

    // Get Google user info
    const googleUser = await getGoogleUserInfo(code)

    // Create or update user
    const { user, isNew } = await createOrUpdateGoogleUser(googleUser)

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
    })

    // Redirect to dashboard with token
    const redirectUrl = new URL('/dashboard', request.url)
    redirectUrl.searchParams.set('token', token)
    if (isNew) {
      redirectUrl.searchParams.set('new_user', 'true')
    }

    return NextResponse.redirect(redirectUrl)
  } catch (error) {
    console.error('Google callback error:', error)
    return NextResponse.redirect(
      new URL('/login?error=google_callback_failed', request.url)
    )
  }
}

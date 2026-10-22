import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPassword, generateToken } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address' },
        { status: 400 }
      )
    }

    // Find user with profile
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        userProfile: true,
      },
    })

    if (!user) {
      // Generic error to prevent account enumeration
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    if (!user.passwordHash) {
      // User signed up with Google
      return NextResponse.json(
        { error: 'This account uses Google authentication. Please sign in with Google.' },
        { status: 401 }
      )
    }

    // Verify password
    const isValid = await verifyPassword(password, user.passwordHash)

    if (!isValid) {
      // Generic error to prevent account enumeration
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Generate JWT token for the user
    const token = generateToken({ userId: user.id, email: user.email })

    // Return user data and token (excluding sensitive info)
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        emailVerified: user.emailVerified,
        name: user.name,
        image: user.image,
        provider: user.provider,
        userProfile: user.userProfile ? {
          reputationScore: user.userProfile.reputationScore,
          riskFlag: user.userProfile.riskFlag,
        } : null,
      },
      token,
    })

  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Login failed. Please try again later.' },
      { status: 500 }
    )
  }
}

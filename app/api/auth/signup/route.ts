import { NextRequest, NextResponse } from 'next/server'
import { hashPassword, generateToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      )
    }

    // Hash password
    const passwordHash = await hashPassword(password)

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        provider: 'email',
        emailVerified: false,
      },
    })

    // Create user profile
    await prisma.userProfile.create({
      data: {
        userId: user.id,
        reputationScore: 0,
        riskFlag: 'neutral',
        correctPredictions: 0,
        totalPredictions: 0,
        accuracyRate: 0.0,
        communityScore: 0.0,
        consensusAccuracy: 0.0,
        contributionCount: 0,
        topPredictorCount: 0,
      },
    })

    // Generate JWT token for automatic login
    const token = generateToken({ userId: user.id, email: user.email })

    return NextResponse.json({
      success: true,
      message: 'Account created successfully',
      user: {
        id: user.id,
        email: user.email,
        emailVerified: user.emailVerified,
      },
      token,
    })

  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { error: 'Failed to create account' },
      { status: 500 }
    )
  }
}

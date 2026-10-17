import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword, createVerificationToken, generateToken } from '@/lib/auth'
import { z } from 'zod'

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = registerSchema.parse(body)

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 400 }
      )
    }

    // Create user
    const passwordHash = await hashPassword(password)
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

    // Create verification token
    const verificationToken = await createVerificationToken(email)

    // Generate JWT token for automatic login
    const authToken = generateToken({ userId: user.id, email: user.email })

    // TODO: Send verification email
    // For MVP, return token in response (remove in production)
    const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verify-email?token=${verificationToken}&email=${encodeURIComponent(email)}`

    return NextResponse.json({
      success: true,
      message: 'User created successfully. Please verify your email.',
      user: {
        id: user.id,
        email: user.email,
        emailVerified: user.emailVerified,
      },
      token: authToken,
      // Remove this in production - only return in development
      ...(process.env.NODE_ENV === 'development' && { verificationUrl }),
    })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    )
  }
}


import { NextRequest, NextResponse } from 'next/server'
import { verifyEmailToken } from '@/lib/auth'
import { z } from 'zod'

const verifySchema = z.object({
  email: z.string().email(),
  token: z.string(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, token } = verifySchema.parse(body)

    const isValid = await verifyEmailToken(email, token)

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid or expired verification token' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Email verified successfully',
    })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Verification error:', error)
    return NextResponse.json(
      { error: 'Failed to verify email' },
      { status: 500 }
    )
  }
}


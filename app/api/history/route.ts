import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/middleware'

export const GET = requireAuth(async (req, user) => {
  try {
    const bookingCodes = await prisma.bookingCode.findMany({
      where: {
        userId: user.userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50, // Limit to last 50
    })

    // Deserialize JSON fields
    const deserialized = bookingCodes.map((bc) => ({
      ...bc,
      // Note: decodedData and analyses relations not implemented yet
    }))

    return NextResponse.json({
      success: true,
      data: deserialized,
    })
  } catch (error: any) {
    console.error('History error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch history' },
      { status: 500 }
    )
  }
})


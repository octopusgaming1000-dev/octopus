import { NextRequest, NextResponse } from 'next/server.js'
import { prisma } from '/Users/mac/betcode intelligence/lib/prisma'
import { verifyPassword, hashPassword } from '/Users/mac/betcode intelligence/lib/auth'
import { MarketAnalysis, MatchData } from '/Users/mac/betcode intelligence/lib/analysis-engine'

// Use type assertion to bypass TypeScript issues temporarily
const prismaClient = prisma as any

interface SaveAnalysisRequest {
  email: string
  password: string
  name?: string
  matches: MatchData[]
  analyses: MarketAnalysis[]
  bookingCode?: string
  slipRisk?: {
    overallRisk: string
    averageProbability: number
    riskDistribution: {
      low: number
      medium: number
      high: number
    }
    recommendedStake: string
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: SaveAnalysisRequest = await request.json()

    // Validate required fields
    const { email, password, matches, analyses } = body
    if (!email || !password || !matches || !analyses) {
      return NextResponse.json(
        { error: 'Email, password, matches, and analyses are required' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await prismaClient.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      // If user exists, verify password and save analysis to existing account
      if (!existingUser.passwordHash) {
        return NextResponse.json(
          { error: 'Please use email signup or login with Google' },
          { status: 401 }
        )
      }

      const isValid = await verifyPassword(password, existingUser.passwordHash)
      if (!isValid) {
        return NextResponse.json(
          { error: 'Invalid email or password' },
          { status: 401 }
        )
      }

      // Save analysis to existing user
      const savedAnalysis = await saveAnalysisToUser(existingUser.id, body)
      return NextResponse.json({
        success: true,
        message: 'Analysis saved to your existing account',
        user: {
          id: existingUser.id,
          email: existingUser.email,
          name: existingUser.name,
          provider: existingUser.provider,
        },
        analysis: savedAnalysis
      })
    } else {
      // Create new user
      const passwordHash = await hashPassword(password)

      const newUser = await prismaClient.user.create({
        data: {
          email,
          passwordHash,
          name: body.name || null,
          provider: 'email',
          emailVerified: false,
        },
      })

      // Create user profile separately
      await prismaClient.userProfile.create({
        data: {
          userId: newUser.id,
          reputationScore: 0,
          riskFlag: 'neutral',
        }
      })

      // Save analysis to new user
      const savedAnalysis = await saveAnalysisToUser(newUser.id, body)
      return NextResponse.json({
        success: true,
        message: 'Account created and analysis saved',
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          provider: newUser.provider,
        },
        analysis: savedAnalysis
      })
    }

  } catch (error: any) {
    console.error('Save analysis error:', error)
    return NextResponse.json(
      { error: 'Failed to save analysis' },
      { status: 500 }
    )
  }
}

async function saveAnalysisToUser(userId: string, body: SaveAnalysisRequest) {
  const { matches, analyses, bookingCode, slipRisk } = body

  // Create user analysis record
  const userAnalysis = await prismaClient.userAnalysis.create({
    data: {
      userId,
      title: bookingCode ? `Analysis for ${bookingCode}` : `Manual Analysis - ${new Date().toLocaleDateString()}`,
      bookingCode: bookingCode || null,
      isGuest: false, // This is now a saved user analysis
      analysisData: JSON.stringify({
        matches,
        analyses,
        slipRisk,
        createdAt: new Date().toISOString()
      }),
      slipRisk: slipRisk ? JSON.stringify(slipRisk) : null,
    }
  })

  // Save individual matches
  const savedMatches = await Promise.all(
    matches.map((match, index) => {
      const analysis = analyses[index]
      return prismaClient.userAnalysisMatch.create({
        data: {
          userAnalysisId: userAnalysis.id,
          homeTeam: match.homeTeam,
          awayTeam: match.awayTeam,
          market: match.market,
          selection: match.selection,
          odds: match.odds,
          probabilityRange: JSON.stringify(analysis.probability_range),
          riskLevel: analysis.risk_level,
          explanation: analysis.explanation,
          cautionNote: analysis.caution_note,
        }
      })
    })
  )

  return {
    id: userAnalysis.id,
    title: userAnalysis.title,
    bookingCode: userAnalysis.bookingCode,
    createdAt: userAnalysis.createdAt,
    matches: savedMatches,
    slipRisk: slipRisk || null
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest } from '@/lib/middleware'
import { CommunityIntelligenceService } from '@/lib/community-intelligence'

export async function GET(
  request: NextRequest,
  { params }: { params: { matchId: string } }
) {
  try {
    const user = await authenticateRequest(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const matchId = params.matchId

    // Fetch community predictions for this match
    const predictions = await prisma.matchCommunityPrediction.findMany({
      where: { matchId },
      include: {
        User: {
          select: {
            id: true,
            name: true,
            email: true,
            userProfile: {
              select: {
                reputationScore: true,
                accuracyRate: true,
                riskFlag: true,
                correctPredictions: true,
                totalPredictions: true,
                communityScore: true,
                consensusAccuracy: true,
                contributionCount: true,
                topPredictorCount: true
              }
            }
          }
        }
      },
      orderBy: [
        { createdAt: 'desc' }
      ]
    })

    return NextResponse.json({
      success: true,
      data: { predictions }
    })

  } catch (error: any) {
    console.error('Predictions fetch error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch predictions' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { matchId: string } }
) {
  try {
    const user = await authenticateRequest(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const matchId = params.matchId
    const body = await request.json()
    const { market, prediction, confidence, explanation, confidenceNote } = body

    if (!market || !prediction || !confidence || !explanation) {
      return NextResponse.json(
        { error: 'All fields are required: market, prediction, confidence, explanation' },
        { status: 400 }
      )
    }

    if (confidence < 1 || confidence > 5) {
      return NextResponse.json(
        { error: 'Confidence must be between 1 and 5' },
        { status: 400 }
      )
    }

    // Detect spam
    const spamDetection = await CommunityIntelligenceService.detectSpamPrediction(
      user.userId,
      matchId,
      market,
      prediction,
      explanation
    )

    if (spamDetection.isSpam) {
      return NextResponse.json(
        { error: 'Prediction flagged as spam. Please provide more detailed reasoning.' },
        { status: 400 }
      )
    }

    // Check if user already made a prediction for this match
    const existingPrediction = await prisma.matchCommunityPrediction.findFirst({
      where: {
        matchId,
        userId: user.userId,
      }
    })

    if (existingPrediction) {
      return NextResponse.json(
        { error: 'You have already made a prediction for this market' },
        { status: 400 }
      )
    }

    // Get user's influence weight
    const userProfile = await prisma.userProfile.findUnique({
      where: { userId: user.userId }
    })

    const influenceWeight = 0.5 // Default influence weight

    // Create new prediction
    const newPrediction = await prisma.matchCommunityPrediction.create({
      data: {
        matchId,
        userId: user.userId,
        homeTeam: 'Unknown', // TODO: Get from match data
        awayTeam: 'Unknown', // TODO: Get from match data
        prediction,
        confidence,
        reasoning: explanation,
      },
      include: {
        User: {
          select: {
            id: true,
            name: true,
            email: true,
            userProfile: {
              select: {
                reputationScore: true,
                accuracyRate: true,
                riskFlag: true,
                correctPredictions: true,
                totalPredictions: true,
                communityScore: true,
                consensusAccuracy: true,
                contributionCount: true,
                topPredictorCount: true
              }
            }
          }
        }
      }
    })

    // Update user's reputation score
    await updateUserReputation(user.userId)

    // Recalculate community intelligence for this match and market
    await CommunityIntelligenceService.calculateCommunityIntelligence(matchId, market)

    return NextResponse.json({
      success: true,
      data: { prediction: newPrediction }
    })

  } catch (error: any) {
    console.error('Prediction creation error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create prediction' },
      { status: 500 }
    )
  }
}

async function updateUserReputation(userId: string) {
  try {
    // Update user's total predictions count
    const totalPredictions = await prisma.matchCommunityPrediction.count({
      where: { userId }
    })

    await prisma.userProfile.update({
      where: { userId },
      data: {
        totalPredictions
      }
    })

    // Update trust score based on accuracy
    await CommunityIntelligenceService.updateUserTrustScore(userId)
  } catch (error) {
    console.error('Failed to update user reputation:', error)
  }
}

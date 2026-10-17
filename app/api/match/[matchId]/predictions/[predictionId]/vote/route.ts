import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest } from '@/lib/middleware'

export async function POST(
  request: NextRequest,
  { params }: { params: { matchId: string; predictionId: string } }
) {
  try {
    const user = await authenticateRequest(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { matchId, predictionId } = params
    const body = await request.json()
    const { voteType } = body

    if (!['up', 'down'].includes(voteType)) {
      return NextResponse.json(
        { error: 'Invalid vote type. Must be "up" or "down"' },
        { status: 400 }
      )
    }

    // Check if prediction exists
    const prediction = await prisma.matchCommunityPrediction.findFirst({
      where: {
        id: predictionId,
        matchId
      }
    })

    if (!prediction) {
      return NextResponse.json(
        { error: 'Prediction not found' },
        { status: 404 }
      )
    }

    // Note: Voting functionality not implemented yet - MatchCommunityPrediction model doesn't have upvotes/downvotes
    return NextResponse.json({
      success: false,
      error: 'Voting functionality not yet implemented'
    }, { status: 501 })

  } catch (error: any) {
    console.error('Vote error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to vote' },
      { status: 500 }
    )
  }
}

// Note: updateUserReputationFromVotes function not implemented since voting fields don't exist
async function updateUserReputationFromVotes(userId: string) {
  // Placeholder - voting functionality not implemented yet
  console.log('Voting reputation update not implemented for user:', userId)
}

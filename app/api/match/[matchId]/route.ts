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

    // Fetch match details
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        matchCommunityPredictions: {
          include: {
            User: {
              include: {
                userProfile: true
              }
            }
          }
        }
      }
    })

    if (!match) {
      return NextResponse.json(
        { error: 'Match not found' },
        { status: 404 }
      )
    }

    // Check if AI analysis needs to be run
    if (!match.aiAnalysis || !match.aiAnalysisAt) {
      try {
        // Run AI analysis (this would integrate with existing AI logic)
        const aiAnalysis = await runAIAnalysis(match)
        
        // Fuse with community intelligence
        const fusedAnalysis = await CommunityIntelligenceService.fuseAIWithCommunityIntelligence(
          matchId,
          aiAnalysis,
          '1X2' // Default market, can be expanded
        )
        
        // Cache the results
        await prisma.match.update({
          where: { id: matchId },
          data: {
            aiAnalysis: JSON.stringify(fusedAnalysis),
            aiAnalysisAt: new Date()
          }
        })
        
        match.aiAnalysis = JSON.stringify(fusedAnalysis)
        match.aiAnalysisAt = new Date()
      } catch (error) {
        console.error('AI Analysis failed:', error)
        // Don't fail the request if AI analysis fails
      }
    }

    // Calculate community intelligence for all markets
    const markets = ['1X2', 'Over/Under 2.5', 'Both Teams To Score']
    const communityIntelligence: { [key: string]: any } = {}
    
    for (const market of markets) {
      try {
        communityIntelligence[market] = await CommunityIntelligenceService.calculateCommunityIntelligence(
          matchId,
          market
        )
      } catch (error) {
        console.error(`Failed to calculate community intelligence for ${market}:`, error)
        communityIntelligence[market] = null
      }
    }

    return NextResponse.json({
      success: true,
      data: { 
        match,
        communityIntelligence
      }
    })

  } catch (error: any) {
    console.error('Match fetch error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch match' },
      { status: 500 }
    )
  }
}

async function runAIAnalysis(match: any) {
  // This would integrate with the existing AI analysis logic
  // For now, return a mock structure that matches the expected format
  return {
    matchId: match.id,
    homeTeam: match.homeTeam,
    awayTeam: match.awayTeam,
    league: match.league,
    kickoffTime: match.kickoffTime,
    explanation: `Based on recent form and historical data, this match between ${match.homeTeam} and ${match.awayTeam} presents interesting betting opportunities. Both teams have shown consistent performance in the ${match.league}.`,
    probabilities: {
      '1x2': {
        'Home': 0.45,
        'Draw': 0.25,
        'Away': 0.30
      },
      'over-under': {
        'Over 2.5': 0.60,
        'Under 2.5': 0.40
      },
      'btts': {
        'Yes': 0.65,
        'No': 0.35
      },
      'corners': {
        'Over 8.5': 0.55,
        'Under 8.5': 0.45
      },
      'cards': {
        'Over 3.5': 0.50,
        'Under 3.5': 0.50
      }
    },
    riskLevel: 'medium',
    confidence: 0.75,
    generatedAt: new Date().toISOString()
  }
}

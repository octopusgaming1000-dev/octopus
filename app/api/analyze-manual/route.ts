import { NextRequest, NextResponse } from 'next/server'
import { analyzeBookingCode } from '@/analysis/engine'
import { matchFixture, matchSelection } from '@/lib/fixture-matcher'
import { prisma } from '@/lib/prisma'
import { authenticateRequest } from '@/lib/middleware'
import { updateConsensus } from '@/lib/consensus'
import { generateAlternativeMarkets } from '@/lib/alternative-markets'

interface ManualGame {
  homeTeam: string
  awayTeam: string
  market: string
  selection: string
  odds: number
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { games, bookingCode } = body

    if (!games || !Array.isArray(games) || games.length === 0) {
      return NextResponse.json(
        { error: 'Games are required' },
        { status: 400 }
      )
    }

    // Validate each game
    for (const game of games) {
      if (!game.homeTeam || !game.awayTeam || !game.market || !game.selection || !game.odds) {
        return NextResponse.json(
          { error: 'Each game must have homeTeam, awayTeam, market, selection, and odds' },
          { status: 400 }
        )
      }
    }

    // Get user if authenticated
    const user = await authenticateRequest(request)

    // Create manual booking code record
    const bookingCodeRecord = user ? await prisma.bookingCode.create({
      data: {
        code: bookingCode || 'MANUAL',
        userId: user.userId,
      },
    }) : null

    // Process each game through analysis engine
    const selections = []
    
    for (let i = 0; i < games.length; i++) {
      const game = games[i]
      
      // Create fixture-like structure
      const fixture = {
        homeTeam: game.homeTeam,
        awayTeam: game.awayTeam,
        competition: 'Manual Selection',
        matchDate: new Date().toISOString(),
        status: 'scheduled',
      }

      // Create a proper DecodedSelection object for matchFixture
      const decodedSelection = {
        fixture: fixture,
        market: game.market,
        selection: game.selection,
        odds: game.odds,
        metadata: {
          source: 'manual',
          gameId: i
        }
      }

      // Match with existing fixtures (if any)
      const matchedFixture = await matchFixture(decodedSelection)
      const finalFixture = matchedFixture || fixture

      // Match with existing selections (if any)
      const matchedSelection = await matchSelection(
        finalFixture.id || `manual-fixture-${i}`, 
        game.market, 
        game.selection, 
        game.odds,
        { source: 'manual', gameId: i }
      )
      const finalSelection = matchedSelection || {
        id: `manual-selection-${i}`,
        fixtureId: finalFixture.id || `manual-fixture-${i}`,
        market: game.market,
        selection: game.selection,
        odds: game.odds,
        metadata: { source: 'manual', gameId: i }
      }

      // Run analysis - analyzeBookingCode expects an array of DecodedSelection
      const analysisResults = await analyzeBookingCode([decodedSelection])
      const analysis = analysisResults[0] // Get the first (and only) analysis result

      // Update consensus
      const consensus = await updateConsensus(finalSelection.id)

      // Generate alternative markets
      const alternativeMarkets = generateAlternativeMarkets(
        finalFixture,
        game.market,
        game.selection,
        game.odds
      )

      // Create final selection object
      const finalSelectionData = {
        id: `manual-${bookingCodeRecord?.id || 'unknown'}-${i}`,
        fixture: finalFixture,
        market: game.market,
        selection: game.selection,
        odds: game.odds,
        analysis,
        consensus,
        alternativeMarkets,
        metadata: {
          source: 'manual',
          decodedAt: new Date().toISOString(),
          note: 'Manually selected games',
        },
      }

      selections.push(finalSelectionData)
    }

    return NextResponse.json({
      success: true,
      data: {
        bookingCode: bookingCodeRecord ? {
          id: bookingCodeRecord.id,
          code: bookingCodeRecord.code,
        } : null,
        selections,
        manualSelection: false,
      },
    })

  } catch (error) {
    console.error('Manual analysis error:', error)
    return NextResponse.json(
      { error: 'Failed to analyze manual selections' },
      { status: 500 }
    )
  }
}

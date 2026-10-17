import { NextRequest, NextResponse } from 'next/server'
import { decoderRegistry } from '@/decoders'
import { analyzeBookingCode } from '@/analysis/engine'
import { matchFixture, matchSelection } from '@/lib/fixture-matcher'
import { prisma } from '@/lib/prisma'
import { authenticateRequest } from '@/lib/middleware'
import { updateConsensus } from '@/lib/consensus'
import { generateAlternativeMarkets } from '@/lib/alternative-markets'
import { BookingSlipProvider, ProviderFactory } from '@/lib/booking-slip-provider'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { code, manualMatches, isManualInput } = body

    // Handle manual input case
    if (isManualInput && manualMatches) {
      if (!Array.isArray(manualMatches) || manualMatches.length === 0) {
        return NextResponse.json(
          { error: 'At least one match is required' },
          { status: 400 }
        )
      }

      // Validate manual matches format
      for (const match of manualMatches) {
        if (!match.homeTeam || !match.awayTeam) {
          return NextResponse.json(
            { error: 'Each match must have homeTeam and awayTeam' },
            { status: 400 }
          )
        }
      }

      // Get user if authenticated (optional for guest usage)
      const user = await authenticateRequest(request)
      const isGuest = !user

      // Create mock decoded structure for manual matches
      const mockDecoded = {
        code: `manual_${Date.now()}`,
        bookmaker: 'Manual Input',
        selections: manualMatches.map((match, index) => ({
          id: `manual_${index}`,
          fixture: {
            homeTeam: match.homeTeam,
            awayTeam: match.awayTeam,
            competition: 'Manual Entry',
            matchDate: new Date().toISOString()
          },
          market: '1X2', // Default market
          selection: 'Home', // Default selection
          odds: 2.0, // Default odds
          metadata: {
            source: 'manual_input',
            originalText: match.text
          }
        }))
      }

      // Match fixtures and create selections
      const selections: any[] = []
      for (const decodedSelection of mockDecoded.selections) {
        const fixture = await matchFixture(decodedSelection)
        const selection = await matchSelection(
          fixture.id,
          decodedSelection.market,
          decodedSelection.selection,
          decodedSelection.odds,
          decodedSelection.metadata
        )
        selections.push(selection)
      }

      // Perform analysis (without consensus data for manual input)
      const analyses = await analyzeBookingCode(mockDecoded.selections, new Map())

      // Generate response for manual input
      return NextResponse.json({
        success: true,
        data: {
          bookingCode: null,
          isGuest,
          guestMessage: isGuest ? "Results are temporary. Sign up to save your analysis." : null,
          selections: selections.map((selection, index) => {
            const decodedSelection = mockDecoded.selections[index]
            const alternativeMarkets = generateAlternativeMarkets(
              {
                homeTeam: decodedSelection.fixture.homeTeam,
                awayTeam: decodedSelection.fixture.awayTeam,
                competition: decodedSelection.fixture.competition,
              },
              selection.market,
              selection.selection,
              selection.odds
            )

            return {
              id: selection.id,
              fixture: {
                homeTeam: decodedSelection.fixture.homeTeam,
                awayTeam: decodedSelection.fixture.awayTeam,
                competition: decodedSelection.fixture.competition,
                matchDate: decodedSelection.fixture.matchDate,
              },
              market: selection.market,
              selection: selection.selection,
              odds: selection.odds,
              analysis: analyses[index],
              consensus: null, // No consensus for manual input
              alternativeMarkets,
              metadata: decodedSelection.metadata,
            }
          }),
        },
      })
    }

    // Original booking code logic
    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { error: 'Booking code is required' },
        { status: 400 }
      )
    }

    // Get booking slip provider
    const provider = ProviderFactory.getProvider()
    
    // Try to get games from booking code using provider
    let decoded = await provider.getGamesFromCode(code.trim())
    
    // If provider returns null, fall back to decoder registry
    if (!decoded) {
      console.log('Provider returned null, falling back to decoder registry')
      const fallbackDecoded = await decoderRegistry.autoDecode(code.trim())
      decoded = fallbackDecoded
    }

    // Check if we need manual selection (when both provider and decoder fail)
    let needsManualSelection = false
    if (!decoded) {
      console.log('No data available, requesting manual selection')
      needsManualSelection = true
      return NextResponse.json({
        success: true,
        data: {
          bookingCode: null,
          selections: [],
          manualSelection: true,
          message: 'Please select your games manually'
        }
      })
    }

    // Get user if authenticated (optional for guest usage)
    const user = await authenticateRequest(request)
    const isGuest = !user

    // Save booking code to database only for authenticated users
    let bookingCode: any = null
    if (!isGuest && user) {
      bookingCode = await prisma.bookingCode.create({
        data: {
          code: decoded.code,
          userId: user.userId,
        },
      })
    }

    // Match fixtures and create selections
    const selections: any[] = []
    for (const decodedSelection of decoded.selections) {
      const fixture = await matchFixture(decodedSelection)
      const selection = await matchSelection(
        fixture.id,
        decodedSelection.market,
        decodedSelection.selection,
        decodedSelection.odds,
        decodedSelection.metadata
      )
      selections.push(selection)
    }

    // Get consensus data for crowd adjustments (before analysis) - only for authenticated users
    const consensusDataMap = new Map()
    // Note: consensusData model not implemented yet, skipping for now

    // Perform analysis with crowd data
    const analyses = await analyzeBookingCode(decoded.selections, consensusDataMap)

    // Save analyses to database only for authenticated users
    let savedAnalyses: any[] = []
    if (!isGuest && bookingCode && user) {
      savedAnalyses = await Promise.all(
        analyses.map((analysis, index) =>
          prisma.analysis.create({
            data: {
              userId: user.userId,
              matchId: selections[index]?.fixtureId || 'unknown',
              homeTeam: selections[index]?.fixture?.homeTeam || 'Unknown',
              awayTeam: selections[index]?.fixture?.awayTeam || 'Unknown',
              league: selections[index]?.fixture?.league || 'Unknown',
              prediction: JSON.stringify(analysis),
              confidence: 3,
              reasoning: 'AI analysis completed',
            },
          })
        )
      )
    }

    // Update consensus data only for authenticated users
    if (!isGuest) {
      for (const selection of selections) {
        await updateConsensus(selection.id)
      }
    }

    // Get consensus data for each selection - only for authenticated users
    let consensusData: any[] = []
    // Note: consensusData model not implemented yet, skipping for now

    return NextResponse.json({
      success: true,
      data: {
        bookingCode: bookingCode ? {
          id: bookingCode.id,
          code: bookingCode.code,
        } : null,
        isGuest,
        guestMessage: isGuest ? "Results are temporary. Sign up to save your analysis." : null,
        selections: selections.map((selection, index) => {
          const decodedSelection = decoded.selections[index]
          const alternativeMarkets = generateAlternativeMarkets(
            {
              homeTeam: decodedSelection.fixture.homeTeam,
              awayTeam: decodedSelection.fixture.awayTeam,
              competition: decodedSelection.fixture.competition,
            },
            selection.market,
            selection.selection,
            selection.odds
          )

          return {
            id: selection.id,
            fixture: {
              homeTeam: decodedSelection.fixture.homeTeam,
              awayTeam: decodedSelection.fixture.awayTeam,
              competition: decodedSelection.fixture.competition,
              matchDate: decodedSelection.fixture.matchDate,
            },
            market: selection.market,
            selection: selection.selection,
            odds: selection.odds,
            analysis: analyses[index],
            consensus: consensusData[index]
              ? {
                  percentage: consensusData[index]!.percentage,
                  summary: consensusData[index]!.summary,
                }
              : null,
            alternativeMarkets,
            metadata: decoded.metadata,
          }
        }),
      },
    })
  } catch (error: any) {
    console.error('Analysis error:', error)
    
    // Handle database connection errors gracefully
    if (error.message?.includes('DATABASE_URL') || error.message?.includes('Environment variable not found') || error.message?.includes('Unable to open the database file')) {
      return NextResponse.json(
        { error: 'Database is not configured. Please set up your database connection.' },
        { status: 503 }
      )
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to analyze booking code' },
      { status: 500 }
    )
  }
}


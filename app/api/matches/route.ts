import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/database'
import { authenticateRequest } from '@/lib/middleware'
import { CacheService, CACHE_TTL } from '@/lib/redis'
import { applyRateLimit, rateLimiters, getClientIdentifier } from '@/lib/rate-limiter'

export async function GET(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResult = await applyRateLimit(request, rateLimiters.api)
    if (!rateLimitResult.allowed) {
      return rateLimitResult.response!
    }

    // Check if user is authenticated (matches page is for logged-in users only)
    const user = await authenticateRequest(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get query parameters for filtering
    const { searchParams } = new URL(request.url)
    const league = searchParams.get('league') // Legacy text-based filter
    const leagueId = searchParams.get('league_id') // New structured filter
    const season = searchParams.get('season')
    const date = searchParams.get('date')
    const team = searchParams.get('team')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Create cache key
    const cacheKey = `matches:${leagueId || league}:${season || ''}:${date || ''}:${team || ''}:${limit}:${offset}`
    
    // Try to get from cache first
    const cached = await CacheService.get(cacheKey)
    if (cached) {
      return NextResponse.json({
        success: true,
        data: cached,
        cached: true
      })
    }

    // Build where clause
    const where: any = {
      status: 'scheduled' // Only show upcoming matches
    }

    // Priority to league_id filtering if provided
    if (leagueId) {
      // Filter by competition ID (preferred method)
      where.competitionId = leagueId
    } else if (league) {
      // Legacy text-based filtering (fallback)
      where.league = {
        contains: league,
        mode: 'insensitive'
      }
    }

    if (date) {
      const startDate = new Date(date)
      const endDate = new Date(date)
      endDate.setDate(endDate.getDate() + 1)
      
      where.kickoffTime = {
        gte: startDate,
        lt: endDate
      }
    } else {
      // Default to showing all scheduled matches (remove date restriction)
      // This ensures sample data is visible regardless of current date
      // In production, you might want to add a date range filter
    }

    if (team) {
      where.OR = [
        {
          homeTeam: {
            contains: team,
            mode: 'insensitive'
          }
        },
        {
          awayTeam: {
            contains: team,
            mode: 'insensitive'
          }
        }
      ]
    }

    // Fetch matches with competition information
    const matches = await prisma.match.findMany({
      where,
      orderBy: [
        { kickoffTime: 'asc' }, // Chronological order
        { league: 'asc' }
      ],
      take: limit,
      skip: offset,
      select: {
        id: true,
        homeTeam: true,
        awayTeam: true,
        league: true,
        kickoffTime: true,
        venue: true,
        weather: true,
        status: true,
        source: true,
        aiAnalysisAt: true,
        competition: {
          select: {
            id: true,
            name: true,
            displayName: true,
            country: true,
            leagueApiId: true,
            currentSeason: true,
            logo: true,
            isPopular: true,
            popularityScore: true
          }
        }
      }
    })

    // Sort client-side by competition popularity if needed
    if (leagueId) {
      matches.sort((a, b) => {
        // First by competition popularity (popular competitions first)
        const aPopular = a.competition?.isPopular ? 1 : 0
        const bPopular = b.competition?.isPopular ? 1 : 0
        if (bPopular !== aPopular) {
          return bPopular - aPopular
        }
        
        // Then by popularity score
        const aScore = a.competition?.popularityScore || 0
        const bScore = b.competition?.popularityScore || 0
        if (bScore !== aScore) {
          return bScore - aScore
        }
        
        // Finally by kickoff time
        return new Date(a.kickoffTime).getTime() - new Date(b.kickoffTime).getTime()
      })
    }

    // Get total count for pagination
    const total = await prisma.match.count({ where })

    // Handle empty results with specific error message
    if (matches.length === 0) {
      let errorMessage = 'No scheduled matches found'
      
      if (leagueId) {
        errorMessage = 'No scheduled matches for this competition on selected date.'
      } else if (league) {
        errorMessage = 'No scheduled matches for this league on selected date.'
      } else if (date) {
        errorMessage = 'No scheduled matches found for the selected date.'
      }

      return NextResponse.json({
        success: true,
        data: {
          matches: [],
          pagination: {
            total: 0,
            limit,
            offset,
            hasMore: false
          },
          message: errorMessage
        }
      })
    }

    const responseData = {
      matches,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    }

    // Cache the response
    await cacheMatchData(cacheKey, responseData)

    return NextResponse.json({
      success: true,
      data: responseData
    })

  } catch (error: any) {
    console.error('Matches fetch error:', error)
    
    // Handle specific database errors
    if (error.message?.includes('DATABASE_URL') || error.message?.includes('Environment variable not found')) {
      return NextResponse.json(
        { error: 'Match data temporarily unavailable.' },
        { status: 503 }
      )
    }
    
    // Handle network/connection errors
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return NextResponse.json(
        { error: 'Match data temporarily unavailable.' },
        { status: 503 }
      )
    }
    
    return NextResponse.json(
      { error: error.message || 'Match data temporarily unavailable.' },
      { status: 500 }
    )
  }
}

// Helper function to cache match data
async function cacheMatchData(cacheKey: string, data: any): Promise<void> {
  try {
    await CacheService.set(cacheKey, data, CACHE_TTL.MATCHES)
  } catch (error) {
    console.error('Failed to cache match data:', error)
  }
}

// POST endpoint for creating new matches (admin functionality)
export async function POST(request: NextRequest) {
  try {
    const user = await authenticateRequest(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { homeTeam, awayTeam, league, kickoffTime, venue, weather } = body

    if (!homeTeam || !awayTeam || !league || !kickoffTime) {
      return NextResponse.json(
        { error: 'homeTeam, awayTeam, league, and kickoffTime are required' },
        { status: 400 }
      )
    }

    const match = await prisma.match.create({
      data: {
        homeTeam,
        awayTeam,
        league,
        kickoffTime: new Date(kickoffTime),
        venue,
        weather
      }
    })

    return NextResponse.json({
      success: true,
      data: match
    })

  } catch (error: any) {
    console.error('Match creation error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create match' },
      { status: 500 }
    )
  }
}

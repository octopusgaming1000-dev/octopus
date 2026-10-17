import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const country = searchParams.get('country')
    const search = searchParams.get('q')
    const popular = searchParams.get('popular')

    switch (action) {
      case 'search':
        // Search competitions by name
        if (!search) {
          return NextResponse.json(
            { error: 'Search query parameter "q" is required' },
            { status: 400 }
          )
        }

        const searchResults = await prisma.competition.findMany({
          where: {
            AND: [
              { isActive: true },
              {
                OR: [
                  { name: { contains: search, mode: 'insensitive' } },
                  { displayName: { contains: search, mode: 'insensitive' } }
                ]
              }
            ]
          },
          select: {
            id: true,
            name: true,
            displayName: true,
            country: true,
            leagueApiId: true,
            currentSeason: true
          },
          orderBy: [
            { isPopular: 'desc' },
            { popularityScore: 'desc' },
            { displayName: 'asc' }
          ],
          take: 20
        })

        return NextResponse.json({
          success: true,
          data: searchResults
        })

      case 'popular':
        // Get popular competitions
        const popularCompetitions = await prisma.competition.findMany({
          where: {
            AND: [
              { isActive: true },
              { isPopular: true }
            ]
          },
          select: {
            id: true,
            name: true,
            displayName: true,
            country: true,
            leagueApiId: true,
            currentSeason: true,
            popularityScore: true,
            logo: true
          },
          orderBy: [
            { popularityScore: 'desc' },
            { displayName: 'asc' }
          ]
        })

        return NextResponse.json({
          success: true,
          data: popularCompetitions
        })

      default:
        // Get all competitions with optional country filter
        const where: any = { isActive: true }

        if (country) {
          where.country = {
            contains: country,
            mode: 'insensitive'
          }
        }

        if (popular === 'true') {
          where.isPopular = true
        }

        const competitions = await prisma.competition.findMany({
          where,
          select: {
            id: true,
            name: true,
            displayName: true,
            country: true,
            leagueApiId: true,
            currentSeason: true,
            isPopular: true,
            popularityScore: true,
            logo: true
          },
          orderBy: [
            { isPopular: 'desc' },
            { popularityScore: 'desc' },
            { country: 'asc' },
            { displayName: 'asc' }
          ]
        })

        return NextResponse.json({
          success: true,
          data: competitions
        })
    }

  } catch (error: any) {
    console.error('Competitions API error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch competitions' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'create':
        const { name, displayName, country, leagueApiId, currentSeason, isPopular, popularityScore } = body

        if (!name || !displayName) {
          return NextResponse.json(
            { error: 'Name and display name are required' },
            { status: 400 }
          )
        }

        // Check if competition already exists
        const existingCompetition = await prisma.competition.findFirst({
          where: {
            OR: [
              { name },
              { leagueApiId }
            ]
          }
        })

        if (existingCompetition) {
          return NextResponse.json(
            { error: 'Competition with this name or API ID already exists' },
            { status: 409 }
          )
        }

        const competition = await prisma.competition.create({
          data: {
            name,
            displayName,
            country,
            leagueApiId,
            currentSeason,
            isPopular: isPopular || false,
            popularityScore: popularityScore || 0
          }
        })

        return NextResponse.json({
          success: true,
          data: competition
        })

      case 'bulk-create':
        const { competitions } = body

        if (!Array.isArray(competitions)) {
          return NextResponse.json(
            { error: 'Competitions must be an array' },
            { status: 400 }
          )
        }

        const createdCompetitions = await Promise.all(
          competitions.map(async (comp: any) => {
            const existing = await prisma.competition.findFirst({
              where: {
                OR: [
                  { name: comp.name },
                  { leagueApiId: comp.leagueApiId }
                ]
              }
            })

            if (existing) {
              return existing
            }

            return prisma.competition.create({
              data: {
                name: comp.name,
                displayName: comp.displayName,
                country: comp.country,
                leagueApiId: comp.leagueApiId,
                currentSeason: comp.currentSeason,
                isPopular: comp.isPopular || false,
                popularityScore: comp.popularityScore || 0
              }
            })
          })
        )

        return NextResponse.json({
          success: true,
          data: createdCompetitions
        })

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }

  } catch (error: any) {
    console.error('Competitions POST error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to process competitions' },
      { status: 500 }
    )
  }
}

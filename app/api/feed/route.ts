import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken, JWTPayload } from '@/lib/auth'

interface FeedItem {
  id: string
  userId?: string
  type: string
  title: string
  description?: string
  metadata?: string
  relevanceScore: number
  isActive: boolean
  createdAt: string
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    // Authentication
    const user = await authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    switch (action) {
      case 'personalized':
        const feedItems = await generatePersonalizedFeed(user.userId, page, limit)
        
        return NextResponse.json({
          success: true,
          data: {
            feed: feedItems,
            hasMore: feedItems.length === limit
          }
        })

      case 'global':
        const globalFeed = await generateGlobalFeed(page, limit)
        
        return NextResponse.json({
          success: true,
          data: {
            feed: globalFeed,
            hasMore: globalFeed.length === limit
          }
        })

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Feed GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    // Authentication
    const user = await authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    switch (action) {
      case 'create-feed-item':
        const { type, title, description, metadata } = body

        if (!type || !title) {
          return NextResponse.json(
            { error: 'Type and title required' },
            { status: 400 }
          )
        }

        const relevanceScore = calculateRelevanceScore(type, user.userId, metadata)

        const feedItem = await prisma.$queryRaw<any[]>`
          INSERT INTO feed_items (id, userId, type, title, description, metadata, relevanceScore)
          VALUES (
            'feed_' || hex(randomblob(9)), 
            ${user.userId}, ${type}, ${title}, ${description}, ${metadata || null}, ${relevanceScore}
          )
          RETURNING *
        `

        return NextResponse.json({
          success: true,
          data: { feedItem: feedItem[0] }
        })

      case 'mark-interaction':
        const { feedItemId, interactionType } = body

        if (!feedItemId || !interactionType) {
          return NextResponse.json(
            { error: 'Feed item ID and interaction type required' },
            { status: 400 }
          )
        }

        // Update relevance score based on interaction
        const scoreBoost = interactionType === 'like' ? 0.1 : interactionType === 'share' ? 0.2 : 0.05

        await prisma.$queryRaw`
          UPDATE feed_items 
          SET relevanceScore = relevanceScore + ${scoreBoost}
          WHERE id = ${feedItemId}
        `

        return NextResponse.json({
          success: true,
          message: 'Interaction recorded'
        })

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Feed POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Helper functions
async function authenticateRequest(request: NextRequest): Promise<JWTPayload | null> {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.substring(7)
  return verifyToken(token)
}

async function generatePersonalizedFeed(userId: string, page: number, limit: number): Promise<FeedItem[]> {
  const offset = (page - 1) * limit

  // Get user's predicted matches
  const predictedMatches = await prisma.$queryRaw<any[]>`
    SELECT 
      m.id, m.homeTeam, m.awayTeam, m.league, m.kickoffTime, m.status,
      'match' as type,
      m.homeTeam || ' vs ' || m.awayTeam as title,
      'Match you predicted' || ' - ' || m.homeTeam || ' vs ' || m.awayTeam as description,
      json_extract(m, '$') as metadata,
      0.8 as relevanceScore
    FROM matches m
    INNER JOIN predictions p ON m.id = p.matchId
    WHERE p.userId = ${userId}
    ORDER BY m.kickoffTime DESC
    LIMIT ${limit} OFFSET ${offset}
  `

  // Get user's favorite competitions
  const favoriteCompetitions = await prisma.$queryRaw<any[]>`
    SELECT 
      m.id, m.homeTeam, m.awayTeam, m.league, m.kickoffTime, m.status,
      c.name as competitionName,
      'match' as type,
      m.homeTeam || ' vs ' || m.awayTeam as title,
      c.name || ' - ' || m.homeTeam || ' vs ' || m.awayTeam as description,
      json_extract(m, '$') as metadata,
      0.6 as relevanceScore
    FROM matches m
    LEFT JOIN competitions c ON m.competitionId = c.id
    WHERE c.isActive = 1 AND m.kickoffTime > datetime('now')
    ORDER BY m.kickoffTime ASC
    LIMIT 10 OFFSET ${offset}
  `

  // Get trending matches (most predictions)
  const trendingMatches = await prisma.$queryRaw<any[]>`
    SELECT 
      m.id, m.homeTeam, m.awayTeam, m.league, m.kickoffTime, m.status,
      COUNT(p.id) as predictionCount,
      'match' as type,
      m.homeTeam || ' vs ' || m.awayTeam as title,
      '🔥 Trending: ' || COUNT(p.id) || ' predictions' as description,
      json_extract(m, '$') as metadata,
      CAST(COUNT(p.id) AS FLOAT) * 0.1 as relevanceScore
    FROM matches m
    LEFT JOIN predictions p ON m.id = p.matchId
    WHERE m.kickoffTime > datetime('now') AND m.status = 'scheduled'
    GROUP BY m.id
    HAVING COUNT(p.id) >= 5
    ORDER BY predictionCount DESC
    LIMIT 5
  `

  // Get high confidence AI matches
  const highConfidenceAIMatches = await prisma.$queryRaw<any[]>`
    SELECT 
      m.id, m.homeTeam, m.awayTeam, m.league, m.kickoffTime, m.status,
      m.aiAnalysis,
      'ai_alert' as type,
      '🤖 AI Confidence Spike' as title,
      'AI analysis shows high confidence for ' || m.homeTeam || ' vs ' || m.awayTeam as description,
      json_extract(m, '$') as metadata,
      0.9 as relevanceScore
    FROM matches m
    WHERE m.aiAnalysis IS NOT NULL 
      AND m.kickoffTime > datetime('now') 
      AND m.status = 'scheduled'
    ORDER BY m.kickoffTime ASC
    LIMIT 3
  `

  // Get community activity (discussions and predictions)
  const communityActivity = await prisma.$queryRaw<any[]>`
    SELECT 
      cm.id, cm.message, cm.createdAt,
      u.name as userName,
      'community' as type,
      '💬 ' || LEFT(u.name, 10) || '...' as title,
      LEFT(cm.message, 50) || '...' as description,
      json_extract('{"type": "community", "userId": "' || u.id || '", "message": "' || LEFT(cm.message, 30) || '"}') as metadata,
      0.4 as relevanceScore
    FROM chat_messages cm
    LEFT JOIN users u ON cm.userId = u.id
    LEFT JOIN chat_rooms cr ON cm.roomId = cr.id
    WHERE cm.createdAt > datetime('now', '-7 days')
      AND cm.isDeleted = 0
      AND cr.type IN ('match', 'competition')
    ORDER BY cm.createdAt DESC
    LIMIT 5
  `

  // Combine and sort all feed items
  const allItems = [
    ...predictedMatches,
    ...favoriteCompetitions,
    ...trendingMatches,
    ...highConfidenceAIMatches,
    ...communityActivity
  ]

  // Sort by relevance score and recency
  allItems.sort((a, b) => {
    const scoreA = calculateFinalRelevanceScore(a.relevanceScore, a.createdAt)
    const scoreB = calculateFinalRelevanceScore(b.relevanceScore, b.createdAt)
    return scoreB - scoreA
  })

  return allItems.slice(0, limit)
}

async function generateGlobalFeed(page: number, limit: number): Promise<FeedItem[]> {
  const offset = (page - 1) * limit

  // Get all trending matches
  const trendingMatches = await prisma.$queryRaw<any[]>`
    SELECT 
      m.id, m.homeTeam, m.awayTeam, m.league, m.kickoffTime, m.status,
      COUNT(p.id) as predictionCount,
      'match' as type,
      m.homeTeam || ' vs ' || m.awayTeam as title,
      '🔥 Trending: ' || COUNT(p.id) || ' predictions' as description,
      json_extract(m, '$') as metadata,
      CAST(COUNT(p.id) AS FLOAT) * 0.1 as relevanceScore
    FROM matches m
    LEFT JOIN predictions p ON m.id = p.matchId
    WHERE m.kickoffTime > datetime('now') AND m.status = 'scheduled'
    GROUP BY m.id
    HAVING COUNT(p.id) >= 3
    ORDER BY predictionCount DESC, m.kickoffTime ASC
    LIMIT ${limit} OFFSET ${offset}
  `

  // Get active competitions
  const activeCompetitions = await prisma.$queryRaw<any[]>`
    SELECT 
      c.id, c.name, c.displayName, c.country, c.isActive,
      'competition' as type,
      c.displayName as title,
      c.country || ' - ' || c.displayName as description,
      json_extract(c, '$') as metadata,
      0.7 as relevanceScore
    FROM competitions c
    WHERE c.isActive = 1
    ORDER BY c.displayName
    LIMIT 10
  `

  // Get top community contributors
  const topContributors = await prisma.$queryRaw<any[]>`
    SELECT 
      u.id, u.name, u.image,
      ur.reputationPoints,
      ur.rankTier,
      COUNT(cm.id) as messageCount,
      'community' as type,
      '🏆 ' || u.name || ' - Top Contributor' as title,
      'Reputation: ' || ur.reputationPoints || ' | Rank: ' || ur.rankTier as description,
      json_extract('{"type": "community", "userId": "' || u.id || '", "reputation": ' || ur.reputationPoints || '}') as metadata,
      ur.reputationPoints * 0.01 as relevanceScore
    FROM users u
    LEFT JOIN user_reputations ur ON u.id = ur.userId
    LEFT JOIN chat_messages cm ON u.id = cm.userId
    WHERE ur.totalPredictions >= 10
    GROUP BY u.id
    ORDER BY ur.reputationPoints DESC
    LIMIT 5
  `

  // Combine and sort
  const allItems = [
    ...trendingMatches,
    ...activeCompetitions,
    ...topContributors
  ]

  allItems.sort((a, b) => {
    const scoreA = calculateFinalRelevanceScore(a.relevanceScore, a.createdAt)
    const scoreB = calculateFinalRelevanceScore(b.relevanceScore, b.createdAt)
    return scoreB - scoreA
  })

  return allItems.slice(0, limit)
}

function calculateRelevanceScore(type: string, userId?: string, metadata?: string): number {
  const baseScore = {
    'match': 0.8,
    'ai_alert': 0.9,
    'community': 0.4,
    'competition': 0.6
  }

  return baseScore[type as keyof typeof baseScore] || 0.5
}

function calculateFinalRelevanceScore(relevanceScore: number, createdAt: string): number {
  const now = new Date()
  const created = new Date(createdAt)
  const hoursDiff = (now.getTime() - created.getTime()) / (1000 * 60 * 60)
  
  // Decay score based on age (24-hour half-life)
  const timeDecay = Math.pow(0.5, hoursDiff / 24)
  
  return relevanceScore * timeDecay
}

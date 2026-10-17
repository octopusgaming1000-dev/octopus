import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

// POST /api/match-comments - Create a match comment
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const user = verifyToken(token)
    
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { matchId, comment } = body

    if (!matchId || !comment?.trim()) {
      return NextResponse.json(
        { error: 'Match ID and comment required' },
        { status: 400 }
      )
    }

    // Check if match exists
    const match = await prisma.match.findUnique({
      where: { id: matchId }
    })

    if (!match) {
      return NextResponse.json(
        { error: 'Match not found' },
        { status: 404 }
      )
    }

    // Create comment using chat_messages table (reusing existing infrastructure)
    // First create or get a chat room for this match
    let chatRoom: any[] = await prisma.$queryRaw`
      SELECT * FROM chat_rooms
      WHERE type = 'match' AND referenceId = ${matchId}
    `

    if (chatRoom.length === 0) {
      chatRoom = await prisma.$queryRaw`
        INSERT INTO chat_rooms (id, type, referenceId, name, description, isActive, createdAt, updatedAt)
        VALUES ('room_' || hex(randomblob(9)), 'match', ${matchId}, 
          (SELECT homeTeam || ' vs ' || awayTeam FROM matches WHERE id = ${matchId}),
          'Match discussion', 1, datetime('now'), datetime('now'))
        RETURNING *
      `
    }

    // Create the message
    const newMessage: any[] = await prisma.$queryRaw`
      INSERT INTO chat_messages (id, roomId, userId, message, replyToId, isEdited, isDeleted, createdAt, visibilityScore, lastScoreUpdate)
      VALUES ('msg_' || hex(randomblob(9)), ${chatRoom[0].id}, ${user.userId}, ${comment.trim()}, NULL, 0, 0, datetime('now'), 0.0, datetime('now'))
      RETURNING *
    `

    return NextResponse.json({
      success: true,
      data: { message: 'Comment submitted successfully' }
    })

  } catch (error: any) {
    console.error('Match comment error:', error)
    return NextResponse.json(
      { error: 'Failed to submit comment' },
      { status: 500 }
    )
  }
}

/**
 * Chat API endpoints for real-time messaging
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken, JWTPayload } from '@/lib/auth'
import { MessageVisibilityService } from '@/lib/message-visibility-service'
import { CooldownService } from '@/lib/cooldown-service'

// Mission tracking helper
async function trackMissionProgress(userId: string, missionType: string, increment: number = 1) {
  const today = new Date().toISOString().split('T')[0]
  
  // Get today's mission for this type
  const mission = await prisma.$queryRaw<any[]>`
    SELECT dm.*, ump.progress, ump.completed
    FROM daily_missions dm
    LEFT JOIN user_mission_progress ump ON dm.id = ump.missionId AND ump.userId = ${userId}
    WHERE dm.date = ${today} AND dm.missionType = ${missionType}
  `
  
  if (mission.length > 0) {
    const missionData = mission[0]
    const newProgress = Math.min((missionData.progress || 0) + increment, missionData.requirementValue)
    const isCompleted = newProgress >= missionData.requirementValue && !missionData.completed
    
    // Update progress
    await prisma.$queryRaw`
      INSERT OR REPLACE INTO user_mission_progress (id, userId, missionId, progress, completed, completedAt)
      VALUES (
        COALESCE((SELECT id FROM user_mission_progress WHERE userId = ${userId} AND missionId = ${missionData.id}), 'ump_' || hex(randomblob(9))),
        ${userId}, ${missionData.id}, ${newProgress}, ${isCompleted ? 1 : 0},
        CASE WHEN ${isCompleted} = 1 THEN datetime('now') ELSE NULL END
      )
    `
    
    // Award reputation points if newly completed
    if (isCompleted) {
      await prisma.$queryRaw`
        UPDATE user_reputations 
        SET reputationPoints = reputationPoints + 2, lastUpdated = datetime('now')
        WHERE userId = ${userId}
      `
    }
  }
}

// Authentication helper
async function authenticateRequest(request: NextRequest): Promise<JWTPayload | null> {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.substring(7)
  return verifyToken(token)
}

// GET /api/chat - Get chat rooms and messages
export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const roomId = searchParams.get('roomId')
    const type = searchParams.get('type')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    switch (action) {
      case 'rooms':
        // Get all available chat rooms
        const rooms = await prisma.$queryRaw`
          SELECT 
            cr.*,
            COUNT(cm.id) as messageCount,
            MAX(cm.createdAt) as lastMessageAt
          FROM chat_rooms cr
          LEFT JOIN chat_messages cm ON cr.id = cm.roomId
          WHERE cr.isActive = 1
          GROUP BY cr.id
          ORDER BY cr.type, cr.name
        `
        return NextResponse.json({
          success: true,
          data: { rooms }
        })

      case 'messages':
        if (!roomId) {
          return NextResponse.json(
            { error: 'Room ID required' },
            { status: 400 }
          )
        }

        // Get messages with visibility-based sorting
        const messages = await MessageVisibilityService.getPrioritizedMessages(roomId, limit, offset)
        
        return NextResponse.json({
          success: true,
          data: { 
            messages,
            hasMore: messages.length === limit
          }
        })

      case 'competition-rooms':
        // Get competition-specific rooms
        const competitionRooms = await prisma.$queryRaw`
          SELECT 
            cr.*,
            c.displayName as competitionName,
            c.logo as competitionLogo
          FROM chat_rooms cr
          LEFT JOIN competitions c ON cr.referenceId = c.id
          WHERE cr.type = 'competition' AND cr.isActive = 1
          ORDER BY c.displayName
        `
        return NextResponse.json({
          success: true,
          data: { rooms: competitionRooms }
        })

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Chat GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/chat - Send messages, create reactions
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
    const { action } = body

    switch (action) {
      case 'send-message':
        const { roomId, message, replyToId } = body
        
        if (!roomId || !message?.trim()) {
          return NextResponse.json(
            { error: 'Room ID and message required' },
            { status: 400 }
          )
        }

        // Check cooldowns
        const rapidPostingCheck = await CooldownService.checkRapidPosting(user.userId)
        if (rapidPostingCheck.shouldBlock) {
          return NextResponse.json(
            { 
              error: 'Slow mode activated', 
              cooldown: rapidPostingCheck.cooldownInfo,
              message: `Please wait ${rapidPostingCheck.cooldownInfo.remainingSeconds} seconds before posting again.`
            },
            { status: 429 }
          )
        }

        // Check harassment patterns
        const harassmentCheck = await CooldownService.checkHarassment(user.userId, message, replyToId)
        if (harassmentCheck.shouldBlock) {
          return NextResponse.json(
            { 
              error: 'Harassment detection triggered', 
              cooldown: harassmentCheck.cooldownInfo,
              message: `Your posting patterns have been flagged. Please wait ${harassmentCheck.cooldownInfo.remainingSeconds} seconds.`
            },
            { status: 429 }
          )
        }

        // Rate limiting: max 10 messages per minute (legacy check)
        const recentMessages: any[] = await prisma.$queryRaw`
          SELECT COUNT(*) as count
          FROM chat_messages
          WHERE userId = ${user.userId} AND createdAt > datetime('now', '-1 minute')
        `
        
        if (recentMessages[0].count >= 10) {
          return NextResponse.json(
            { error: 'Rate limit exceeded. Please wait before sending another message.' },
            { status: 429 }
          )
        }

        // Create new message with initial visibility score
        const newMessage: any[] = await prisma.$queryRaw`
          INSERT INTO chat_messages (id, roomId, userId, message, replyToId, isEdited, isDeleted, createdAt, visibilityScore, lastScoreUpdate)
          VALUES ('msg_' || hex(randomblob(9)), ${roomId}, ${user.userId}, ${message.trim()}, ${replyToId || null}, 0, 0, datetime('now'), 0.0, datetime('now'))
          RETURNING *
        `

        // Calculate and update visibility score
        await MessageVisibilityService.updateMessageVisibility(newMessage[0].id)

        // Get message with user info and visibility data
        const messageWithUser: any[] = await prisma.$queryRaw`
          SELECT 
            cm.*,
            u.name as userName,
            u.image as userImage,
            ur.reputationPoints as userReputationPoints,
            ur.accuracyScore as userAccuracyScore,
            ur.rankTier as userRankTier,
            ur.totalPredictions as userTotalPredictions,
            CASE 
              WHEN cm.visibilityScore >= 30 THEN 'high'
              WHEN cm.visibilityScore >= 0 THEN 'normal'
              WHEN cm.visibilityScore >= -20 THEN 'low'
              ELSE 'collapsed'
            END as visibilityLevel
          FROM chat_messages cm
          LEFT JOIN users u ON cm.userId = u.id
          LEFT JOIN user_reputations ur ON cm.userId = ur.userId
          WHERE cm.id = ${newMessage[0].id}
        `

        // Track mission progress for discussion participation
        await trackMissionProgress(user.userId, 'PARTICIPATE_DISCUSSION', 1)

        return NextResponse.json({
          success: true,
          data: { message: messageWithUser[0] }
        })

      case 'add-reaction':
        const { messageId, reactionType } = body
        
        if (!messageId || !reactionType) {
          return NextResponse.json(
            { error: 'Message ID and reaction type required' },
            { status: 400 }
          )
        }

        // Check if reaction already exists
        const existingReaction: any[] = await prisma.$queryRaw`
          SELECT * FROM message_reactions
          WHERE messageId = ${messageId} AND userId = ${user.userId} AND reactionType = ${reactionType}
        `

        if (existingReaction.length > 0) {
          // Remove existing reaction
          await prisma.$queryRaw`
            DELETE FROM message_reactions
            WHERE messageId = ${messageId} AND userId = ${user.userId} AND reactionType = ${reactionType}
          `
        } else {
          // Add new reaction
          await prisma.$queryRaw`
            INSERT INTO message_reactions (id, messageId, userId, reactionType, createdAt)
            VALUES ('mr_' || hex(randomblob(9)), ${messageId}, ${user.userId}, ${reactionType}, datetime('now'))
          `
          
          // Track mission progress for reactions
          await trackMissionProgress(user.userId, 'REACT_5_PREDICTIONS', 1)
        }

        // Update message visibility score
        await MessageVisibilityService.updateMessageVisibility(messageId)

        return NextResponse.json({
          success: true,
          data: { action: existingReaction.length > 0 ? 'removed' : 'added' }
        })

      case 'report-message':
        const { messageId: reportMessageId, reason } = body
        
        if (!reportMessageId || !reason) {
          return NextResponse.json(
            { error: 'Message ID and reason required' },
            { status: 400 }
          )
        }

        try {
          await MessageVisibilityService.reportMessage(reportMessageId, user.userId, reason)
          
          return NextResponse.json({
            success: true,
            data: { message: 'Message reported successfully' }
          })
        } catch (error: any) {
          return NextResponse.json(
            { error: error.message },
            { status: 400 }
          )
        }

      case 'flag-spam':
        const { messageId: spamMessageId } = body
        
        if (!spamMessageId) {
          return NextResponse.json(
            { error: 'Message ID required' },
            { status: 400 }
          )
        }

        await MessageVisibilityService.flagMessageAsSpam(spamMessageId)
        
        return NextResponse.json({
          success: true,
          data: { message: 'Message flagged as spam' }
        })

      case 'mute-user':
        const { targetUserId } = body
        
        if (!targetUserId) {
          return NextResponse.json(
            { error: 'Target user ID required' },
            { status: 400 }
          )
        }

        // Check if already muted
        const existingMute: any[] = await prisma.$queryRaw`
          SELECT * FROM user_mutes WHERE userId = ${targetUserId} AND mutedBy = ${user.userId}
        `

        if (existingMute.length > 0) {
          // Unmute
          await prisma.$queryRaw`
            DELETE FROM user_mutes WHERE userId = ${targetUserId} AND mutedBy = ${user.userId}
          `
          
          return NextResponse.json({
            success: true,
            data: { action: 'unmuted', message: 'User unmuted' }
          })
        } else {
          // Mute
          await prisma.$queryRaw`
            INSERT INTO user_mutes (id, userId, mutedBy, reason, isActive, createdAt)
            VALUES ('um_' || hex(randomblob(9)), ${targetUserId}, ${user.userId}, 'User muted', 1, datetime('now'))
          `
          
          return NextResponse.json({
            success: true,
            data: { action: 'muted', message: 'User muted' }
          })
        }

      case 'get-cooldown-status':
        const cooldownInfo = await CooldownService.getUserCooldown(user.userId)
        
        return NextResponse.json({
          success: true,
          data: { cooldown: cooldownInfo }
        })

      case 'create-room':
        const { type, referenceId, name, description } = body
        
        if (!type || !name) {
          return NextResponse.json(
            { error: 'Type and name required' },
            { status: 400 }
          )
        }

        // Check if room already exists
        const existingRoom: any[] = await prisma.$queryRaw`
          SELECT * FROM chat_rooms
          WHERE type = ${type} AND referenceId = ${referenceId || null}
        `

        if (existingRoom.length > 0) {
          return NextResponse.json({
            success: true,
            data: { room: existingRoom[0] }
          })
        }

        // Create new room
        const newRoom: any[] = await prisma.$queryRaw`
          INSERT INTO chat_rooms (id, type, referenceId, name, description, isActive, createdAt, updatedAt)
          VALUES ('room_' || hex(randomblob(9)), ${type}, ${referenceId || null}, ${name}, ${description || null}, 1, datetime('now'), datetime('now'))
          RETURNING *
        `

        return NextResponse.json({
          success: true,
          data: { room: newRoom[0] }
        })

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Chat POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/chat - Edit messages
export async function PUT(request: NextRequest) {
  try {
    const user = await authenticateRequest(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { action, messageId, message } = body

    if (action === 'edit-message') {
      if (!messageId || !message?.trim()) {
        return NextResponse.json(
          { error: 'Message ID and message required' },
          { status: 400 }
        )
      }

      // Check if user owns the message
      const messageOwner: any[] = await prisma.$queryRaw`
        SELECT userId FROM chat_messages
        WHERE id = ${messageId}
      `

      if (messageOwner.length === 0 || messageOwner[0].userId !== user.userId) {
        return NextResponse.json(
          { error: 'Message not found or unauthorized' },
          { status: 404 }
        )
      }

      // Update message
      await prisma.$queryRaw`
        UPDATE chat_messages
        SET message = ${message.trim()}, isEdited = 1, editedAt = datetime('now')
        WHERE id = ${messageId}
      `

      return NextResponse.json({
        success: true,
        data: { message: 'Message updated successfully' }
      })
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    )

  } catch (error) {
    console.error('Chat PUT error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/chat - Delete messages
export async function DELETE(request: NextRequest) {
  try {
    const user = await authenticateRequest(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const messageId = searchParams.get('messageId')

    if (action === 'delete-message') {
      if (!messageId) {
        return NextResponse.json(
          { error: 'Message ID required' },
          { status: 400 }
        )
      }

      // Check if user owns the message (or is admin)
      const messageOwner: any[] = await prisma.$queryRaw`
        SELECT userId FROM chat_messages
        WHERE id = ${messageId}
      `

      if (messageOwner.length === 0 || messageOwner[0].userId !== user.userId) {
        return NextResponse.json(
          { error: 'Message not found or unauthorized' },
          { status: 404 }
        )
      }

      // Soft delete message
      await prisma.$queryRaw`
        UPDATE chat_messages
        SET isDeleted = 1, message = '[Message deleted]', editedAt = datetime('now')
        WHERE id = ${messageId}
      `

      return NextResponse.json({
        success: true,
        data: { message: 'Message deleted successfully' }
      })
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    )

  } catch (error) {
    console.error('Chat DELETE error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

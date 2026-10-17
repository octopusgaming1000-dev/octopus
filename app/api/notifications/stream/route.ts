import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

// Notification types for real-time events
enum NotificationType {
  MATCH_STARTING = 'match_starting',
  MATCH_FINISHED = 'match_finished',
  AI_CONFIDENCE_SPIKE = 'ai_confidence_spike',
  LINEUP_RELEASED = 'lineup_released',
  RED_CARD = 'red_card',
  PENALTY = 'penalty',
  HALFTIME = 'halftime',
  FULLTIME = 'fulltime',
  COMMENT_REPLY = 'comment_reply',
  PREDICTION_LIKED = 'prediction_liked',
  TOP_PREDICTOR = 'top_predictor',
  RANK_UPGRADE = 'rank_upgrade',
  STREAK_MILESTONE = 'streak_milestone',
  DAILY_MISSIONS = 'daily_missions',
  COMMUNITY_ANNOUNCEMENT = 'community_announcement'
}

// Real-time notification streaming with Server-Sent Events
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response('Unauthorized', { status: 401 })
  }

  const token = authHeader.substring(7)
  const user = verifyToken(token)
  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }

  // Create Server-Sent Events stream
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      // Initial connection message
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'connected', message: 'Connected to notification stream' })}\n\n`))

      // Send initial unread notifications
      sendInitialNotifications(user.userId, controller, encoder)

      // Set up heartbeat to keep connection alive
      const heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'heartbeat', timestamp: Date.now() })}\n\n`))
      }, 30000) // 30 seconds

      // Clean up on disconnect
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeat)
        controller.close()
      })
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    }
  })
}

async function sendInitialNotifications(userId: string, controller: ReadableStreamDefaultController, encoder: TextEncoder) {
  try {
    // Get unread notifications
    const unreadNotifications = await prisma.$queryRaw<any[]>`
      SELECT * FROM notifications 
      WHERE userId = ${userId} AND isRead = false
      ORDER BY createdAt DESC
      LIMIT 10
    `

    // Send each unread notification
    for (const notification of unreadNotifications) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'notification', data: notification })}\n\n`))
    }

    // Send unread count
    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'unread_count', count: unreadNotifications.length })}\n\n`))
  } catch (error) {
    console.error('Error sending initial notifications:', error)
  }
}

// Notification creation functions for different event types
async function createMatchEventNotification(
  userId: string,
  type: NotificationType,
  matchId: string,
  title: string,
  message: string
) {
  try {
    // Get user preferences
    const preferences = await prisma.$queryRaw<any[]>`
      SELECT * FROM user_preferences WHERE userId = ${userId}
    `

    const userPrefs = preferences[0] || {
      notifyMatchEvents: true,
      notifySocial: true,
      notifyAIAlerts: true,
      notifyDailyMissions: true
    }

    if (!userPrefs.notifyMatchEvents) {
      return
    }

    await prisma.$queryRaw`
      INSERT INTO notifications (id, userId, type, title, message, relatedMatchId)
      VALUES (
        'notif_' || hex(randomblob(9)), 
        ${userId}, ${type}, ${title}, ${message}, ${matchId}
      )
    `

    // Broadcast to all connected clients for this user
    broadcastToUser(userId, {
      type: 'notification',
      data: {
        id: 'notif_' + Math.random().toString(36).substr(2, 9),
        userId,
        type,
        title,
        message,
        relatedMatchId: matchId,
        isRead: false,
        createdAt: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('Failed to create match event notification:', error)
  }
}

async function createSocialNotification(
  userId: string,
  type: NotificationType,
  relatedUserId: string,
  title: string,
  message: string
) {
  try {
    // Get user preferences
    const preferences = await prisma.$queryRaw<any[]>`
      SELECT * FROM user_preferences WHERE userId = ${userId}
    `

    const userPrefs = preferences[0] || {
      notifyMatchEvents: true,
      notifySocial: true,
      notifyAIAlerts: true,
      notifyDailyMissions: true
    }

    if (!userPrefs.notifySocial) {
      return
    }

    await prisma.$queryRaw`
      INSERT INTO notifications (id, userId, type, title, message, relatedUserId)
      VALUES (
        'notif_' || hex(randomblob(9)), 
        ${userId}, ${type}, ${title}, ${message}, ${relatedUserId}
      )
    `

    // Broadcast to user
    broadcastToUser(userId, {
      type: 'notification',
      data: {
        id: 'notif_' + Math.random().toString(36).substr(2, 9),
        userId,
        type,
        title,
        message,
        relatedUserId,
        isRead: false,
        createdAt: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('Failed to create social notification:', error)
  }
}

async function createSystemNotification(
  userId: string,
  type: NotificationType,
  title: string,
  message: string
) {
  try {
    await prisma.$queryRaw`
      INSERT INTO notifications (id, userId, type, title, message)
      VALUES (
        'notif_' || hex(randomblob(9)), 
        ${userId}, ${type}, ${title}, ${message}
      )
    `

    // Broadcast to user
    broadcastToUser(userId, {
      type: 'notification',
      data: {
        id: 'notif_' + Math.random().toString(36).substr(2, 9),
        userId,
        type,
        title,
        message,
        isRead: false,
        createdAt: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('Failed to create system notification:', error)
  }
}

// In-memory storage for active SSE connections (in production, use Redis)
const activeConnections = new Map<string, Set<ReadableStreamDefaultController>>()

function broadcastToUser(userId: string, data: any) {
  const userConnections = activeConnections.get(userId)
  if (userConnections) {
    const encoder = new TextEncoder()
    const message = encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
    
    userConnections.forEach(controller => {
      try {
        controller.enqueue(message)
      } catch (error) {
        console.error('Error broadcasting to controller:', error)
      }
    })
  }
}

// Export for use in other API routes
// Note: activeConnections is kept internal to avoid Next.js route export issues

// Match event triggers to be called from other parts of the system
async function triggerMatchStartingSoon(matchId: string, homeTeam: string, awayTeam: string, kickoffTime: string) {
  // Get all users who predicted on this match
  const predictingUsers = await prisma.$queryRaw<any[]>`
    SELECT DISTINCT userId FROM predictions WHERE matchId = ${matchId}
  `

  for (const user of predictingUsers) {
    await createMatchEventNotification(
      user.userId,
      NotificationType.MATCH_STARTING,
      matchId,
      'Match Starting Soon',
      `${homeTeam} vs ${awayTeam} kicks off in 15 minutes!`
    )
  }
}

async function triggerMatchFinished(matchId: string, homeTeam: string, awayTeam: string) {
  // Get all users who predicted on this match
  const predictingUsers = await prisma.$queryRaw<any[]>`
    SELECT DISTINCT userId FROM predictions WHERE matchId = ${matchId}
  `

  for (const user of predictingUsers) {
    await createMatchEventNotification(
      user.userId,
      NotificationType.MATCH_FINISHED,
      matchId,
      'Match Finished',
      `${homeTeam} vs ${awayTeam} has finished. Check your prediction results!`
    )
  }
}

async function triggerAIConfidenceSpike(matchId: string, homeTeam: string, awayTeam: string, confidence: number) {
  if (confidence < 0.8) return // Only notify for high confidence

  // Get all users with notifications enabled
  const users = await prisma.$queryRaw<any[]>`
    SELECT userId FROM user_preferences WHERE notifyAIAlerts = 1
  `

  for (const user of users) {
    await createMatchEventNotification(
      user.userId,
      NotificationType.AI_CONFIDENCE_SPIKE,
      matchId,
      'AI Confidence Spike',
      `High AI confidence (${(confidence * 100).toFixed(1)}%) detected for ${homeTeam} vs ${awayTeam}`
    )
  }
}

async function triggerRankUpgrade(userId: string, newRank: string) {
  await createSystemNotification(
    userId,
    NotificationType.RANK_UPGRADE,
    'Rank Upgraded!',
    `Congratulations! You've reached ${newRank} rank!`
  )
}

async function triggerStreakMilestone(userId: string, streakDays: number) {
  await createSystemNotification(
    userId,
    NotificationType.STREAK_MILESTONE,
    'Streak Milestone!',
    `Amazing! You've maintained a ${streakDays}-day streak!`
  )
}

async function triggerDailyMissionsAvailable() {
  // Get all users with daily missions enabled
  const users = await prisma.$queryRaw<any[]>`
    SELECT userId FROM user_preferences WHERE notifyDailyMissions = 1
  `

  for (const user of users) {
    await createSystemNotification(
      user.userId,
      NotificationType.DAILY_MISSIONS,
      'Daily Missions Available',
      'New daily missions are ready. Complete them to earn reputation points!'
    )
  }
}

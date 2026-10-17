import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken, JWTPayload } from '@/lib/auth'

interface Notification {
  id: string
  userId: string
  type: string
  title: string
  message: string
  relatedMatchId?: string
  relatedUserId?: string
  isRead: boolean
  createdAt: string
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const unreadOnly = searchParams.get('unreadOnly') === 'true'

    // Authentication
    const user = await authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    switch (action) {
      case 'notifications':
        let whereClause = 'userId = ${user.userId}'
        if (unreadOnly) {
          whereClause += ' AND isRead = false'
        }

        const notifications = await prisma.$queryRaw<any[]>`
          SELECT * FROM notifications 
          WHERE ${whereClause}
          ORDER BY createdAt DESC
          LIMIT ${limit} OFFSET ${(page - 1) * limit}
        `

        // Get unread count
        const unreadCount = await prisma.$queryRaw<any[]>`
          SELECT COUNT(*) as count FROM notifications 
          WHERE userId = ${user.userId} AND isRead = false
        `

        return NextResponse.json({
          success: true,
          data: {
            notifications,
            unreadCount: unreadCount[0].count,
            hasMore: notifications.length === limit
          }
        })

      case 'mark-read':
        const notificationId = searchParams.get('notificationId')
        if (!notificationId) {
          return NextResponse.json({ error: 'Notification ID required' }, { status: 400 })
        }

        await prisma.$queryRaw`
          UPDATE notifications 
          SET isRead = true
          WHERE id = ${notificationId} AND userId = ${user.userId}
        `

        return NextResponse.json({
          success: true,
          message: 'Notification marked as read'
        })

      case 'mark-all-read':
        await prisma.$queryRaw`
          UPDATE notifications 
          SET isRead = true
          WHERE userId = ${user.userId} AND isRead = false
        `

        return NextResponse.json({
          success: true,
          message: 'All notifications marked as read'
        })

      case 'unread-count':
        const unreadCountResult = await prisma.$queryRaw<any[]>`
          SELECT COUNT(*) as count FROM notifications 
          WHERE userId = ${user.userId} AND isRead = false
        `
        return NextResponse.json({
          success: true,
          unreadCount: unreadCountResult[0]?.count || 0
        })

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Notifications GET error:', error)
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
      case 'create-notification':
        const { type, title, message, relatedMatchId, relatedUserId } = body

        if (!type || !title || !message) {
          return NextResponse.json(
            { error: 'Type, title, and message required' },
            { status: 400 }
          )
        }

        // Get user preferences to check if notification type is enabled
        const prefs = await prisma.$queryRaw<any[]>`
          SELECT * FROM user_preferences WHERE userId = ${user.userId}
        `

        const userPreferences = prefs[0] || {
          notifyMatchEvents: true,
          notifySocial: true,
          notifyAIAlerts: true,
          notifyDailyMissions: true
        }

        // Check if user wants this type of notification
        if (!shouldSendNotification(type, userPreferences)) {
          return NextResponse.json({
            success: true,
            message: 'Notification type disabled by user'
          })
        }

        const notification = await prisma.$queryRaw<any[]>`
          INSERT INTO notifications (id, userId, type, title, message, relatedMatchId, relatedUserId)
          VALUES (
            'notif_' || hex(randomblob(9)), 
            ${user.userId}, ${type}, ${title}, ${message}, 
            ${relatedMatchId || null}, ${relatedUserId || null}
          )
          RETURNING *
        `

        return NextResponse.json({
          success: true,
          data: { notification: notification[0] }
        })

      case 'update-preferences':
        const { notifyMatchEvents, notifySocial, notifyAIAlerts, notifyDailyMissions } = body

        await prisma.$queryRaw`
          INSERT OR REPLACE INTO user_preferences (
            id, userId, notifyMatchEvents, notifySocial, notifyAIAlerts, notifyDailyMissions
          ) VALUES (
            COALESCE((SELECT id FROM user_preferences WHERE userId = ${user.userId}), 'up_' || hex(randomblob(9))),
            ${user.userId}, ${notifyMatchEvents}, ${notifySocial}, ${notifyAIAlerts}, ${notifyDailyMissions}
          )
        `

        return NextResponse.json({
          success: true,
          message: 'Preferences updated'
        })

      case 'bulk-create':
        const { notifications: notificationsToCreate } = body

        if (!Array.isArray(notificationsToCreate)) {
          return NextResponse.json({ error: 'Notifications must be an array' }, { status: 400 })
        }

        // Get user preferences
        const userPrefsQuery = await prisma.$queryRaw<any[]>`
          SELECT * FROM user_preferences WHERE userId = ${user.userId}
        `

        const matchEventPreferences = userPrefsQuery[0] || {
          notifyMatchEvents: true,
          notifySocial: true,
          notifyAIAlerts: true,
          notifyDailyMissions: true
        }

        // Filter notifications based on preferences
        const filteredNotifications = notificationsToCreate.filter(notif => 
          shouldSendNotification(notif.type, matchEventPreferences)
        )

        if (filteredNotifications.length === 0) {
          return NextResponse.json({
            success: true,
            message: 'No notifications to create (filtered by preferences)'
          })
        }

        // Create notifications in bulk
        const createdNotifications = []
        for (const notif of filteredNotifications) {
          const created = await prisma.$queryRaw<any[]>`
            INSERT INTO notifications (id, userId, type, title, message, relatedMatchId, relatedUserId)
            VALUES (
              'notif_' || hex(randomblob(9)), 
              ${user.userId}, ${notif.type}, ${notif.title}, ${notif.message}, 
              ${notif.relatedMatchId || null}, ${notif.relatedUserId || null}
            )
            RETURNING *
          `
          createdNotifications.push(created[0])
        }

        return NextResponse.json({
          success: true,
          data: { 
            notifications: createdNotifications,
            totalRequested: notificationsToCreate.length,
            totalCreated: createdNotifications.length
          }
        })

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Notifications POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const notificationId = searchParams.get('notificationId')

    // Authentication
    const user = await authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!notificationId) {
      return NextResponse.json({ error: 'Notification ID required' }, { status: 400 })
    }

    await prisma.$queryRaw`
      DELETE FROM notifications 
      WHERE id = ${notificationId} AND userId = ${user.userId}
    `

    return NextResponse.json({
      success: true,
      message: 'Notification deleted'
    })
  } catch (error) {
    console.error('Notifications DELETE error:', error)
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

function shouldSendNotification(type: string, preferences: any): boolean {
  switch (type) {
    case 'match_starting':
    case 'match_finished':
    case 'lineup_released':
    case 'red_card':
    case 'penalty':
    case 'halftime':
    case 'fulltime':
      return preferences.notifyMatchEvents
    case 'comment_reply':
    case 'prediction_liked':
    case 'top_predictor':
      return preferences.notifySocial
    case 'ai_confidence_spike':
      return preferences.notifyAIAlerts
    case 'daily_missions':
    case 'streak_milestone':
      return preferences.notifyDailyMissions
    case 'rank_upgrade':
    case 'community_announcement':
      return true // Always send system notifications
    default:
      return true
  }
}

// Notification creation helpers for different events
async function createMatchNotification(
  userId: string,
  type: string,
  matchId: string,
  title: string,
  message: string
) {
  try {
    await prisma.$queryRaw`
      INSERT INTO notifications (id, userId, type, title, message, relatedMatchId)
      VALUES (
        'notif_' || hex(randomblob(9)), 
        ${userId}, ${type}, ${title}, ${message}, ${matchId}
      )
    `
  } catch (error) {
    console.error('Failed to create match notification:', error)
  }
}

async function createSocialNotification(
  userId: string,
  type: string,
  relatedUserId: string,
  title: string,
  message: string
) {
  try {
    await prisma.$queryRaw`
      INSERT INTO notifications (id, userId, type, title, message, relatedUserId)
      VALUES (
        'notif_' || hex(randomblob(9)), 
        ${userId}, ${type}, ${title}, ${message}, ${relatedUserId}
      )
    `
  } catch (error) {
    console.error('Failed to create social notification:', error)
  }
}

async function createSystemNotification(
  userId: string,
  type: string,
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
  } catch (error) {
    console.error('Failed to create system notification:', error)
  }
}

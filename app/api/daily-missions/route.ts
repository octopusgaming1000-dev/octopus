import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken, JWTPayload } from '@/lib/auth'

interface Mission {
  id: string
  date: string
  missionType: string
  requirementValue: number
  description: string
  isActive: boolean
  progress?: number
  completed?: boolean
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0]

    // Authentication
    const user = await authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    switch (action) {
      case 'daily-missions':
        // Get or create daily missions for the specified date
        const missions = await getOrCreateDailyMissions(date)
        
        // Get user progress for these missions
        const userProgress = await prisma.$queryRaw<any[]>`
          SELECT 
            ump.*,
            dm.id as missionId,
            dm.missionType,
            dm.requirementValue,
            dm.description
          FROM user_mission_progress ump
          LEFT JOIN daily_missions dm ON ump.missionId = dm.id
          WHERE ump.userId = ${user.userId} AND dm.date = ${date}
        `

        // Combine missions with progress
        const missionsWithProgress = missions.map(mission => {
          const progress = userProgress.find(p => p.missionId === mission.id)
          return {
            ...mission,
            progress: progress?.progress || 0,
            completed: progress?.completed || false,
            completedAt: progress?.completedAt
          }
        })

        return NextResponse.json({
          success: true,
          data: { 
            missions: missionsWithProgress,
            date
          }
        })

      case 'user-streak':
        const streak = await prisma.$queryRaw<any[]>`
          SELECT * FROM user_streaks WHERE userId = ${user.userId}
        `

        const userBadges = await prisma.$queryRaw<any[]>`
          SELECT * FROM user_badges WHERE userId = ${user.userId} ORDER BY earnedAt DESC
        `

        return NextResponse.json({
          success: true,
          data: {
            streak: streak[0] || {
              currentStreak: 0,
              longestStreak: 0,
              lastActiveDate: null
            },
            badges: userBadges
          }
        })

      case 'mission-stats':
        const stats = await prisma.$queryRaw<any[]>`
          SELECT 
            COUNT(CASE WHEN completed = 1 THEN 1 END) as completedMissions,
            COUNT(*) as totalMissions,
            DATE(completedAt) as completionDate
          FROM user_mission_progress ump
          LEFT JOIN daily_missions dm ON ump.missionId = dm.id
          WHERE ump.userId = ${user.userId} AND ump.completed = 1
          GROUP BY DATE(completedAt)
          ORDER BY completionDate DESC
          LIMIT 30
        `

        return NextResponse.json({
          success: true,
          data: { stats }
        })

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Daily missions GET error:', error)
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
      case 'update-progress':
        const { missionId, progress, completed } = body

        if (!missionId) {
          return NextResponse.json({ error: 'Mission ID required' }, { status: 400 })
        }

        // Validate mission exists and belongs to today
        const today = new Date().toISOString().split('T')[0]
        const missionCheck = await prisma.$queryRaw<any[]>`
          SELECT dm.*, ump.userId as existingUserId
          FROM daily_missions dm
          LEFT JOIN user_mission_progress ump ON dm.id = ump.missionId AND ump.userId = ${user.userId}
          WHERE dm.id = ${missionId} AND dm.date = ${today}
        `

        if (!missionCheck.length) {
          return NextResponse.json({ error: 'Mission not found or expired' }, { status: 404 })
        }

        const mission = missionCheck[0]
        const maxProgress = mission.requirementValue

        // Validate progress doesn't exceed requirement
        if (progress > maxProgress) {
          return NextResponse.json({ 
            error: `Progress cannot exceed requirement (${maxProgress})` 
          }, { status: 400 })
        }

        // Update or create progress
        const existingProgress = await prisma.$queryRaw<any[]>`
          SELECT * FROM user_mission_progress 
          WHERE userId = ${user.userId} AND missionId = ${missionId}
        `

        let wasCompleted = false
        let reputationPoints = 0

        if (existingProgress.length > 0) {
          wasCompleted = existingProgress[0].completed
          
          await prisma.$queryRaw`
            UPDATE user_mission_progress 
            SET progress = ${progress}, completed = ${completed},
                completedAt = CASE WHEN ${completed} = 1 AND completed = 0 THEN datetime('now') ELSE completedAt END
            WHERE userId = ${user.userId} AND missionId = ${missionId}
          `
        } else {
          await prisma.$queryRaw`
            INSERT INTO user_mission_progress (id, userId, missionId, progress, completed, completedAt)
            VALUES (
              'ump_' || hex(randomblob(9)), 
              ${user.userId}, ${missionId}, ${progress}, ${completed},
              CASE WHEN ${completed} = 1 THEN datetime('now') ELSE NULL END
            )
          `
        }

        // Award reputation points for completion
        if (completed && !wasCompleted) {
          reputationPoints = 2
          await updateUserReputation(user.userId, reputationPoints)
          await updateUserStreak(user.userId)
          await checkAndAwardBadges(user.userId)
        }

        return NextResponse.json({
          success: true,
          data: {
            progress,
            completed,
            reputationPoints: reputationPoints
          }
        })

      case 'track-activity':
        const { activityType, activityData } = body

        if (!activityType) {
          return NextResponse.json({ error: 'Activity type required' }, { status: 400 })
        }

        await trackUserActivity(user.userId, activityType, activityData)

        return NextResponse.json({
          success: true,
          message: 'Activity tracked'
        })

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Daily missions POST error:', error)
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

async function getOrCreateDailyMissions(date: string): Promise<Mission[]> {
  // Check if missions already exist for this date
  const existingMissions = await prisma.$queryRaw<any[]>`
    SELECT * FROM daily_missions WHERE date = ${date}
  `

  if (existingMissions.length > 0) {
    return existingMissions
  }

  // Create new missions for the date
  const missionTemplates = [
    {
      missionType: 'PREDICT_3_MATCHES',
      requirementValue: 3,
      description: 'Predict 3 matches today'
    },
    {
      missionType: 'PARTICIPATE_DISCUSSION',
      requirementValue: 1,
      description: 'Participate in 1 match discussion'
    },
    {
      missionType: 'REACT_5_PREDICTIONS',
      requirementValue: 5,
      description: 'React to 5 community predictions'
    },
    {
      missionType: 'HIGH_CONFIDENCE_PREDICTION',
      requirementValue: 1,
      description: 'Submit a high confidence prediction (4-5 stars)'
    },
    {
      missionType: 'ANALYZE_AI_PREDICTION',
      requirementValue: 1,
      description: 'Analyze one AI prediction'
    }
  ]

  const newMissions = []
  for (const template of missionTemplates) {
    const mission = await prisma.$queryRaw<any[]>`
      INSERT INTO daily_missions (id, date, missionType, requirementValue, description)
      VALUES (
        'dm_' || hex(randomblob(9)), 
        ${date}, ${template.missionType}, ${template.requirementValue}, ${template.description}
      )
      RETURNING *
    `
    newMissions.push(mission[0])
  }

  return newMissions
}

async function updateUserStreak(userId: string) {
  const today = new Date().toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

  // Get current streak
  const currentStreak = await prisma.$queryRaw<any[]>`
    SELECT * FROM user_streaks WHERE userId = ${userId}
  `

  let streakData = currentStreak[0] || {
    currentStreak: 0,
    longestStreak: 0,
    lastActiveDate: null
  }

  // Update streak based on activity
  if (streakData.lastActiveDate === yesterday) {
    // Continue streak
    streakData.currentStreak += 1
  } else if (streakData.lastActiveDate !== today) {
    // Reset streak (missed a day)
    streakData.currentStreak = 1
  }

  // Update longest streak
  if (streakData.currentStreak > streakData.longestStreak) {
    streakData.longestStreak = streakData.currentStreak
  }

  streakData.lastActiveDate = today

  // Upsert streak record
  await prisma.$queryRaw`
    INSERT OR REPLACE INTO user_streaks (
      id, userId, currentStreak, longestStreak, lastActiveDate
    ) VALUES (
      COALESCE((SELECT id FROM user_streaks WHERE userId = ${userId}), 'us_' || hex(randomblob(9))),
      ${userId}, ${streakData.currentStreak}, ${streakData.longestStreak}, ${streakData.lastActiveDate}
    )
  `

  // Award streak bonuses
  if (streakData.currentStreak === 7) {
    await updateUserReputation(userId, 10)
    await awardBadge(userId, '7_DAY_ACTIVE', '🔥 7 Day Active', '🔥')
  } else if (streakData.currentStreak === 30) {
    await updateUserReputation(userId, 50)
    await awardBadge(userId, '30_DAY_ANALYST', '⚡ 30 Day Analyst', '⚡')
  } else if (streakData.currentStreak === 100) {
    await awardBadge(userId, 'CONSISTENCY_MASTER', '🧠 Consistency Master', '🧠')
  }
}

async function checkAndAwardBadges(userId: string) {
  // Check for various badge conditions
  // This can be expanded with more badge types
}

async function awardBadge(userId: string, badgeType: string, badgeName: string, badgeIcon: string) {
  const existingBadge = await prisma.$queryRaw<any[]>`
    SELECT id FROM user_badges WHERE userId = ${userId} AND badgeType = ${badgeType}
  `

  if (existingBadge.length === 0) {
    await prisma.$queryRaw`
      INSERT INTO user_badges (id, userId, badgeType, badgeName, badgeIcon)
      VALUES ('ub_' || hex(randomblob(9)), ${userId}, ${badgeType}, ${badgeName}, ${badgeIcon})
    `
  }
}

async function updateUserReputation(userId: string, points: number) {
  await prisma.$queryRaw`
    UPDATE user_reputations 
    SET reputationPoints = reputationPoints + ${points}, lastUpdated = datetime('now')
    WHERE userId = ${userId}
  `
}

async function trackUserActivity(userId: string, activityType: string, activityData: any) {
  // This function can be expanded to track various user activities
  // For now, it's a placeholder for future activity tracking
  
  switch (activityType) {
    case 'prediction_made':
      // Track prediction for mission progress
      break
    case 'chat_message_sent':
      // Track chat participation
      break
    case 'reaction_added':
      // Track reactions
      break
    // Add more activity types as needed
  }
}

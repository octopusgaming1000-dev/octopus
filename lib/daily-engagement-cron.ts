import { prisma } from '@/lib/prisma'

interface DailyMission {
  id: string
  date: string
  missionType: string
  requirementValue: number
  description: string
  isActive: boolean
}

export async function runDailyEngagementCron() {
  console.log('🔄 Running daily engagement cron job...')
  
  try {
    const today = new Date().toISOString().split('T')[0]
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

    // 1. Create new daily missions for today
    await createDailyMissions(today)
    
    // 2. Evaluate yesterday's streaks
    await evaluateStreaks(yesterday)
    
    // 3. Clean up old inactive missions (older than 7 days)
    await cleanupOldMissions()
    
    console.log('✅ Daily engagement cron job completed successfully')
  } catch (error) {
    console.error('❌ Daily engagement cron job failed:', error)
  }
}

async function createDailyMissions(date: string) {
  console.log(`📝 Creating daily missions for ${date}`)
  
  // Check if missions already exist
  const existingMissions = await prisma.$queryRaw<any[]>`
    SELECT COUNT(*) as count FROM daily_missions WHERE date = ${date}
  `

  if (existingMissions[0].count > 0) {
    console.log('ℹ️  Missions already exist for today')
    return
  }

  // Mission templates
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

  // Create missions
  for (const template of missionTemplates) {
    await prisma.$queryRaw`
      INSERT INTO daily_missions (id, date, missionType, requirementValue, description)
      VALUES (
        'dm_' || hex(randomblob(9)), 
        ${date}, ${template.missionType}, ${template.requirementValue}, ${template.description}
      )
    `
  }

  console.log(`✅ Created ${missionTemplates.length} daily missions for ${date}`)
}

async function evaluateStreaks(yesterday: string) {
  console.log(`🔥 Evaluating streaks for ${yesterday}`)
  
  // Get all users who had activity yesterday
  const activeUsers = await prisma.$queryRaw<any[]>`
    SELECT DISTINCT userId FROM user_mission_progress ump
    LEFT JOIN daily_missions dm ON ump.missionId = dm.id
    WHERE dm.date = ${yesterday} AND ump.completed = 1
  `

  // Get all users with existing streaks
  const allStreaks = await prisma.$queryRaw<any[]>`
    SELECT * FROM user_streaks
  `

  const streakMap = new Map(allStreaks.map(s => [s.userId, s]))

  for (const user of activeUsers) {
    const userId = user.userId
    const currentStreak = streakMap.get(userId) || {
      currentStreak: 0,
      longestStreak: 0,
      lastActiveDate: null
    }

    let newStreak = currentStreak.currentStreak

    // Check if user was active yesterday
    if (currentStreak.lastActiveDate === yesterday) {
      // User was active yesterday, continue streak logic will be handled by real-time updates
      continue
    } else {
      // Check if user was active the day before yesterday
      const dayBeforeYesterday = new Date(Date.now() - 172800000).toISOString().split('T')[0]
      const previousActivity = await prisma.$queryRaw<any[]>`
        SELECT COUNT(*) as count FROM user_mission_progress ump
        LEFT JOIN daily_missions dm ON ump.missionId = dm.id
        WHERE ump.userId = ${userId} AND dm.date = ${dayBeforeYesterday} AND ump.completed = 1
      `

      if (previousActivity[0].count > 0) {
        // User had a streak going but missed yesterday
        newStreak = 0
        console.log(`💔 User ${userId} lost streak (was ${currentStreak.currentStreak})`)
      }
      // If no previous activity, streak stays at 0
    }

    // Update streak
    await prisma.$queryRaw`
      INSERT OR REPLACE INTO user_streaks (
        id, userId, currentStreak, longestStreak, lastActiveDate
      ) VALUES (
        COALESCE((SELECT id FROM user_streaks WHERE userId = ${userId}), 'us_' || hex(randomblob(9))),
        ${userId}, ${newStreak}, ${currentStreak.longestStreak}, ${currentStreak.lastActiveDate}
      )
    `
  }

  console.log(`✅ Evaluated streaks for ${activeUsers.length} active users`)
}

async function cleanupOldMissions() {
  console.log('🧹 Cleaning up old missions...')
  
  // Delete missions older than 7 days
  const cutoffDate = new Date(Date.now() - 604800000).toISOString().split('T')[0]
  
  const result = await prisma.$queryRaw`
    DELETE FROM daily_missions 
    WHERE date < ${cutoffDate} AND isActive = 0
  `

  console.log(`🗑️  Cleaned up old missions`)
}

// Award streak bonuses and badges
async function awardStreakBonuses() {
  console.log('🏆 Awarding streak bonuses...')
  
  // Get users who reached streak milestones
  const streakMilestones = await prisma.$queryRaw<any[]>`
    SELECT userId, currentStreak FROM user_streaks
    WHERE currentStreak IN (7, 30, 100)
  `

  for (const milestone of streakMilestones) {
    const { userId, currentStreak } = milestone
    
    // Check if badge already awarded
    const existingBadge = await prisma.$queryRaw<any[]>`
      SELECT id FROM user_badges 
      WHERE userId = ${userId} AND badgeType = ${getBadgeType(currentStreak)}
    `

    if (existingBadge.length === 0) {
      // Award badge and reputation bonus
      const badgeInfo = getBadgeInfo(currentStreak)
      if (badgeInfo) {
        const { badgeType, badgeName, badgeIcon, bonusPoints } = badgeInfo
        
        await prisma.$queryRaw`
          INSERT INTO user_badges (id, userId, badgeType, badgeName, badgeIcon)
          VALUES ('ub_' || hex(randomblob(9)), ${userId}, ${badgeType}, ${badgeName}, ${badgeIcon})
        `

        await prisma.$queryRaw`
          UPDATE user_reputations 
          SET reputationPoints = reputationPoints + ${bonusPoints}, lastUpdated = datetime('now')
          WHERE userId = ${userId}
        `

        console.log(`🎉 User ${userId} earned ${badgeName} badge and ${bonusPoints} reputation points!`)
      }
    }
  }
}

function getBadgeType(streak: number): string {
  switch (streak) {
    case 7: return '7_DAY_ACTIVE'
    case 30: return '30_DAY_ANALYST'
    case 100: return 'CONSISTENCY_MASTER'
    default: return ''
  }
}

function getBadgeInfo(streak: number) {
  switch (streak) {
    case 7:
      return {
        badgeType: '7_DAY_ACTIVE',
        badgeName: '🔥 7 Day Active',
        badgeIcon: '🔥',
        bonusPoints: 10
      }
    case 30:
      return {
        badgeType: '30_DAY_ANALYST',
        badgeName: '⚡ 30 Day Analyst',
        badgeIcon: '⚡',
        bonusPoints: 50
      }
    case 100:
      return {
        badgeType: 'CONSISTENCY_MASTER',
        badgeName: '🧠 Consistency Master',
        badgeIcon: '🧠',
        bonusPoints: 100
      }
    default:
      return null
  }
}

// Export for use in API routes
export { awardStreakBonuses, getBadgeInfo }

// Run cron job if called directly
if (require.main === module) {
  runDailyEngagementCron()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Daily engagement cron failed:', error)
      process.exit(1)
    })
}

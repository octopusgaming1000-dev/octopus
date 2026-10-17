import { prisma } from '@/lib/prisma'

export interface CooldownInfo {
  isActive: boolean
  cooldownEndsAt: Date | null
  remainingSeconds: number
  reason: string
  severityLevel: number
}

export class CooldownService {
  /**
   * Check if user is currently in cooldown
   */
  static async getUserCooldown(userId: string): Promise<CooldownInfo> {
    const cooldown: any[] = await prisma.$queryRaw`
      SELECT * FROM user_cooldowns 
      WHERE userId = ${userId} AND cooldownEndsAt > datetime('now')
      ORDER BY severityLevel DESC, cooldownEndsAt DESC
      LIMIT 1
    `

    if (cooldown.length === 0) {
      return {
        isActive: false,
        cooldownEndsAt: null,
        remainingSeconds: 0,
        reason: '',
        severityLevel: 0
      }
    }

    const cd = cooldown[0]
    const remainingSeconds = Math.max(0, Math.floor((new Date(cd.cooldownEndsAt).getTime() - Date.now()) / 1000))

    return {
      isActive: remainingSeconds > 0,
      cooldownEndsAt: cd.cooldownEndsAt,
      remainingSeconds,
      reason: cd.reason,
      severityLevel: cd.severityLevel
    }
  }

  /**
   * Check for rapid posting and apply cooldown if needed
   * Rules: 5 messages in 20 seconds → 30s cooldown
   */
  static async checkRapidPosting(userId: string): Promise<{ shouldBlock: boolean; cooldownInfo: CooldownInfo }> {
    // Check current cooldown first
    const currentCooldown = await this.getUserCooldown(userId)
    if (currentCooldown.isActive) {
      return { shouldBlock: true, cooldownInfo: currentCooldown }
    }

    // Check for rapid posting (5 messages in 20 seconds)
    const recentMessages: any[] = await prisma.$queryRaw`
      SELECT COUNT(*) as count, MIN(createdAt) as firstMessageTime
      FROM chat_messages
      WHERE userId = ${userId} 
        AND createdAt > datetime('now', '-20 seconds')
        AND isDeleted = 0
    `

    const messageCount = recentMessages[0]?.count || 0

    if (messageCount >= 5) {
      // Apply cooldown based on repeat offenses
      const recentCooldowns: any[] = await prisma.$queryRaw`
        SELECT COUNT(*) as offenseCount
        FROM user_cooldowns
        WHERE userId = ${userId} 
          AND reason = 'rapid_posting'
          AND createdAt > datetime('now', '-1 hour')
      `

      const offenseCount = recentCooldowns[0]?.offenseCount || 0
      let severityLevel = 1
      let cooldownDuration = 30 // 30 seconds for first offense

      // Escalate cooldown for repeat offenses
      if (offenseCount >= 3) {
        severityLevel = 4
        cooldownDuration = 3600 // 1 hour
      } else if (offenseCount >= 2) {
        severityLevel = 3
        cooldownDuration = 600 // 10 minutes
      } else if (offenseCount >= 1) {
        severityLevel = 2
        cooldownDuration = 120 // 2 minutes
      }

      await this.applyCooldown(userId, 'rapid_posting', cooldownDuration, severityLevel)
      
      // Apply visibility penalty to recent messages
      const { MessageVisibilityService } = await import('./message-visibility-service')
      await MessageVisibilityService.applyRapidPostingPenalty(userId, 15)

      const newCooldown = await this.getUserCooldown(userId)
      return { shouldBlock: true, cooldownInfo: newCooldown }
    }

    return { shouldBlock: false, cooldownInfo: currentCooldown }
  }

  /**
   * Apply cooldown to user
   */
  static async applyCooldown(userId: string, reason: string, durationSeconds: number, severityLevel: number = 1): Promise<void> {
    const cooldownEndsAt = new Date(Date.now() + durationSeconds * 1000)

    await prisma.$queryRaw`
      INSERT OR REPLACE INTO user_cooldowns (id, userId, cooldownEndsAt, reason, severityLevel, createdAt)
      VALUES (
        COALESCE((SELECT id FROM user_cooldowns WHERE userId = ${userId}), 'cd_' || hex(randomblob(9))),
        ${userId}, 
        ${cooldownEndsAt.toISOString()}, 
        ${reason}, 
        ${severityLevel}, 
        datetime('now')
      )
    `
  }

  /**
   * Check for harassment patterns (repeated targeting of same user)
   */
  static async checkHarassment(userId: string, messageContent: string, replyToId?: string): Promise<{ shouldBlock: boolean; cooldownInfo: CooldownInfo }> {
    // Check current cooldown first
    const currentCooldown = await this.getUserCooldown(userId)
    if (currentCooldown.isActive) {
      return { shouldBlock: true, cooldownInfo: currentCooldown }
    }

    // Check for repeated replies to same user in last 10 messages
    if (replyToId) {
      const targetUserId: any[] = await prisma.$queryRaw`
        SELECT userId FROM chat_messages WHERE id = ${replyToId}
      `

      if (targetUserId.length > 0) {
        const targetId = targetUserId[0].userId

        // Count replies to same user in last 10 messages
        const recentReplies: any[] = await prisma.$queryRaw`
          SELECT COUNT(*) as replyCount
          FROM chat_messages
          WHERE userId = ${userId} 
            AND replyToId IN (
              SELECT id FROM chat_messages WHERE userId = ${targetId}
            )
            AND createdAt > datetime('now', '-5 minutes')
            AND isDeleted = 0
        `

        const replyCount = recentReplies[0]?.replyCount || 0

        if (replyCount >= 5) {
          // Apply harassment cooldown
          await this.applyCooldown(userId, 'harassment_detection', 300, 2) // 5 minutes
          
          const newCooldown = await this.getUserCooldown(userId)
          return { shouldBlock: true, cooldownInfo: newCooldown }
        }
      }
    }

    // Check for repeated mentions of same username
    const mentionRegex = /@(\w+)/g
    const mentions = messageContent.match(mentionRegex)
    
    if (mentions && mentions.length >= 3) {
      // Check if mentioning the same user repeatedly
      const uniqueMentions = [...new Set(mentions)]
      if (uniqueMentions.length === 1) {
        // Same user mentioned 3+ times
        await this.applyCooldown(userId, 'harassment_detection', 180, 1) // 3 minutes
        
        const newCooldown = await this.getUserCooldown(userId)
        return { shouldBlock: true, cooldownInfo: newCooldown }
      }
    }

    return { shouldBlock: false, cooldownInfo: currentCooldown }
  }

  /**
   * Clear expired cooldowns
   */
  static async clearExpiredCooldowns(): Promise<void> {
    await prisma.$queryRaw`
      DELETE FROM user_cooldowns 
      WHERE cooldownEndsAt <= datetime('now')
    `
  }

  /**
   * Get user's cooldown history
   */
  static async getCooldownHistory(userId: string, limit: number = 10) {
    const history: any[] = await prisma.$queryRaw`
      SELECT 
        reason,
        severityLevel,
        cooldownEndsAt,
        createdAt,
        CASE 
          WHEN cooldownEndsAt > datetime('now') THEN 'active'
          ELSE 'expired'
        END as status
      FROM user_cooldowns
      WHERE userId = ${userId}
      ORDER BY createdAt DESC
      LIMIT ${limit}
    `

    return history
  }

  /**
   * Manually remove cooldown (admin function)
   */
  static async removeCooldown(userId: string): Promise<void> {
    await prisma.$queryRaw`
      DELETE FROM user_cooldowns WHERE userId = ${userId}
    `
  }

  /**
   * Get cooldown statistics
   */
  static async getCooldownStats() {
    const stats: any[] = await prisma.$queryRaw`
      SELECT 
        COUNT(*) as totalActiveCooldowns,
        COUNT(CASE WHEN reason = 'rapid_posting' THEN 1 END) as rapidPostingCooldowns,
        COUNT(CASE WHEN reason = 'harassment_detection' THEN 1 END) as harassmentCooldowns,
        AVG(severityLevel) as avgSeverityLevel,
        COUNT(CASE WHEN severityLevel >= 3 THEN 1 END) as severeCooldowns
      FROM user_cooldowns
      WHERE cooldownEndsAt > datetime('now')
    `

    return stats[0]
  }
}

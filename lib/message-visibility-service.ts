import { prisma } from '@/lib/prisma'

export interface VisibilityScore {
  baseScore: number
  reputationBonus: number
  reactionBonus: number
  reportPenalty: number
  spamPenalty: number
  rapidPostPenalty: number
  finalScore: number
  isCollapsed: boolean
}

export class MessageVisibilityService {
  /**
   * Calculate visibility score for a message
   * Formula: base_score + reputation_bonus + reaction_bonus - report_penalty - spam_penalty - rapid_post_penalty
   */
  static async calculateVisibilityScore(messageId: string): Promise<VisibilityScore> {
    // Get message with user reputation and metrics
    const messageData: any[] = await prisma.$queryRaw`
      SELECT 
        cm.id,
        cm.userId,
        cm.visibilityScore as currentScore,
        cm.spamFlagCount,
        cm.reportCount,
        cm.rapidPostPenalty,
        ur.reputationPoints,
        ur.accuracyScore,
        ur.totalPredictions,
        COUNT(DISTINCT mr.id) as reactionCount,
        COUNT(DISTINCT mrep.id) as activeReportCount
      FROM chat_messages cm
      LEFT JOIN user_reputations ur ON cm.userId = ur.userId
      LEFT JOIN message_reactions mr ON cm.id = mr.messageId
      LEFT JOIN message_reports mrep ON cm.id = mrep.messageId AND mrep.isActive = 1
      WHERE cm.id = ${messageId}
      GROUP BY cm.id
    `

    if (messageData.length === 0) {
      throw new Error('Message not found')
    }

    const msg = messageData[0]

    // Base score (everyone starts at 0)
    let baseScore = 0

    // Reputation bonus (up to +50)
    const reputationPoints = msg.reputationPoints || 0
    const reputationBonus = Math.min(reputationPoints / 10, 50) // Max +50 at 500+ points

    // Reaction bonus (up to +30)
    const positiveReactions = msg.reactionCount || 0
    const reactionBonus = Math.min(positiveReactions * 2, 30) // +2 per reaction, max +30

    // Report penalty (up to -100)
    const activeReports = msg.activeReportCount || 0
    const reportPenalty = Math.min(activeReports * 25, 100) // -25 per report, max -100

    // Spam penalty (up to -50)
    const spamFlags = msg.spamFlagCount || 0
    const spamPenalty = Math.min(spamFlags * 10, 50) // -10 per spam flag, max -50

    // Rapid post penalty (from existing calculation)
    const rapidPostPenalty = msg.rapidPostPenalty || 0

    // Calculate final score
    const finalScore = baseScore + reputationBonus + reactionBonus - reportPenalty - spamPenalty - rapidPostPenalty

    // Determine if message should be collapsed (score < -20)
    const isCollapsed = finalScore < -20

    return {
      baseScore,
      reputationBonus,
      reactionBonus,
      reportPenalty,
      spamPenalty,
      rapidPostPenalty,
      finalScore,
      isCollapsed
    }
  }

  /**
   * Update message visibility score in database
   */
  static async updateMessageVisibility(messageId: string): Promise<void> {
    const score = await this.calculateVisibilityScore(messageId)

    await prisma.$queryRaw`
      UPDATE chat_messages 
      SET 
        visibilityScore = ${score.finalScore},
        isCollapsed = ${score.isCollapsed ? 1 : 0},
        lastScoreUpdate = datetime('now')
      WHERE id = ${messageId}
    `
  }

  /**
   * Batch update visibility scores for multiple messages
   */
  static async batchUpdateVisibility(messageIds: string[]): Promise<void> {
    for (const messageId of messageIds) {
      try {
        await this.updateMessageVisibility(messageId)
      } catch (error) {
        console.error(`Failed to update visibility for message ${messageId}:`, error)
      }
    }
  }

  /**
   * Get messages sorted by visibility score (for prioritized display)
   */
  static async getPrioritizedMessages(roomId: string, limit: number = 50, offset: number = 0) {
    const messages: any[] = await prisma.$queryRaw`
      SELECT 
        cm.*,
        u.name as userName,
        u.image as userImage,
        ur.reputationPoints as userReputationPoints,
        ur.accuracyScore as userAccuracyScore,
        ur.rankTier as userRankTier,
        ur.totalPredictions as userTotalPredictions,
        COUNT(DISTINCT mr.id) as reactionCount,
        GROUP_CONCAT(DISTINCT mr.reactionType) as reactions,
        CASE 
          WHEN cm.visibilityScore >= 30 THEN 'high'
          WHEN cm.visibilityScore >= 0 THEN 'normal'
          WHEN cm.visibilityScore >= -20 THEN 'low'
          ELSE 'collapsed'
        END as visibilityLevel
      FROM chat_messages cm
      LEFT JOIN users u ON cm.userId = u.id
      LEFT JOIN user_reputations ur ON cm.userId = ur.userId
      LEFT JOIN message_reactions mr ON cm.id = mr.messageId
      WHERE cm.roomId = ${roomId} AND cm.isDeleted = 0
      GROUP BY cm.id
      ORDER BY 
        CASE 
          WHEN cm.visibilityScore >= 30 THEN 1
          WHEN cm.visibilityScore >= 0 THEN 2
          WHEN cm.visibilityScore >= -20 THEN 3
          ELSE 4
        END,
        cm.createdAt DESC
      LIMIT ${limit} OFFSET ${offset}
    `

    return messages.reverse() // Show oldest first within each priority group
  }

  /**
   * Apply rapid posting penalty to user's recent messages
   */
  static async applyRapidPostingPenalty(userId: string, penaltyAmount: number): Promise<void> {
    // Apply penalty to messages from last 5 minutes
    await prisma.$queryRaw`
      UPDATE chat_messages 
      SET rapidPostPenalty = rapidPostPenalty + ${penaltyAmount},
          lastScoreUpdate = datetime('now')
      WHERE userId = ${userId} 
        AND createdAt > datetime('now', '-5 minutes')
        AND isDeleted = 0
    `

    // Recalculate visibility for affected messages
    const recentMessages: any[] = await prisma.$queryRaw`
      SELECT id FROM chat_messages 
      WHERE userId = ${userId} 
        AND createdAt > datetime('now', '-5 minutes')
        AND isDeleted = 0
    `

    const messageIds = recentMessages.map(m => m.id)
    await this.batchUpdateVisibility(messageIds)
  }

  /**
   * Flag message as spam and update visibility
   */
  static async flagMessageAsSpam(messageId: string): Promise<void> {
    await prisma.$queryRaw`
      UPDATE chat_messages 
      SET spamFlagCount = spamFlagCount + 1,
          lastScoreUpdate = datetime('now')
      WHERE id = ${messageId}
    `

    await this.updateMessageVisibility(messageId)
  }

  /**
   * Add report to message and update visibility
   */
  static async reportMessage(messageId: string, reporterId: string, reason: string): Promise<void> {
    // Check if already reported by this user
    const existingReport: any[] = await prisma.$queryRaw`
      SELECT id FROM message_reports 
      WHERE messageId = ${messageId} AND reporterId = ${reporterId}
    `

    if (existingReport.length > 0) {
      throw new Error('You have already reported this message')
    }

    // Add report
    await prisma.$queryRaw`
      INSERT INTO message_reports (id, messageId, reporterId, reason, isActive, createdAt)
      VALUES ('mr_' || hex(randomblob(9)), ${messageId}, ${reporterId}, ${reason}, 1, datetime('now'))
    `

    // Update message report count
    await prisma.$queryRaw`
      UPDATE chat_messages 
      SET reportCount = reportCount + 1,
          lastScoreUpdate = datetime('now')
      WHERE id = ${messageId}
    `

    await this.updateMessageVisibility(messageId)
  }

  /**
   * Get visibility statistics for a room
   */
  static async getRoomVisibilityStats(roomId: string) {
    const stats: any[] = await prisma.$queryRaw`
      SELECT 
        COUNT(*) as totalMessages,
        COUNT(CASE WHEN visibilityScore >= 30 THEN 1 END) as highVisibility,
        COUNT(CASE WHEN visibilityScore >= 0 AND visibilityScore < 30 THEN 1 END) as normalVisibility,
        COUNT(CASE WHEN visibilityScore >= -20 AND visibilityScore < 0 THEN 1 END) as lowVisibility,
        COUNT(CASE WHEN visibilityScore < -20 THEN 1 END) as collapsedMessages,
        AVG(visibilityScore) as avgVisibilityScore
      FROM chat_messages 
      WHERE roomId = ${roomId} AND isDeleted = 0
    `

    return stats[0]
  }
}

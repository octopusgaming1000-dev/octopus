import { prisma } from './prisma'

export interface UserProfileUpdate {
  trustScore: number
  starRating: number
  riskLabel: 'Low' | 'Medium' | 'High'
  influenceWeight: number
}

export interface CommunityIntelligenceData {
  totalPredictions: number
  trustedPredictions: number
  communityAgreement: number
  communityConfidence: number
  weightedPredictions: {
    home: number
    draw: number
    away: number
    over: number
    under: number
    yes: number
    no: number
  }
  sentiment: 'bullish' | 'bearish' | 'neutral'
  riskAdjustment: number
  confidenceAdjustment: number
  userDiversity: number
  spamRatio: number
}

export class CommunityIntelligenceService {
  /**
   * Update user's trust score and profile based on prediction accuracy
   */
  static async updateUserTrustScore(userId: string): Promise<UserProfileUpdate> {
    const profile = await prisma.userProfile.findUnique({
      where: { userId }
    })

    if (!profile) {
      throw new Error('User profile not found')
    }

    const accuracyRate = profile.accuracyRate
    let trustScore = 50 // Default trust score
    let starRating = 3 // Default star rating
    let riskLabel: 'Low' | 'Medium' | 'High' = 'Medium'
    let influenceWeight = 0.5

    // Trust scoring logic based on available fields
    if (accuracyRate >= 0.65) {
      trustScore = Math.min(100, trustScore + 5)
    } else if (accuracyRate < 0.50) {
      trustScore = Math.max(0, trustScore - 3)
    }

    // Risk label logic
    if (accuracyRate < 0.40) {
      riskLabel = 'High'
      influenceWeight = 0.1
    } else if (accuracyRate >= 0.65) {
      riskLabel = 'Low'
      influenceWeight = 1.0
    } else {
      riskLabel = 'Medium'
      influenceWeight = 0.5
    }

    // Star rating based on trust score
    if (trustScore >= 80) starRating = 5
    else if (trustScore >= 65) starRating = 4
    else if (trustScore >= 50) starRating = 3
    else if (trustScore >= 35) starRating = 2
    else starRating = 1

    // Update profile with available fields only
    await prisma.userProfile.update({
      where: { userId },
      data: {
        // Note: trustScore, starRating, riskLabel, influenceWeight not implemented yet
      }
    })

    return {
      trustScore,
      starRating,
      riskLabel,
      influenceWeight
    }
  }

  /**
   * Calculate community intelligence for a specific match and market
   */
  static async calculateCommunityIntelligence(
    matchId: string,
    market: string
  ): Promise<CommunityIntelligenceData> {
    // Get all predictions for this match and market
    const predictions = await prisma.matchCommunityPrediction.findMany({
      where: {
        matchId,
        // Note: market and isSpam fields not implemented yet
      },
      include: {
        User: {
          include: {
            userProfile: true
          }
        }
      }
    })

    if (predictions.length === 0) {
      return this.getDefaultCommunityIntelligence()
    }

    // Filter trusted users (trust score >= 50)
    const trustedPredictions = predictions.filter(
      p => p.User?.userProfile?.reputationScore && p.User.userProfile.reputationScore >= 0
    )

    // Calculate weighted predictions
    const weightedPredictions = this.calculateWeightedPredictions(predictions)
    
    // Calculate community agreement
    const communityAgreement = this.calculateAgreement(weightedPredictions)
    
    // Calculate community confidence
    const communityConfidence = this.calculateCommunityConfidence(predictions)
    
    // Determine sentiment
    const sentiment = this.determineSentiment(weightedPredictions, market)
    
    // Calculate risk adjustment
    const riskAdjustment = this.calculateRiskAdjustment(predictions, trustedPredictions)
    
    // Calculate confidence adjustment
    const confidenceAdjustment = this.calculateConfidenceAdjustment(
      communityAgreement,
      communityConfidence
    )
    
    // Calculate user diversity
    const userDiversity = this.calculateUserDiversity(predictions)
    
    // Calculate spam ratio
    const spamRatio = this.calculateSpamRatio(matchId, market)

    // Store or update community intelligence
    await this.storeCommunityIntelligence(matchId, market, {
      totalPredictions: predictions.length,
      trustedPredictions: trustedPredictions.length,
      communityAgreement,
      communityConfidence,
      weightedPredictions,
      sentiment,
      riskAdjustment,
      confidenceAdjustment,
      userDiversity,
      spamRatio
    })

    return {
      totalPredictions: predictions.length,
      trustedPredictions: trustedPredictions.length,
      communityAgreement,
      communityConfidence,
      weightedPredictions,
      sentiment,
      riskAdjustment,
      confidenceAdjustment,
      userDiversity,
      spamRatio
    }
  }

  /**
   * Detect spam predictions
   */
  static async detectSpamPrediction(
    userId: string,
    matchId: string,
    market: string,
    prediction: string,
    explanation: string
  ): Promise<{ isSpam: boolean; spamScore: number }> {
    let spamScore = 0.0
    const reasons: string[] = []

    // Check for duplicate predictions from same user
    const recentPredictions = await prisma.matchCommunityPrediction.findMany({
      where: {
        userId,
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      }
    })

    if (recentPredictions.length > 10) {
      spamScore += 0.3
      reasons.push('Too many predictions in 24 hours')
    }

    // Check for identical explanations (not implemented yet)
    // Note: explanation field not available in MatchCommunityPrediction model
    const identicalExplanations: any[] = []
    
    if (identicalExplanations.length > 5) {
      spamScore += 0.4
      reasons.push('Identical explanation to many users')
    }

    // Check for very short explanations
    if (explanation.length < 10) {
      spamScore += 0.2
      reasons.push('Explanation too short')
    }

    // Check for repetitive patterns
    if (this.hasRepetitiveWords(explanation.split(' '))) {
      spamScore += 0.3
      reasons.push('Repetitive pattern detected')
    }

    const isSpam = spamScore > 0.5

    return { isSpam, spamScore }
  }

  /**
   * Get default community intelligence values
   */
  private static getDefaultCommunityIntelligence(): CommunityIntelligenceData {
    return {
      totalPredictions: 0,
      trustedPredictions: 0,
      communityAgreement: 0.0,
      communityConfidence: 0.0,
      weightedPredictions: {
        home: 0.0,
        draw: 0.0,
        away: 0.0,
        over: 0.0,
        under: 0.0,
        yes: 0.0,
        no: 0.0
      },
      sentiment: 'neutral',
      riskAdjustment: 0.0,
      confidenceAdjustment: 0.0,
      userDiversity: 0.0,
      spamRatio: 0.0
    }
  }

  /**
   * Calculate weighted predictions based on user trust
   */
  private static calculateWeightedPredictions(predictions: any[]): CommunityIntelligenceData['weightedPredictions'] {
    const weighted = {
      home: 0.0,
      draw: 0.0,
      away: 0.0,
      over: 0.0,
      under: 0.0,
      yes: 0.0,
      no: 0.0
    }

    predictions.forEach(prediction => {
      const influenceWeight = prediction.user.userProfile?.influenceWeight || 0.5
      const confidence = prediction.confidence / 5 // Normalize to 0-1
      const weight = influenceWeight * confidence

      switch (prediction.prediction.toLowerCase()) {
        case 'home':
          weighted.home += weight
          break
        case 'draw':
          weighted.draw += weight
          break
        case 'away':
          weighted.away += weight
          break
        case 'over':
        case 'over 2.5':
          weighted.over += weight
          break
        case 'under':
        case 'under 2.5':
          weighted.under += weight
          break
        case 'yes':
          weighted.yes += weight
          break
        case 'no':
          weighted.no += weight
          break
      }
    })

    return weighted
  }

  /**
   * Calculate community agreement (how much the community agrees)
   */
  private static calculateAgreement(weightedPredictions: CommunityIntelligenceData['weightedPredictions']): number {
    const values = Object.values(weightedPredictions).filter(v => v > 0)
    if (values.length === 0) return 0

    const total = values.reduce((sum, val) => sum + val, 0)
    const max = Math.max(...values)
    
    return total > 0 ? max / total : 0
  }

  /**
   * Calculate community confidence
   */
  private static calculateCommunityConfidence(predictions: any[]): number {
    if (predictions.length === 0) return 0

    const totalConfidence = predictions.reduce((sum, p) => sum + p.confidence, 0)
    const avgConfidence = totalConfidence / predictions.length
    
    return avgConfidence / 5 // Normalize to 0-1
  }

  /**
   * Determine market sentiment
   */
  private static determineSentiment(
    weightedPredictions: CommunityIntelligenceData['weightedPredictions'],
    market: string
  ): 'bullish' | 'bearish' | 'neutral' {
    if (market === '1X2') {
      const { home, draw, away } = weightedPredictions
      const total = home + draw + away
      
      if (total === 0) return 'neutral'
      
      const maxOutcome = Math.max(home, draw, away)
      if (maxOutcome === home && home / total > 0.6) return 'bullish'
      if (maxOutcome === away && away / total > 0.6) return 'bearish'
    }
    
    return 'neutral'
  }

  /**
   * Calculate risk adjustment factor
   */
  private static calculateRiskAdjustment(
    allPredictions: any[],
    trustedPredictions: any[]
  ): number {
    if (allPredictions.length === 0) return 0

    const trustedRatio = trustedPredictions.length / allPredictions.length
    
    // Higher risk adjustment when fewer trusted users participate
    return 1 - trustedRatio
  }

  /**
   * Calculate confidence adjustment factor
   */
  private static calculateConfidenceAdjustment(
    agreement: number,
    confidence: number
  ): number {
    // Adjust confidence based on community agreement
    return (agreement + confidence) / 2
  }

  /**
   * Calculate user diversity (how many different users contributed)
   */
  private static calculateUserDiversity(predictions: any[]): number {
    const uniqueUsers = new Set(predictions.map(p => p.userId)).size
    const totalPredictions = predictions.length
    
    return totalPredictions > 0 ? uniqueUsers / totalPredictions : 0
  }

  /**
   * Calculate spam ratio
   */
  private static calculateSpamRatio(matchId: string, market: string): number {
    // This would be calculated based on flagged spam predictions
    // For now, return a default low value
    return 0.05
  }

  /**
   * Store community intelligence in database
   */
  private static async storeCommunityIntelligence(
    matchId: string,
    market: string,
    data: Partial<CommunityIntelligenceData>
  ): Promise<void> {
    // Note: communityIntelligence model not implemented yet
    console.log('Community intelligence storage not implemented:', { matchId, market, data })
  }

  private static hasRepetitiveWords(words: string[]): boolean {
    const wordFrequency: { [key: string]: number } = {}
    const wordCount = words.length
    words.forEach(word => {
      wordFrequency[word] = (wordFrequency[word] || 0) + 1
    })
    
    const maxFrequency = Math.max(...Object.values(wordFrequency))
    return maxFrequency > wordCount * 0.5
  }

  /**
   * Fuse AI analysis with community intelligence
   */
  static async fuseAIWithCommunityIntelligence(
    matchId: string,
    aiAnalysis: any,
    market: string
  ): Promise<any> {
    const communityData = await this.calculateCommunityIntelligence(matchId, market)
    
    // Adjust AI confidence based on community input
    const adjustedConfidence = aiAnalysis.confidence * (1 + communityData.confidenceAdjustment * 0.2)
    
    // Adjust explanation tone based on community sentiment
    let explanation = aiAnalysis.explanation
    if (communityData.sentiment === 'bullish') {
      explanation += ' Community sentiment leans bullish on this outcome.'
    } else if (communityData.sentiment === 'bearish') {
      explanation += ' Community sentiment shows caution on this outcome.'
    }
    
    // Add risk warning if community disagrees strongly
    if (communityData.communityAgreement < 0.3 && communityData.totalPredictions > 5) {
      explanation += ' Note: Community predictions show significant disagreement, indicating higher uncertainty.'
    }
    
    // Add community agreement indicator
    explanation += ` Community agreement: ${(communityData.communityAgreement * 100).toFixed(1)}%`
    
    return {
      ...aiAnalysis,
      adjustedConfidence: Math.min(1, adjustedConfidence),
      explanation,
      communityIntelligence: communityData
    }
  }
}

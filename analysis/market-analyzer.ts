/**
 * Advanced market analysis using weighted statistics, context, and crowd adjustments
 */

interface MarketInput {
  odds: number
  stats?: {
    homeForm?: number
    awayForm?: number
    headToHead?: number
    recentTrends?: number
  }
  context?: {
    injuries?: number
    venue?: number
    referee?: number
    weather?: number
  }
  crowd?: {
    selectionCount?: number
    totalSubmissions?: number
    percentage?: number
  }
}

interface MarketAnalysis {
  probability: number
  riskLevel: 'low' | 'medium' | 'high'
  explanation: string
  breakdown: {
    impliedProbability: number
    statsScore: number
    contextAdj: number
    crowdAdj: number
    baseProbability: number
    finalProbability: number
  }
}

/**
 * Clamp value between min and max
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

/**
 * Compute weighted statistics score (0-1 range)
 */
function weightedStats(stats?: MarketInput['stats']): number {
  if (!stats) return 0.5 // Neutral if no stats

  const weights = {
    homeForm: 0.3,
    awayForm: 0.3,
    headToHead: 0.2,
    recentTrends: 0.2,
  }

  let score = 0
  let totalWeight = 0

  if (stats.homeForm !== undefined) {
    score += stats.homeForm * weights.homeForm
    totalWeight += weights.homeForm
  }
  if (stats.awayForm !== undefined) {
    score += stats.awayForm * weights.awayForm
    totalWeight += weights.awayForm
  }
  if (stats.headToHead !== undefined) {
    score += stats.headToHead * weights.headToHead
    totalWeight += weights.headToHead
  }
  if (stats.recentTrends !== undefined) {
    score += stats.recentTrends * weights.recentTrends
    totalWeight += weights.recentTrends
  }

  return totalWeight > 0 ? clamp(score / totalWeight, 0, 1) : 0.5
}

/**
 * Compute context adjustment factor (-0.2 to +0.2)
 */
function computeContext(context?: MarketInput['context']): number {
  if (!context) return 0 // No adjustment if no context

  const weights = {
    injuries: 0.4,
    venue: 0.25,
    referee: 0.2,
    weather: 0.15,
  }

  let adjustment = 0
  let totalWeight = 0

  // Context values are -1 to +1 where -1 is negative, 0 neutral, +1 positive
  if (context.injuries !== undefined) {
    adjustment += context.injuries * weights.injuries
    totalWeight += weights.injuries
  }
  if (context.venue !== undefined) {
    adjustment += context.venue * weights.venue
    totalWeight += weights.venue
  }
  if (context.referee !== undefined) {
    adjustment += context.referee * weights.referee
    totalWeight += weights.referee
  }
  if (context.weather !== undefined) {
    adjustment += context.weather * weights.weather
    totalWeight += weights.weather
  }

  const avgAdjustment = totalWeight > 0 ? adjustment / totalWeight : 0
  // Scale to -0.2 to +0.2 range
  return clamp(avgAdjustment * 0.2, -0.2, 0.2)
}

/**
 * Compute crowd adjustment factor (-0.1 to +0.1)
 */
function computeCrowd(crowd?: MarketInput['crowd']): number {
  if (!crowd || !crowd.selectionCount || !crowd.totalSubmissions) return 0

  const percentage = crowd.percentage || (crowd.selectionCount / crowd.totalSubmissions) * 100

  // If > 50% of users selected this, slight positive adjustment
  // If < 10% selected this, slight negative adjustment
  // Otherwise neutral
  if (percentage > 50) {
    return clamp((percentage - 50) / 500, 0, 0.1) // Max +0.1 at 100%
  } else if (percentage < 10) {
    return clamp((percentage - 10) / 100, -0.1, 0) // Min -0.1 at 0%
  }

  return 0
}

/**
 * Classify risk level based on probability
 */
function classifyRisk(probability: number): 'low' | 'medium' | 'high' {
  if (probability > 0.6) return 'low'
  if (probability > 0.35) return 'medium'
  return 'high'
}

/**
 * Generate explanation based on analysis breakdown
 */
function generateExplanation(
  implied: number,
  statsScore: number,
  contextAdj: number,
  crowdAdj: number,
  finalProb: number,
  riskLevel: 'low' | 'medium' | 'high'
): string {
  const impliedPercent = (implied * 100).toFixed(1)
  const finalPercent = (finalProb * 100).toFixed(1)
  const statsPercent = (statsScore * 100).toFixed(1)

  let explanation = `Based on odds of ${(1 / implied).toFixed(2)}, the implied probability is ${impliedPercent}%. `
  
  explanation += `When factoring in statistical analysis (${statsPercent}%) and contextual adjustments, `
  explanation += `the estimated probability range is ${finalPercent}%. `

  if (contextAdj > 0.05) {
    explanation += `Contextual factors suggest a positive adjustment. `
  } else if (contextAdj < -0.05) {
    explanation += `Contextual factors suggest some caution. `
  }

  if (crowdAdj > 0.03) {
    explanation += `This selection appears relatively popular among users. `
  }

  explanation += `This represents a ${riskLevel} probability outcome. `
  explanation += `Remember that all probabilities are estimates and outcomes remain uncertain. `

  return explanation
}

/**
 * Analyze market using weighted approach
 */
export function analyzeMarket(input: MarketInput): MarketAnalysis {
  const implied = 1 / input.odds

  const statsScore = weightedStats(input.stats)
  const contextAdj = computeContext(input.context)
  const crowdAdj = computeCrowd(input.crowd)

  // Base probability: 45% implied + 40% stats + 15% neutral
  const base = (0.45 * implied) + (0.40 * statsScore) + (0.15 * 0.5)

  // Apply adjustments as multipliers (1 + adjustment)
  const finalProb = base * (1 + contextAdj + crowdAdj)

  const clampedProb = clamp(finalProb, 0.05, 0.95)
  const riskLevel = classifyRisk(clampedProb)

  return {
    probability: clampedProb,
    riskLevel,
    explanation: generateExplanation(implied, statsScore, contextAdj, crowdAdj, clampedProb, riskLevel),
    breakdown: {
      impliedProbability: implied,
      statsScore,
      contextAdj,
      crowdAdj,
      baseProbability: base,
      finalProbability: clampedProb,
    },
  }
}



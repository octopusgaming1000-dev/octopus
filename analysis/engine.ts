import { AnalysisResult } from '@/lib/types'
import { DecodedSelection } from '@/lib/types'
import { analyzeMarket } from './market-analyzer'

/**
 * Calculate implied probability from odds
 */
function calculateImpliedProbability(odds: number): number {
  return 1 / odds
}

/**
 * Calculate combined probability for multiple selections
 */
function calculateCombinedProbability(probabilities: number[]): number {
  return probabilities.reduce((acc, prob) => acc * prob, 1)
}

/**
 * Determine risk level based on probability
 */
function determineRiskLevel(probability: number, isCombined: boolean): 'low' | 'medium' | 'high' {
  if (isCombined) {
    // Combined probabilities are typically lower
    if (probability > 0.3) return 'low'
    if (probability > 0.15) return 'medium'
    return 'high'
  } else {
    // Single selection probabilities
    if (probability > 0.5) return 'low'
    if (probability > 0.3) return 'medium'
    return 'high'
  }
}

/**
 * Calculate probability range with uncertainty
 */
function calculateProbabilityRange(
  baseProbability: number,
  riskLevel: 'low' | 'medium' | 'high'
): { min: number; max: number } {
  // Add uncertainty based on risk level
  const uncertainty = riskLevel === 'high' ? 0.2 : riskLevel === 'medium' ? 0.15 : 0.1

  return {
    min: Math.max(0, baseProbability - uncertainty),
    max: Math.min(1, baseProbability + uncertainty),
  }
}

/**
 * Generate mathematical analysis
 */
function generateMathematicalAnalysis(
  odds: number,
  combinedProbability?: number
): AnalysisResult['mathematicalAnalysis'] {
  const impliedProb = calculateImpliedProbability(odds)

  return {
    impliedProbability: impliedProb,
    combinedProbability,
  }
}

/**
 * Generate statistical analysis (placeholder - would integrate with sports data API)
 */
function generateStatisticalAnalysis(
  fixture: DecodedSelection['fixture']
): AnalysisResult['statisticalAnalysis'] {
  // TODO: Integrate with sports data API (e.g., API-Football, SportRadar)
  // For MVP, return placeholder structure

  return {
    homeForm: 'Recent form data would appear here',
    awayForm: 'Recent form data would appear here',
    headToHead: 'Head-to-head statistics would appear here',
    trends: ['Trend analysis would appear here'],
  }
}

/**
 * Generate contextual analysis (placeholder - would integrate with news/injury APIs)
 */
function generateContextualAnalysis(
  fixture: DecodedSelection['fixture']
): AnalysisResult['contextualAnalysis'] {
  // TODO: Integrate with news/injury APIs
  // For MVP, return placeholder structure

  return {
    injuries: ['Injury information would appear here'],
    formations: 'Expected formations would appear here',
    refereeTendencies: 'Referee statistics would appear here',
    venue: 'Venue statistics would appear here',
  }
}

/**
 * Generate plain English explanation
 */
function generateExplanation(
  selection: DecodedSelection,
  impliedProb: number,
  riskLevel: 'low' | 'medium' | 'high',
  isCombined: boolean
): string {
  const { market, selection: selectionType, odds } = selection
  const { homeTeam, awayTeam } = selection.fixture

  const probPercent = (impliedProb * 100).toFixed(1)
  const riskDescription =
    riskLevel === 'low'
      ? 'relatively lower'
      : riskLevel === 'medium'
      ? 'moderate'
      : 'relatively higher'

  let explanation = `Based on the odds of ${odds.toFixed(2)}, this selection implies a ${probPercent}% probability. `

  if (isCombined) {
    explanation += `This is part of a combined selection, which typically has ${riskDescription} probability of success. `
  } else {
    explanation += `This represents a ${riskDescription} probability outcome. `
  }

  explanation += `The match between ${homeTeam} and ${awayTeam} in the ${selection.fixture.competition} has various factors that could influence the outcome. `

  explanation += `It's important to remember that odds reflect bookmaker assessments and market sentiment, not guaranteed outcomes. `
  explanation += `Many factors including team form, injuries, weather conditions, and unexpected events can affect match results.`

  return explanation
}

/**
 * Analyze a single selection
 */
export function analyzeSelection(
  selection: DecodedSelection,
  isPartOfCombined: boolean = false,
  combinedProbability?: number
): AnalysisResult {
  const { odds } = selection
  const impliedProb = calculateImpliedProbability(odds)
  const finalProb = combinedProbability || impliedProb
  const riskLevel = determineRiskLevel(finalProb, isPartOfCombined)
  const probabilityRange = calculateProbabilityRange(finalProb, riskLevel)

  return {
    impliedProbability: impliedProb,
    combinedProbability,
    riskLevel,
    probabilityRange,
    mathematicalAnalysis: generateMathematicalAnalysis(odds, combinedProbability),
    statisticalAnalysis: generateStatisticalAnalysis(selection.fixture),
    contextualAnalysis: generateContextualAnalysis(selection.fixture),
    explanation: generateExplanation(selection, impliedProb, riskLevel, isPartOfCombined),
  }
}

/**
 * Analyze a single selection using the advanced weighted market analyzer
 */
async function analyzeSelectionAdvanced(
  selection: DecodedSelection,
  isPartOfCombined: boolean = false,
  combinedProbability?: number,
  crowdData?: {
    selectionCount?: number
    totalSubmissions?: number
    percentage?: number
  }
): Promise<AnalysisResult> {
  const { odds } = selection

  // Use the advanced market analyzer
  const marketAnalysis = analyzeMarket({
    odds,
    stats: {
      // Placeholder stats - would come from real data sources
      homeForm: 0.5,
      awayForm: 0.5,
      headToHead: 0.5,
      recentTrends: 0.5,
    },
    context: {
      // Placeholder context - would come from real data sources
      injuries: 0,
      venue: 0,
      referee: 0,
      weather: 0,
    },
    crowd: crowdData,
  })

  // For combined selections, adjust probability
  const finalProb = isPartOfCombined && combinedProbability 
    ? combinedProbability 
    : marketAnalysis.probability

  const riskLevel = isPartOfCombined 
    ? determineRiskLevel(finalProb, true)
    : marketAnalysis.riskLevel

  const probabilityRange = calculateProbabilityRange(finalProb, riskLevel)

  return {
    impliedProbability: marketAnalysis.breakdown.impliedProbability,
    combinedProbability,
    riskLevel,
    probabilityRange,
    mathematicalAnalysis: {
      impliedProbability: marketAnalysis.breakdown.impliedProbability,
      expectedValue: undefined,
      combinedProbability,
      baseProbability: marketAnalysis.breakdown.baseProbability,
      statsScore: marketAnalysis.breakdown.statsScore,
      contextAdjustment: marketAnalysis.breakdown.contextAdj,
      crowdAdjustment: marketAnalysis.breakdown.crowdAdj,
    },
    statisticalAnalysis: generateStatisticalAnalysis(selection.fixture),
    contextualAnalysis: generateContextualAnalysis(selection.fixture),
    explanation: marketAnalysis.explanation,
  }
}

/**
 * Analyze a complete booking code (multiple selections)
 */
export async function analyzeBookingCode(
  selections: DecodedSelection[],
  crowdDataMap?: Map<number, { selectionCount?: number; totalSubmissions?: number; percentage?: number }>
): Promise<AnalysisResult[]> {
  // Calculate combined probability using base probabilities
  const probabilities = selections.map((s) => 1 / s.odds)
  const combinedProb = calculateCombinedProbability(probabilities)

  // Analyze each selection with crowd data if available
  const analyses = await Promise.all(
    selections.map(async (selection, index) => {
      const crowdData = crowdDataMap?.get(index)
      return analyzeSelectionAdvanced(selection, true, combinedProb, crowdData)
    })
  )

  return analyses
}


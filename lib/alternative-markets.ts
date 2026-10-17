/**
 * Generate alternative market options for a given fixture
 * These are suggestions based on probability analysis, not betting advice
 */

export interface AlternativeMarket {
  market: string
  selection: string
  estimatedOdds: number
  impliedProbability: number
  rationale: string
}

export function generateAlternativeMarkets(
  fixture: {
    homeTeam: string
    awayTeam: string
    competition: string
  },
  currentMarket: string,
  currentSelection: string,
  currentOdds: number
): AlternativeMarket[] {
  const alternatives: AlternativeMarket[] = []

  // Only show alternatives if this is a 1X2 market
  if (currentMarket === '1X2') {
    const currentProb = 1 / currentOdds

    // Suggest the other outcomes in 1X2
    if (currentSelection !== 'Home') {
      alternatives.push({
        market: '1X2',
        selection: 'Home',
        estimatedOdds: 2.5, // Placeholder - would come from real odds data
        impliedProbability: 0.4,
        rationale: `Home win could present a different probability profile. Consider comparing with current selection.`,
      })
    }

    if (currentSelection !== 'Draw') {
      alternatives.push({
        market: '1X2',
        selection: 'Draw',
        estimatedOdds: 3.2, // Placeholder
        impliedProbability: 0.31,
        rationale: `Draw outcomes often have different risk characteristics. Worth comparing probabilities.`,
      })
    }

    if (currentSelection !== 'Away') {
      alternatives.push({
        market: '1X2',
        selection: 'Away',
        estimatedOdds: 2.8, // Placeholder
        impliedProbability: 0.36,
        rationale: `Away win might offer different implied probabilities. Compare with current selection.`,
      })
    }

    // Suggest alternative markets for the same fixture
    alternatives.push({
      market: 'Over/Under 2.5',
      selection: 'Over',
      estimatedOdds: 1.9,
      impliedProbability: 0.53,
      rationale: `Over/Under markets can provide different probability distributions. This represents one potential outcome.`,
    })

    alternatives.push({
      market: 'Both Teams to Score',
      selection: 'Yes',
      estimatedOdds: 1.75,
      impliedProbability: 0.57,
      rationale: `Both teams scoring might have different implied probabilities. This is for informational comparison only.`,
    })
  }

  // Sort by implied probability (descending) to show potentially higher probability options first
  return alternatives.sort((a, b) => b.impliedProbability - a.impliedProbability)
}



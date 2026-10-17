import { prisma } from './prisma'

/**
 * Find matching fixture for a given match
 */
export async function findMatchingFixture(
  homeTeam: string,
  awayTeam: string,
  matchDate: string
): Promise<any | null> {
  // Normalize team names for comparison
  const normalize = (str: string) => str.toLowerCase().replace(/\s+/g, ' ').trim()
  const normalizedHome = normalize(homeTeam)
  const normalizedAway = normalize(awayTeam)

  const matchDateObj = new Date(matchDate)

  // Try to find existing fixture
  // Match within 24 hours window
  const startDate = new Date(matchDateObj)
  startDate.setHours(0, 0, 0, 0)
  const endDate = new Date(matchDateObj)
  endDate.setHours(23, 59, 59, 999)

  // Note: fixture model not implemented yet, always return null
  return null
}

// Placeholder functions for compatibility
export async function matchFixture(fixtureData: any): Promise<any> {
  // Note: fixture model not implemented yet
  return {
    id: fixtureData.fixtureId || `manual-fixture-${Date.now()}`,
    homeTeam: fixtureData.homeTeam || 'Unknown',
    awayTeam: fixtureData.awayTeam || 'Unknown',
    kickoffTime: new Date(fixtureData.matchDate || Date.now()),
    competition: fixtureData.competition || 'Unknown'
  }
}

export async function matchSelection(
  fixtureId: string,
  market: string,
  selection: string,
  odds: number,
  metadata?: any
): Promise<any> {
  // Note: selection model not implemented yet
  return {
    id: `selection_${fixtureId}_${market}`,
    fixtureId,
    market,
    selection,
    odds,
    metadata
  }
}
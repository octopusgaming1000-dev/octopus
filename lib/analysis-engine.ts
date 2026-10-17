// AI-Powered Football Analysis Engine
// Educational probability analysis for football betting markets

export interface MatchData {
  homeTeam: string
  awayTeam: string
  market: string
  selection: string
  odds: number
}

export interface StatisticalSignals {
  recentForm: {
    homeTeam: {
      last5Games: string[] // W/D/L
      goalsScored: number[]
      goalsConceded: number[]
    }
    awayTeam: {
      last5Games: string[]
      goalsScored: number[]
      goalsConceded: number[]
    }
  }
  homeAwayStrength: {
    homeTeam: {
      homeWinRate: number
      homeGoalsPerGame: number
      homeCleanSheets: number
    }
    awayTeam: {
      awayWinRate: number
      awayGoalsPerGame: number
      awayCleanSheets: number
    }
  }
  leagueAverages: {
    avgHomeGoals: number
    avgAwayGoals: number
    avgTotalGoals: number
    avgCorners: number
    avgCards: number
  }
  refereeTendencies: {
    avgCardsPerGame: number
    avgCornersPerGame: number
    homeWinRate: number
  }
  matchContext: {
    importance: 'Low' | 'Medium' | 'High'
    weather: 'Good' | 'Rain' | 'Snow' | 'Wind'
    daysSinceLastGame: {
      homeTeam: number
      awayTeam: number
    }
  }
}

export interface MarketAnalysis {
  market: string
  probability_range: [number, number]
  risk_level: 'Low' | 'Medium' | 'High'
  explanation: string
  caution_note: string
}

export interface FlexMarketAnalysis {
  market: string
  probability_estimate: number
  confidence_level: 'Low' | 'Medium' | 'High'
  reasoning: string
}

class FootballAnalysisEngine {
  private generateStatisticalSignals(matchData: MatchData): StatisticalSignals {
    // Simulated statistical signals - in production, this would fetch real data
    return {
      recentForm: {
        homeTeam: {
          last5Games: ['W', 'D', 'W', 'L', 'W'],
          goalsScored: [2, 1, 3, 0, 2],
          goalsConceded: [1, 1, 0, 2, 1]
        },
        awayTeam: {
          last5Games: ['L', 'D', 'L', 'W', 'D'],
          goalsScored: [0, 1, 1, 2, 1],
          goalsConceded: [2, 1, 3, 1, 1]
        }
      },
      homeAwayStrength: {
        homeTeam: {
          homeWinRate: 0.65,
          homeGoalsPerGame: 2.1,
          homeCleanSheets: 3
        },
        awayTeam: {
          awayWinRate: 0.25,
          awayGoalsPerGame: 1.2,
          awayCleanSheets: 1
        }
      },
      leagueAverages: {
        avgHomeGoals: 1.45,
        avgAwayGoals: 1.15,
        avgTotalGoals: 2.6,
        avgCorners: 10.5,
        avgCards: 3.8
      },
      refereeTendencies: {
        avgCardsPerGame: 4.2,
        avgCornersPerGame: 11.0,
        homeWinRate: 0.48
      },
      matchContext: {
        importance: 'Medium',
        weather: 'Good',
        daysSinceLastGame: {
          homeTeam: 7,
          awayTeam: 6
        }
      }
    }
  }

  private analyze1X2Market(matchData: MatchData, signals: StatisticalSignals): MarketAnalysis {
    const { homeTeam, awayTeam, selection } = matchData
    const { recentForm, homeAwayStrength, leagueAverages } = signals

    // Calculate base probabilities from form and strength
    const homeStrength = homeAwayStrength.homeTeam.homeWinRate * 0.4 + 
                       (recentForm.homeTeam.last5Games.filter(r => r === 'W').length / 5) * 0.3 +
                       (homeAwayStrength.homeTeam.homeGoalsPerGame / leagueAverages.avgHomeGoals) * 0.3

    const awayStrength = homeAwayStrength.awayTeam.awayWinRate * 0.4 +
                       (recentForm.awayTeam.last5Games.filter(r => r === 'W').length / 5) * 0.3 +
                       (homeAwayStrength.awayTeam.awayGoalsPerGame / leagueAverages.avgAwayGoals) * 0.3

    // Normalize probabilities
    const totalStrength = homeStrength + awayStrength + 0.2 // Draw probability
    const homeProb = (homeStrength / totalStrength) * 100
    const drawProb = (0.2 / totalStrength) * 100
    const awayProb = (awayStrength / totalStrength) * 100

    let probability: number
    let explanation: string
    let riskLevel: 'Low' | 'Medium' | 'High'
    let cautionNote: string

    switch (selection) {
      case 'Home':
        probability = homeProb
        explanation = `${homeTeam} shows strong home form with ${homeAwayStrength.homeTeam.homeWinRate * 100}% home win rate. Recent form indicates ${recentForm.homeTeam.last5Games.filter(r => r === 'W').length}/5 wins.`
        riskLevel = homeProb > 45 ? 'Low' : homeProb > 35 ? 'Medium' : 'High'
        cautionNote = 'Home advantage can be neutralized by strong away teams or tactical changes.'
        break
      case 'Draw':
        probability = drawProb
        explanation = `Draw probability based on balanced strengths and league average draw rates. Both teams show mixed recent form.`
        riskLevel = 'High'
        cautionNote = 'Draws are highly unpredictable and often influenced by late-game goals.'
        break
      case 'Away':
        probability = awayProb
        explanation = `${awayTeam} shows ${homeAwayStrength.awayTeam.awayWinRate * 100}% away win rate. Recent away form includes ${recentForm.awayTeam.last5Games.filter(r => r === 'W').length}/5 wins.`
        riskLevel = awayProb > 35 ? 'Medium' : 'High'
        cautionNote = 'Away wins depend heavily on team travel fatigue and home crowd pressure.'
        break
      default:
        probability = 0
        explanation = 'Invalid selection'
        riskLevel = 'High'
        cautionNote = 'Please select a valid market option.'
    }

    return {
      market: '1X2',
      probability_range: [Math.max(0, probability - 8), Math.min(100, probability + 8)],
      risk_level: riskLevel,
      explanation,
      caution_note: cautionNote
    }
  }

  private analyzeOverUnderGoals(matchData: MatchData, signals: StatisticalSignals, threshold: number): MarketAnalysis {
    const { homeTeam, awayTeam, selection } = matchData
    const { recentForm, homeAwayStrength, leagueAverages } = signals

    // Calculate expected goals
    const homeExpectedGoals = homeAwayStrength.homeTeam.homeGoalsPerGame
    const awayExpectedGoals = homeAwayStrength.awayTeam.awayGoalsPerGame
    const totalExpectedGoals = homeExpectedGoals + awayExpectedGoals

    // Adjust for recent form
    const homeFormAdjustment = recentForm.homeTeam.goalsScored.reduce((a, b) => a + b, 0) / 5
    const awayFormAdjustment = recentForm.awayTeam.goalsScored.reduce((a, b) => a + b, 0) / 5
    const adjustedExpectedGoals = (homeFormAdjustment + awayFormAdjustment) * 0.8 + totalExpectedGoals * 0.2

    let probability: number
    let explanation: string
    let riskLevel: 'Low' | 'Medium' | 'High'
    let cautionNote: string

    if (selection === 'Over') {
      // Use Poisson-like approximation for Over probability
      probability = Math.min(95, Math.max(5, (adjustedExpectedGoals - threshold) * 25 + 50))
      explanation = `${homeTeam} averages ${homeExpectedGoals.toFixed(1)} goals at home, ${awayTeam} averages ${awayExpectedGoals.toFixed(1)} away. Combined expected: ${adjustedExpectedGoals.toFixed(1)} goals.`
      riskLevel = probability > 65 ? 'Low' : probability > 50 ? 'Medium' : 'High'
      cautionNote = 'Over markets can fail if teams play defensively or if key attackers are missing.'
    } else {
      // Under probability
      probability = Math.min(95, Math.max(5, 100 - ((adjustedExpectedGoals - threshold) * 25 + 50)))
      explanation = `League average is ${leagueAverages.avgTotalGoals} goals. Both teams show defensive tendencies with ${recentForm.homeTeam.goalsConceded.reduce((a, b) => a + b, 0) / 5 + recentForm.awayTeam.goalsConceded.reduce((a, b) => a + b, 0) / 5} goals conceded per game.`
      riskLevel = probability > 65 ? 'Low' : probability > 50 ? 'Medium' : 'High'
      cautionNote = 'Under markets can fail if teams need goals for league position or if game opens up early.'
    }

    return {
      market: `Over/Under ${threshold} Goals`,
      probability_range: [Math.max(0, probability - 10), Math.min(100, probability + 10)],
      risk_level: riskLevel,
      explanation,
      caution_note: cautionNote
    }
  }

  private analyzeBTTS(matchData: MatchData, signals: StatisticalSignals): MarketAnalysis {
    const { homeTeam, awayTeam, selection } = matchData
    const { recentForm, homeAwayStrength, leagueAverages } = signals

    // Calculate BTTS probability
    const homeScoringProb = Math.min(1, homeAwayStrength.homeTeam.homeGoalsPerGame / leagueAverages.avgHomeGoals)
    const awayScoringProb = Math.min(1, homeAwayStrength.awayTeam.awayGoalsPerGame / leagueAverages.avgAwayGoals)
    
    const homeConcedingProb = recentForm.homeTeam.goalsConceded.filter(g => g > 0).length / 5
    const awayConcedingProb = recentForm.awayTeam.goalsConceded.filter(g => g > 0).length / 5

    let probability: number
    let explanation: string
    let riskLevel: 'Low' | 'Medium' | 'High'
    let cautionNote: string

    if (selection === 'Yes') {
      // More conservative BTTS calculation
      const homeScoresProb = (homeScoringProb * 0.5 + homeConcedingProb * 0.5) * 0.8
      const awayScoresProb = (awayScoringProb * 0.5 + awayConcedingProb * 0.5) * 0.8
      probability = Math.min(95, (homeScoresProb + awayScoresProb) * 0.7)
      
      explanation = `${homeTeam} scores in ${Math.round(homeScoringProb * 100)}% of home games, ${awayTeam} concedes in ${Math.round(awayConcedingProb * 100)}% of away games. Both teams show attacking tendencies.`
      riskLevel = probability > 60 ? 'Low' : probability > 45 ? 'Medium' : 'High'
      cautionNote = 'BTTS can fail if one team plays defensively or if there are early red cards.'
    } else {
      // No BTTS probability
      const homeScoresProb = (homeScoringProb * 0.5 + homeConcedingProb * 0.5) * 0.8
      const awayScoresProb = (awayScoringProb * 0.5 + awayConcedingProb * 0.5) * 0.8
      probability = Math.max(5, 100 - Math.min(95, (homeScoresProb + awayScoresProb) * 0.7))
      
      explanation = `At least one team shows defensive tendencies. Recent form shows ${recentForm.homeTeam.goalsScored.filter(g => g === 0).length} clean sheets for home team.`
      riskLevel = probability > 60 ? 'Low' : probability > 45 ? 'Medium' : 'High'
      cautionNote = 'No BTTS can fail if both teams are in attacking form or if game becomes open.'
    }

    return {
      market: 'Both Teams To Score',
      probability_range: [Math.max(0, probability - 12), Math.min(100, probability + 12)],
      risk_level: riskLevel,
      explanation,
      caution_note: cautionNote
    }
  }

  private analyzeCorners(matchData: MatchData, signals: StatisticalSignals, threshold: number): MarketAnalysis {
    const { homeTeam, awayTeam, selection } = matchData
    const { leagueAverages, refereeTendencies, matchContext } = signals

    // Base corner calculation
    const baseCorners = leagueAverages.avgCorners
    const refereeAdjustment = refereeTendencies.avgCornersPerGame - leagueAverages.avgCorners
    const expectedCorners = baseCorners + refereeAdjustment

    let probability: number
    let explanation: string
    let riskLevel: 'Low' | 'Medium' | 'High'
    let cautionNote: string

    if (selection === 'Over') {
      probability = Math.min(90, Math.max(10, ((expectedCorners - threshold) * 12) + 50))
      explanation = `League average is ${leagueAverages.avgCorners} corners. Referee averages ${refereeTendencies.avgCornersPerGame} corners. Expected: ${expectedCorners.toFixed(1)} corners.`
      riskLevel = probability > 60 ? 'Low' : probability > 45 ? 'Medium' : 'High'
      cautionNote = 'Corner markets can be affected by playing styles, weather conditions, and match flow.'
    } else {
      probability = Math.min(90, Math.max(10, 100 - (((expectedCorners - threshold) * 12) + 50)))
      explanation = `Expected corners: ${expectedCorners.toFixed(1)}. Defensive matchups or poor weather may reduce corner count.`
      riskLevel = probability > 60 ? 'Low' : probability > 45 ? 'Medium' : 'High'
      cautionNote = 'Under corner markets can fail if game is end-to-end or if teams rely on wing play.'
    }

    return {
      market: `Over / Under ${threshold} Corners`,
      probability_range: [Math.max(0, probability - 15), Math.min(100, probability + 15)],
      risk_level: riskLevel,
      explanation,
      caution_note: cautionNote
    }
  }

  private analyzeCards(matchData: MatchData, signals: StatisticalSignals, threshold: number): MarketAnalysis {
    const { homeTeam, awayTeam, selection } = matchData
    const { leagueAverages, refereeTendencies, matchContext } = signals

    // Base card calculation
    const baseCards = leagueAverages.avgCards
    const refereeAdjustment = refereeTendencies.avgCardsPerGame - leagueAverages.avgCards
    const expectedCards = baseCards + refereeAdjustment

    let probability: number
    let explanation: string
    let riskLevel: 'Low' | 'Medium' | 'High'
    let cautionNote: string

    if (selection === 'Over') {
      probability = Math.min(85, Math.max(15, ((expectedCards - threshold) * 10) + 50))
      explanation = `League average is ${leagueAverages.avgCards} cards. Referee averages ${refereeTendencies.avgCardsPerGame} cards. Expected: ${expectedCards.toFixed(1)} cards.`
      riskLevel = probability > 65 ? 'Low' : probability > 50 ? 'Medium' : 'High'
      cautionNote = 'Card markets depend heavily on referee strictness and match intensity.'
    } else {
      probability = Math.min(85, Math.max(15, 100 - (((expectedCards - threshold) * 10) + 50)))
      explanation = `Expected cards: ${expectedCards.toFixed(1)}. Clean game expected if referee is lenient or match importance is low.`
      riskLevel = probability > 65 ? 'Low' : probability > 50 ? 'Medium' : 'High'
      cautionNote = 'Under card markets can fail if game becomes heated or if referee is strict.'
    }

    return {
      market: `Over / Under ${threshold} Cards`,
      probability_range: [Math.max(0, probability - 18), Math.min(100, probability + 18)],
      risk_level: riskLevel,
      explanation,
      caution_note: cautionNote
    }
  }

  public analyzeMatch(matchData: MatchData): MarketAnalysis {
    const signals = this.generateStatisticalSignals(matchData)

    switch (matchData.market) {
      case '1X2':
        return this.analyze1X2Market(matchData, signals)
      case 'Over/Under 2.5 Goals':
        return this.analyzeOverUnderGoals(matchData, signals, 2.5)
      case 'Both Teams To Score':
        return this.analyzeBTTS(matchData, signals)
      case 'Over / Under 8.5 Corners':
        return this.analyzeCorners(matchData, signals, 8.5)
      case 'Over / Under 3.5 Cards':
        return this.analyzeCards(matchData, signals, 3.5)
      default:
        return {
          market: matchData.market,
          probability_range: [0, 0],
          risk_level: 'High',
          explanation: 'Market not supported',
          caution_note: 'This market type is not currently supported by the analysis engine.'
        }
    }
  }

  public analyzeMultipleMatches(matches: MatchData[]): MarketAnalysis[] {
    return matches.map(match => this.analyzeMatch(match))
  }
}

export const footballAnalysisEngine = new FootballAnalysisEngine()
export default footballAnalysisEngine

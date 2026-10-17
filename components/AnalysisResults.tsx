'use client'

import { MarketAnalysis, MatchData } from '@/lib/analysis-engine'

interface AnalysisResultsProps {
  matches: MatchData[]
  analyses: MarketAnalysis[]
  isGuest?: boolean
  guestMessage?: string
  onSignup?: () => void
}

interface SlipRiskSummary {
  overallRisk: 'Low' | 'Medium' | 'High'
  averageProbability: number
  riskDistribution: {
    low: number
    medium: number
    high: number
  }
  recommendedStake: 'Conservative' | 'Moderate' | 'Aggressive'
}

export default function AnalysisResults({ 
  matches, 
  analyses, 
  isGuest = false, 
  guestMessage,
  onSignup 
}: AnalysisResultsProps) {
  
  // Calculate slip-level risk summary
  const calculateSlipRisk = (): SlipRiskSummary => {
    const validProbabilities = analyses.map(a => (a.probability_range[0] + a.probability_range[1]) / 2)
    const averageProbability = validProbabilities.reduce((a, b) => a + b, 0) / validProbabilities.length
    
    const riskDistribution = analyses.reduce((acc, analysis) => {
      acc[analysis.risk_level.toLowerCase() as keyof typeof acc]++
      return acc
    }, { low: 0, medium: 0, high: 0 })
    
    // Determine overall risk
    let overallRisk: 'Low' | 'Medium' | 'High' = 'Low'
    if (riskDistribution.high >= 2 || averageProbability < 45) overallRisk = 'High'
    else if (riskDistribution.medium >= 2 || riskDistribution.high >= 1 || averageProbability < 55) overallRisk = 'Medium'
    
    // Recommended stake approach
    let recommendedStake: 'Conservative' | 'Moderate' | 'Aggressive' = 'Conservative'
    if (averageProbability > 60 && riskDistribution.high === 0) recommendedStake = 'Aggressive'
    else if (averageProbability > 50 && riskDistribution.high <= 1) recommendedStake = 'Moderate'
    
    return {
      overallRisk,
      averageProbability,
      riskDistribution,
      recommendedStake
    }
  }

  const slipRisk = calculateSlipRisk()

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'Low': return 'text-green-600 bg-green-50'
      case 'Medium': return 'text-amber-600 bg-amber-50'
      case 'High': return 'text-red-600 bg-red-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getRiskIcon = (risk: string) => {
    switch (risk) {
      case 'Low': return '🟢'
      case 'Medium': return '🟡'
      case 'High': return '🔴'
      default: return '⚪'
    }
  }

  const formatProbability = (range: [number, number]) => {
    const avg = (range[0] + range[1]) / 2
    return `${range[0]}% - ${range[1]}% (avg: ${avg.toFixed(1)}%)`
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Guest Message */}
      {isGuest && guestMessage && (
        <div className="card-professional p-6 bg-blue-50 border-blue-200">
          <div className="flex items-center gap-3">
            <div className="text-2xl">ℹ️</div>
            <div>
              <h3 className="font-semibold text-blue-900">Guest Analysis</h3>
              <p className="text-blue-700">{guestMessage}</p>
            </div>
          </div>
        </div>
      )}

      {/* Overall Slip Risk Summary */}
      <div className="card-professional p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Slip Risk Summary</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="text-center">
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${getRiskColor(slipRisk.overallRisk)}`}>
              <span>{getRiskIcon(slipRisk.overallRisk)}</span>
              <span>Overall Risk: {slipRisk.overallRisk}</span>
            </div>
            <p className="text-sm text-gray-600 mt-2">Combined risk assessment</p>
          </div>

          <div className="text-center">
            <div className="text-2xl font-bold text-primary-600">
              {slipRisk.averageProbability.toFixed(1)}%
            </div>
            <p className="text-sm text-gray-600 mt-2">Average Probability</p>
          </div>

          <div className="text-center">
            <div className="text-lg font-semibold text-gray-900">
              {slipRisk.riskDistribution.low}L / {slipRisk.riskDistribution.medium}M / {slipRisk.riskDistribution.high}H
            </div>
            <p className="text-sm text-gray-600 mt-2">Risk Distribution</p>
          </div>

          <div className="text-center">
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
              slipRisk.recommendedStake === 'Conservative' ? 'bg-green-50 text-green-700' :
              slipRisk.recommendedStake === 'Moderate' ? 'bg-amber-50 text-amber-700' :
              'bg-red-50 text-red-700'
            }`}>
              {slipRisk.recommendedStake === 'Conservative' ? '🛡️' :
               slipRisk.recommendedStake === 'Moderate' ? '⚖️' : '🎯'}
              <span>{slipRisk.recommendedStake} Stake</span>
            </div>
            <p className="text-sm text-gray-600 mt-2">Recommended Approach</p>
          </div>
        </div>
      </div>

      {/* Match-by-Match Analysis */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900">Match Analysis</h2>
        
        {matches.map((match, index) => {
          const analysis = analyses[index]
          if (!analysis) return null

          return (
            <div key={index} className="card-professional p-6 hover-lift">
              {/* Match Header */}
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {match.homeTeam} vs {match.awayTeam}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {match.market} - {match.selection}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRiskColor(analysis.risk_level)}`}>
                    {getRiskIcon(analysis.risk_level)} {analysis.risk_level} Risk
                  </span>
                </div>
              </div>

              {/* Probability Range */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Probability Range</span>
                  <span className="text-sm text-gray-600">Bookmaker Odds: {match.odds}</span>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-lg font-semibold text-primary-600">
                    {formatProbability(analysis.probability_range)}
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div 
                      className="bg-gradient-to-r from-primary-400 to-primary-600 h-2 rounded-full"
                      style={{ 
                        width: `${Math.min(100, (analysis.probability_range[0] + analysis.probability_range[1]) / 2)}%` 
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* AI Explanation */}
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">AI Analysis</h4>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800 leading-relaxed">
                    {analysis.explanation}
                  </p>
                </div>
              </div>

              {/* Caution Note */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Risk Factors</h4>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <span className="text-amber-600 mt-0.5">⚠️</span>
                    <p className="text-sm text-amber-800 leading-relaxed">
                      {analysis.caution_note}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Educational Disclaimer */}
      <div className="card-professional p-6 bg-gray-50 border-gray-200">
        <div className="flex items-start gap-3">
          <div className="text-2xl">📚</div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Educational Disclaimer</h3>
            <div className="text-sm text-gray-700 space-y-2">
              <p>
                <strong>This analysis is for educational purposes only.</strong> We provide probability estimates and risk assessments to help you understand betting markets better.
              </p>
              <p>
                <strong>Probabilities are not guarantees.</strong> Football matches are inherently unpredictable, and even low-risk selections can lose.
              </p>
              <p>
                <strong>Always gamble responsibly.</strong> Never bet more than you can afford to lose, and consider betting as entertainment rather than investment.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Soft Signup Prompt for Guests */}
      {isGuest && onSignup && (
        <div className="card-professional p-4 bg-gray-50 border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-xl">📊</div>
              <div>
                <h4 className="font-medium text-gray-900">
                  Want to save this analysis and compare future accuracy?
                </h4>
                <p className="text-sm text-gray-600">
                  Track your betting history and improve your analysis over time.
                </p>
              </div>
            </div>
            <button
              onClick={onSignup}
              className="button-primary px-6 py-2 text-sm"
            >
              Sign up to track analyses
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

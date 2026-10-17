'use client'

interface AlternativeMarket {
  market: string
  selection: string
  estimatedOdds: number
  impliedProbability: number
  rationale: string
}

interface AnalysisCardProps {
  fixture: {
    homeTeam: string
    awayTeam: string
    competition: string
    matchDate: string
  }
  market: string
  selection: string
  odds: number
  analysis: {
    impliedProbability: number
    combinedProbability?: number
    riskLevel: 'low' | 'medium' | 'high'
    probabilityRange: { min: number; max: number }
    explanation: string
  }
  consensus?: {
    percentage: number
    summary: string
  }
  alternativeMarkets?: AlternativeMarket[]
}

export default function AnalysisCard({
  fixture,
  market,
  selection,
  odds,
  analysis,
  consensus,
  alternativeMarkets = [],
}: AnalysisCardProps) {
  const riskColors = {
    low: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-red-100 text-red-800',
  }

  const probPercent = (analysis.impliedProbability * 100).toFixed(1)
  const rangeMin = (analysis.probabilityRange.min * 100).toFixed(1)
  const rangeMax = (analysis.probabilityRange.max * 100).toFixed(1)

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {fixture.homeTeam} vs {fixture.awayTeam}
        </h3>
        <p className="text-sm text-gray-600">{fixture.competition}</p>
        <p className="text-sm text-gray-500">
          {new Date(fixture.matchDate).toLocaleDateString()}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-sm text-gray-600">Market</p>
          <p className="font-medium">{market}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Selection</p>
          <p className="font-medium">{selection}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Odds</p>
          <p className="font-medium">{odds.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Risk Level</p>
          <span
            className={`inline-block px-2 py-1 rounded text-xs font-medium ${riskColors[analysis.riskLevel]}`}
          >
            {analysis.riskLevel.toUpperCase()}
          </span>
        </div>
      </div>

      <div className="mb-4 p-4 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-600 mb-2">Implied Probability</p>
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-primary-600 h-3 rounded-full transition-all"
                style={{ width: `${probPercent}%` }}
              />
            </div>
          </div>
          <span className="text-sm font-medium text-gray-900">
            {probPercent}%
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Range: {rangeMin}% - {rangeMax}%
        </p>
      </div>

      {consensus && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm font-medium text-blue-900 mb-1">
            Crowd Intelligence
          </p>
          <p className="text-sm text-blue-700">{consensus.summary}</p>
        </div>
      )}

      <div className="pt-4 border-t border-gray-200">
        <p className="text-sm text-gray-700 leading-relaxed mb-4">
          {analysis.explanation}
        </p>
      </div>

      {alternativeMarkets && alternativeMarkets.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">
            Alternative Market Options
          </h4>
          <p className="text-xs text-gray-500 mb-3">
            These represent alternative outcomes for comparison purposes only. Not betting advice.
          </p>
          <div className="space-y-3">
            {alternativeMarkets.slice(0, 3).map((alt, idx) => (
              <div
                key={idx}
                className="p-3 bg-gray-50 rounded-lg border border-gray-200"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {alt.market} - {alt.selection}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      Estimated odds: {alt.estimatedOdds.toFixed(2)} | Probability: {(alt.impliedProbability * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>
                <p className="text-xs text-gray-600 italic">{alt.rationale}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}


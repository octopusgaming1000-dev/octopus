'use client'

import { useState, useEffect } from 'react'

interface MarketCalibration {
  marketType: string
  totalPredictions: number
  correctPredictions: number
  accuracyRate: number
  calibrationFactor: number
  reliability: number
  lastUpdated: string
  isCalibrated: boolean
}

interface DifficultyRanking {
  rank: number
  marketType: string
  accuracyRate: number
  totalPredictions: number
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Very Hard'
}

export default function AiCalibrationDashboard() {
  const [calibrations, setCalibrations] = useState<MarketCalibration[]>([])
  const [difficultyRanking, setDifficultyRanking] = useState<DifficultyRanking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/ai/calibration')
        if (!response.ok) throw new Error('Failed to fetch calibration data')
        
        const data = await response.json()
        setCalibrations(data.calibrations)
        setDifficultyRanking(data.difficultyRanking)
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-600">Error loading calibration data: {error}</p>
      </div>
    )
  }

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 70) return 'text-green-600 bg-green-50'
    if (accuracy >= 55) return 'text-yellow-600 bg-yellow-50'
    return 'text-red-600 bg-red-50'
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return 'text-green-600 bg-green-50'
      case 'Medium': return 'text-yellow-600 bg-yellow-50'
      case 'Hard': return 'text-orange-600 bg-orange-50'
      case 'Very Hard': return 'text-red-600 bg-red-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900">Total Markets</h3>
          <p className="text-3xl font-bold text-blue-600 mt-2">{calibrations.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900">Calibrated Markets</h3>
          <p className="text-3xl font-bold text-green-600 mt-2">
            {calibrations.filter(c => c.isCalibrated).length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900">Average Reliability</h3>
          <p className="text-3xl font-bold text-purple-600 mt-2">
            {calibrations.length > 0 
              ? Math.round(calibrations.reduce((sum, c) => sum + c.reliability, 0) / calibrations.length)
              : 0}%
          </p>
        </div>
      </div>

      {/* Market Calibrations Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Market Performance</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Market Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Predictions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Accuracy
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reliability
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Calibration Factor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {calibrations.map((calibration) => (
                <tr key={calibration.marketType}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {calibration.marketType}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {calibration.totalPredictions}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getAccuracyColor(calibration.accuracyRate)}`}>
                      {calibration.accuracyRate}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getAccuracyColor(calibration.reliability)}`}>
                      {calibration.reliability}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {calibration.calibrationFactor.toFixed(3)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      calibration.isCalibrated ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {calibration.isCalibrated ? 'Calibrated' : 'Learning'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Market Difficulty Ranking */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Market Difficulty Ranking</h2>
        </div>
        <div className="p-6">
          <div className="space-y-3">
            {difficultyRanking.map((market) => (
              <div key={market.marketType} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-semibold text-blue-600">#{market.rank}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{market.marketType}</p>
                    <p className="text-xs text-gray-500">{market.totalPredictions} predictions</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getDifficultyColor(market.difficulty)}`}>
                    {market.difficulty}
                  </span>
                  <span className="text-sm font-medium text-gray-900">
                    {market.accuracyRate}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

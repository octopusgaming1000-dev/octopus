'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import ReputationBadge from './ReputationBadge'

interface User {
  id: string
  name?: string
  image?: string
  reputationPoints?: number
  accuracyScore?: number
  rankTier?: string
  totalPredictions?: number
}

interface Prediction {
  id: string
  userId: string
  matchId: string
  marketType: string
  predictedValue: string
  confidence: number
  createdAt: string
  result: string
  userName?: string
  userImage?: string
  userReputationPoints?: number
  userAccuracyScore?: number
  userRankTier?: string
  userTotalPredictions?: number
}

interface Match {
  id: string
  homeTeam: string
  awayTeam: string
  league: string
  kickoffTime: string
  venue?: string
  weather?: string
  status: string
  homeScore?: number
  awayScore?: number
}

interface PredictionComponentProps {
  match: Match
  user?: User
  className?: string
}

export default function PredictionComponent({ match, user, className = '' }: PredictionComponentProps) {
  const router = useRouter()
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [loading, setLoading] = useState(true)
  const [showPredictionForm, setShowPredictionForm] = useState(false)
  const [selectedMarket, setSelectedMarket] = useState('')
  const [predictedValue, setPredictedValue] = useState('')
  const [confidence, setConfidence] = useState(3)
  const [submitting, setSubmitting] = useState(false)

  const marketTypes = [
    { value: '1X2', label: 'Match Result', options: ['1', 'X', '2'] },
    { value: 'OVER_UNDER_2_5', label: 'Over/Under 2.5 Goals', options: ['OVER', 'UNDER'] },
    { value: 'BTTS', label: 'Both Teams to Score', options: ['YES', 'NO'] },
    { value: 'OVER_UNDER_CORNERS', label: 'Over/Under 10.5 Corners', options: ['OVER 10.5', 'UNDER 10.5'] },
    { value: 'CARDS_OVER_UNDER', label: 'Over/Under 3.5 Cards', options: ['OVER 3.5', 'UNDER 3.5'] }
  ]

  useEffect(() => {
    fetchPredictions()
  }, [match.id])

  const fetchPredictions = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      if (!token) {
        setLoading(false)
        return
      }

      const response = await fetch(
        `/api/predictions?action=match-predictions&matchId=${match.id}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      )

      if (response.ok) {
        const data = await response.json()
        setPredictions(data.data.predictions || [])
      }
    } catch (error) {
      console.error('Failed to fetch predictions:', error)
    } finally {
      setLoading(false)
    }
  }

  const submitPrediction = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user) {
      router.push('/login')
      return
    }

    if (!selectedMarket || !predictedValue) {
      alert('Please select a market and enter your prediction')
      return
    }

    setSubmitting(true)

    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch('/api/predictions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'create-prediction',
          matchId: match.id,
          marketType: selectedMarket,
          predictedValue,
          confidence
        })
      })

      if (response.ok) {
        const data = await response.json()
        setPredictions(prev => [data.data.prediction, ...prev])
        setShowPredictionForm(false)
        setSelectedMarket('')
        setPredictedValue('')
        setConfidence(3)
        alert('Prediction submitted successfully!')
      } else {
        const errorData = await response.json()
        alert(errorData.error || 'Failed to submit prediction')
      }
    } catch (error) {
      console.error('Failed to submit prediction:', error)
      alert('Failed to submit prediction')
    } finally {
      setSubmitting(false)
    }
  }

  const canPredict = match.status === 'scheduled' && new Date(match.kickoffTime) > new Date()

  const getMarketLabel = (marketType: string) => {
    const market = marketTypes.find(m => m.value === marketType)
    return market?.label || marketType
  }

  const getPredictionDisplay = (prediction: Prediction) => {
    const market = marketTypes.find(m => m.value === prediction.marketType)
    if (market?.options) {
      return prediction.predictedValue
    }
    return prediction.predictedValue
  }

  const getResultBadge = (result: string) => {
    switch (result) {
      case 'won':
        return 'bg-green-100 text-green-800'
      case 'lost':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-yellow-100 text-yellow-800'
    }
  }

  const getConfidenceStars = (confidence: number) => {
    return '⭐'.repeat(confidence) + '☆'.repeat(5 - confidence)
  }

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-3/4"></div>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Match Predictions</h3>
          {user && canPredict && (
            <button
              onClick={() => setShowPredictionForm(!showPredictionForm)}
              className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
            >
              {showPredictionForm ? 'Cancel' : 'Add Prediction'}
            </button>
          )}
        </div>
      </div>

      {/* Prediction Form */}
      {showPredictionForm && user && canPredict && (
        <div className="border-b border-gray-200 p-4 bg-gray-50">
          <form onSubmit={submitPrediction} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Market Type</label>
              <select
                value={selectedMarket}
                onChange={(e) => setSelectedMarket(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select a market...</option>
                {marketTypes.map(market => (
                  <option key={market.value} value={market.value}>
                    {market.label}
                  </option>
                ))}
              </select>
            </div>

            {selectedMarket && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Prediction</label>
                  <select
                    value={predictedValue}
                    onChange={(e) => setPredictedValue(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select prediction...</option>
                    {marketTypes
                      .find(m => m.value === selectedMarket)
                      ?.options.map(option => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confidence: {getConfidenceStars(confidence)}
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={confidence}
                    onChange={(e) => setConfidence(parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Submitting...' : 'Submit Prediction'}
            </button>
          </form>
        </div>
      )}

      {/* Predictions List */}
      <div className="p-4">
        {predictions.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 text-4xl mb-4">🎯</div>
            <h4 className="text-lg font-semibold text-gray-900 mb-2">No predictions yet</h4>
            <p className="text-gray-600">
              {canPredict 
                ? 'Be the first to predict this match!'
                : 'Predictions will appear here once users submit them.'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {predictions.map((prediction) => (
              <div key={prediction.id} className="border border-gray-200 rounded-lg p-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      {prediction.userImage ? (
                        <img
                          src={prediction.userImage}
                          alt={prediction.userName}
                          className="h-6 w-6 rounded-full"
                        />
                      ) : (
                        <div className="h-6 w-6 rounded-full bg-gray-200 flex items-center justify-center">
                          <span className="text-gray-500 text-xs">
                            {prediction.userName?.charAt(0)?.toUpperCase()}
                          </span>
                        </div>
                      )}
                      <span className="text-sm font-medium text-gray-900">
                        {prediction.userName || 'Anonymous'}
                      </span>
                      {prediction.userRankTier && (
                        <ReputationBadge
                          reputationPoints={prediction.userReputationPoints}
                          accuracyScore={prediction.userAccuracyScore}
                          rankTier={prediction.userRankTier}
                          totalPredictions={prediction.userTotalPredictions}
                          size="sm"
                        />
                      )}
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getResultBadge(prediction.result)}`}>
                        {prediction.result === 'pending' ? 'Pending' : prediction.result.toUpperCase()}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Market:</span>
                        <span className="font-medium text-gray-900 ml-1">
                          {getMarketLabel(prediction.marketType)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Prediction:</span>
                        <span className="font-medium text-gray-900 ml-1">
                          {getPredictionDisplay(prediction)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Confidence:</span>
                        <span className="ml-1">{getConfidenceStars(prediction.confidence)}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Time:</span>
                        <span className="font-medium text-gray-900 ml-1">
                          {new Date(prediction.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

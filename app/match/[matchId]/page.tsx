'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Header from '@/components/Header'

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
  aiAnalysis?: any
  aiAnalysisAt?: string
}

interface MatchCommunityPrediction {
  id: string
  userId: string
  market: string
  prediction: string
  confidence: number
  explanation: string
  confidenceNote?: string
  upvotes: number
  downvotes: number
  createdAt: string
  user: {
    name?: string
    email: string
    userProfile?: {
      reputationScore: number
      accuracyRate: number
      trustScore: number
      starRating: number
      riskLabel: 'Low' | 'Medium' | 'High'
      influenceWeight: number
    }
  }
}

interface CommunityIntelligence {
  totalPredictions: number
  trustedPredictions: number
  communityAgreement: number
  communityConfidence: number
  sentiment: 'bullish' | 'bearish' | 'neutral'
  riskAdjustment: number
  confidenceAdjustment: number
  userDiversity: number
  spamRatio: number
}

export default function MatchDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [match, setMatch] = useState<Match | null>(null)
  const [predictions, setPredictions] = useState<MatchCommunityPrediction[]>([])
  const [communityIntelligence, setCommunityIntelligence] = useState<{ [key: string]: CommunityIntelligence }>({})
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('1x2')
  const [userPrediction, setUserPrediction] = useState({
    market: '1X2',
    prediction: '',
    confidence: 3,
    explanation: '',
    confidenceNote: ''
  })

  useEffect(() => {
    if (params.matchId) {
      fetchMatchData()
      fetchPredictions()
    }
  }, [params.matchId])

  const fetchMatchData = async () => {
    try {
      const response = await fetch(`/api/match/${params.matchId}`)
      if (response.ok) {
        const data = await response.json()
        setMatch(data.match)
        setCommunityIntelligence(data.communityIntelligence || {})
      }
    } catch (error) {
      console.error('Failed to fetch match:', error)
    }
  }

  const fetchPredictions = async () => {
    try {
      const response = await fetch(`/api/match/${params.matchId}/predictions`)
      if (response.ok) {
        const data = await response.json()
        setPredictions(data.predictions || [])
      }
    } catch (error) {
      console.error('Failed to fetch predictions:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePredictionSubmit = async () => {
    try {
      const response = await fetch(`/api/match/${params.matchId}/predictions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userPrediction),
      })

      if (response.ok) {
        setUserPrediction({
          market: '1X2',
          prediction: '',
          confidence: 3,
          explanation: '',
          confidenceNote: ''
        })
        fetchPredictions()
        fetchMatchData() // Refresh community intelligence
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to submit prediction')
      }
    } catch (error) {
      console.error('Failed to submit prediction:', error)
    }
  }

  const handleVote = async (predictionId: string, voteType: 'up' | 'down') => {
    try {
      await fetch(`/api/match/${params.matchId}/predictions/${predictionId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ voteType }),
      })
      fetchPredictions()
    } catch (error) {
      console.error('Failed to vote:', error)
    }
  }

  const getStarRating = (rating: number) => {
    return '⭐'.repeat(Math.max(1, Math.min(5, rating)))
  }

  const getRiskLabelColor = (riskLabel: string) => {
    switch (riskLabel) {
      case 'Low': return 'text-green-600 bg-green-50'
      case 'Medium': return 'text-yellow-600 bg-yellow-50'
      case 'High': return 'text-red-600 bg-red-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getCommunityAgreementColor = (agreement: number) => {
    if (agreement >= 0.7) return 'text-green-600'
    if (agreement >= 0.4) return 'text-yellow-600'
    return 'text-red-600'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">Loading match details...</div>
        </main>
      </div>
    )
  }

  if (!match) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">Match not found.</div>
        </main>
      </div>
    )
  }

  const aiAnalysis = match.aiAnalysis ? JSON.parse(match.aiAnalysis) : null
  const currentMarketIntelligence = communityIntelligence[activeTab]

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Match Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <div className="flex items-center gap-4 mb-2">
                <span className="text-sm font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
                  {match.league}
                </span>
                <span className={`text-xs px-2 py-1 rounded ${
                  match.status === 'scheduled' ? 'bg-green-100 text-green-800' :
                  match.status === 'live' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {match.status.toUpperCase()}
                </span>
              </div>
              
              <div className="flex items-center gap-6 mb-4">
                <div className="text-center">
                  <h2 className="text-2xl font-bold">{match.homeTeam}</h2>
                  {match.homeScore !== undefined && (
                    <div className="text-3xl font-bold mt-2">{match.homeScore}</div>
                  )}
                </div>
                <div className="text-gray-500 text-xl">vs</div>
                <div className="text-center">
                  <h2 className="text-2xl font-bold">{match.awayTeam}</h2>
                  {match.awayScore !== undefined && (
                    <div className="text-3xl font-bold mt-2">{match.awayScore}</div>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span>{new Date(match.kickoffTime).toLocaleString()}</span>
                {match.venue && <span>• Venue: {match.venue}</span>}
                {match.weather && <span>• Weather: {match.weather}</span>}
              </div>
            </div>
            
            <button
              onClick={() => router.push('/matches')}
              className="text-blue-600 hover:text-blue-800"
            >
              ← Back to Matches
            </button>
          </div>
        </div>

        {/* Community Intelligence Summary */}
        {currentMarketIntelligence && currentMarketIntelligence.totalPredictions > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h3 className="text-xl font-semibold mb-4">Community Intelligence</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {currentMarketIntelligence.totalPredictions}
                </div>
                <div className="text-sm text-gray-600">Total Predictions</div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${getCommunityAgreementColor(currentMarketIntelligence.communityAgreement)}`}>
                  {(currentMarketIntelligence.communityAgreement * 100).toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600">Community Agreement</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {currentMarketIntelligence.trustedPredictions}
                </div>
                <div className="text-sm text-gray-600">Trusted Predictions</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {currentMarketIntelligence.sentiment?.toUpperCase() || 'NEUTRAL'}
                </div>
                <div className="text-sm text-gray-600">Sentiment</div>
              </div>
            </div>
            
            {currentMarketIntelligence.communityAgreement < 0.3 && currentMarketIntelligence.totalPredictions > 5 && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-800">
                  ⚠️ <strong>High Disagreement:</strong> Community predictions show significant disagreement, indicating higher uncertainty.
                </p>
              </div>
            )}
          </div>
        )}

        {/* AI Analysis Tabs */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h3 className="text-xl font-semibold mb-4">AI Analysis</h3>
          
          {match.aiAnalysisAt && (
            <p className="text-sm text-gray-500 mb-4">
              Last analyzed: {new Date(match.aiAnalysisAt).toLocaleString()}
            </p>
          )}
          
          <div className="border-b border-gray-200 mb-6">
            <nav className="flex space-x-8">
              {['1x2', 'over-under', 'btts', 'corners', 'cards'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab === '1x2' ? '1X2' :
                   tab === 'over-under' ? 'Over/Under 2.5' :
                   tab === 'btts' ? 'Both Teams To Score' :
                   tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </nav>
          </div>

          {aiAnalysis ? (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">AI Prediction</h4>
                <p className="text-gray-700">
                  {aiAnalysis.explanation || 'AI analysis is being processed...'}
                </p>
                
                {aiAnalysis.adjustedConfidence && (
                  <div className="mt-2 text-sm">
                    <span className="font-medium">Adjusted Confidence:</span>{' '}
                    <span className="text-blue-600 font-bold">
                      {(aiAnalysis.adjustedConfidence * 100).toFixed(1)}%
                    </span>
                    {aiAnalysis.confidence && aiAnalysis.adjustedConfidence !== aiAnalysis.confidence && (
                      <span className="text-gray-500 ml-2">
                        (base: {(aiAnalysis.confidence * 100).toFixed(1)}%)
                      </span>
                    )}
                  </div>
                )}
              </div>
              
              {aiAnalysis.probabilities && aiAnalysis.probabilities[activeTab] && (
                <div className="grid grid-cols-3 gap-4">
                  {Object.entries(aiAnalysis.probabilities[activeTab]).map(([outcome, prob]: [string, any]) => (
                    <div key={outcome} className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className="font-medium">{outcome}</div>
                      <div className="text-2xl font-bold text-blue-600">
                        {(prob * 100).toFixed(1)}%
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              AI analysis is not available yet. Check back later.
            </div>
          )}
        </div>

        {/* Community Predictions */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-xl font-semibold mb-4">Community Predictions</h3>
          
          {/* Prediction Form */}
          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <h4 className="font-medium mb-4">Share Your Prediction</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Market</label>
                <select
                  value={userPrediction.market}
                  onChange={(e) => setUserPrediction({...userPrediction, market: e.target.value})}
                  className="input-professional w-full"
                >
                  <option value="1X2">1X2</option>
                  <option value="Over/Under 2.5">Over/Under 2.5</option>
                  <option value="Both Teams To Score">Both Teams To Score</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Prediction</label>
                <select
                  value={userPrediction.prediction}
                  onChange={(e) => setUserPrediction({...userPrediction, prediction: e.target.value})}
                  className="input-professional w-full"
                >
                  <option value="">Select...</option>
                  {userPrediction.market === '1X2' && ['Home', 'Draw', 'Away'].map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                  {userPrediction.market === 'Over/Under 2.5' && ['Over 2.5', 'Under 2.5'].map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                  {userPrediction.market === 'Both Teams To Score' && ['Yes', 'No'].map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Confidence (1-5)</label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={userPrediction.confidence}
                  onChange={(e) => setUserPrediction({...userPrediction, confidence: parseInt(e.target.value)})}
                  className="input-professional w-full"
                />
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Explanation</label>
              <textarea
                value={userPrediction.explanation}
                onChange={(e) => setUserPrediction({...userPrediction, explanation: e.target.value})}
                placeholder="Share your reasoning..."
                className="input-professional w-full"
                rows={3}
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Confidence Note (Optional)</label>
              <textarea
                value={userPrediction.confidenceNote}
                onChange={(e) => setUserPrediction({...userPrediction, confidenceNote: e.target.value})}
                placeholder="Additional context for your confidence level..."
                className="input-professional w-full"
                rows={2}
              />
            </div>
            <button
              onClick={handlePredictionSubmit}
              disabled={!userPrediction.prediction}
              className="button-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Submit Prediction
            </button>
          </div>

          {/* Predictions List */}
          <div className="space-y-4">
            {predictions.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No community predictions yet.</p>
            ) : (
              predictions.map((prediction) => (
                <div key={prediction.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        {prediction.user.name || prediction.user.email}
                        {prediction.user.userProfile && (
                          <>
                            <span className={`text-xs px-2 py-1 rounded ${getRiskLabelColor(prediction.user.userProfile.riskLabel)}`}>
                              {prediction.user.userProfile.riskLabel}
                            </span>
                            <span className="text-xs text-yellow-600">
                              {getStarRating(prediction.user.userProfile.starRating)}
                            </span>
                          </>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">
                        Trust: {prediction.user.userProfile?.trustScore || 50} | 
                        Accuracy: {prediction.user.userProfile?.accuracyRate ? (prediction.user.userProfile.accuracyRate * 100).toFixed(1) : 0}%
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleVote(prediction.id, 'up')}
                        className="text-green-600 hover:text-green-800"
                      >
                        ↑ {prediction.upvotes}
                      </button>
                      <button
                        onClick={() => handleVote(prediction.id, 'down')}
                        className="text-red-600 hover:text-red-800"
                      >
                        ↓ {prediction.downvotes}
                      </button>
                    </div>
                  </div>
                  
                  <div className="mb-2">
                    <span className="font-medium">{prediction.market}:</span> {prediction.prediction}
                    <span className="ml-2 text-sm text-gray-500">
                      Confidence: {prediction.confidence}/5
                    </span>
                  </div>
                  
                  <p className="text-gray-700">{prediction.explanation}</p>
                  
                  {prediction.confidenceNote && (
                    <p className="text-sm text-gray-600 mt-2 italic">
                      <strong>Confidence Note:</strong> {prediction.confidenceNote}
                    </p>
                  )}
                  
                  <div className="text-xs text-gray-500 mt-2">
                    {new Date(prediction.createdAt).toLocaleString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

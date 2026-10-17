'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'

interface LeaderboardUser {
  id: string
  name: string
  image?: string
  totalPredictions: number
  correctPredictions: number
  accuracyScore: number
  reputationPoints: number
  rankTier: string
}

export default function LeaderboardPage() {
  const router = useRouter()
  const [users, setUsers] = useState<LeaderboardUser[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'elite' | 'expert' | 'analyst'>('all')

  useEffect(() => {
    fetchLeaderboard()
  }, [filter])

  const fetchLeaderboard = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      }
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const response = await fetch('/api/predictions?action=leaderboard', { headers })
      
      if (response.ok) {
        const data = await response.json()
        let filteredUsers = data.data.leaderboard || []

        // Apply filter
        if (filter !== 'all') {
          filteredUsers = filteredUsers.filter((user: LeaderboardUser) => 
            user.rankTier.toLowerCase() === filter
          )
        }

        setUsers(filteredUsers)
      } else if (response.status === 401) {
        router.push('/login')
      } else {
        console.error('Failed to fetch leaderboard')
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const getRankBadge = (rank: number) => {
    if (rank === 1) return '🥇'
    if (rank === 2) return '🥈'
    if (rank === 3) return '🥉'
    return `#${rank}`
  }

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'Verified Predictor': return 'text-purple-600 bg-purple-50'
      case 'Elite': return 'text-blue-600 bg-blue-50'
      case 'Expert': return 'text-green-600 bg-green-50'
      case 'Analyst': return 'text-yellow-600 bg-yellow-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-600">Loading leaderboard...</p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Prediction Leaderboard</h1>
          <p className="text-gray-600 mb-6">Top predictors ranked by reputation points and accuracy</p>
          
          {/* Filter Tabs */}
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filter === 'all' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('elite')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filter === 'elite' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Elite
            </button>
            <button
              onClick={() => setFilter('expert')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filter === 'expert' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Expert
            </button>
            <button
              onClick={() => setFilter('analyst')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filter === 'analyst' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Analyst
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">Rank Tiers</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-gray-100 rounded"></div>
              <span className="text-gray-700">Beginner (0-49 pts)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-yellow-50 rounded"></div>
              <span className="text-gray-700">Analyst (50-149 pts)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-50 rounded"></div>
              <span className="text-gray-700">Expert (150-399 pts)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-50 rounded"></div>
              <span className="text-gray-700">Elite (400-799 pts)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-purple-50 rounded"></div>
              <span className="text-gray-700">Verified (800+ pts)</span>
            </div>
          </div>
        </div>

        {/* Leaderboard Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {users.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">📊</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No predictors found</h3>
              <p className="text-gray-600">
                {filter === 'all' 
                  ? 'Start making predictions to appear on the leaderboard!'
                  : `No ${filter} predictors found yet.`
                }
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rank
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tier
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Accuracy
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Predictions
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reputation
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user, index) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-lg font-bold text-gray-900">
                          {getRankBadge(index + 1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {user.image ? (
                            <img
                              src={user.image}
                              alt={user.name}
                              className="h-8 w-8 rounded-full mr-3"
                            />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center mr-3">
                              <span className="text-gray-500 text-xs font-medium">
                                {user.name?.charAt(0)?.toUpperCase()}
                              </span>
                            </div>
                          )}
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {user.name || 'Anonymous'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTierColor(user.rankTier)}`}>
                          {user.rankTier}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {user.accuracyScore.toFixed(1)}%
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {user.totalPredictions}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900">
                          {user.reputationPoints}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Stats Summary */}
        {users.length > 0 && (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm font-medium text-gray-500 mb-2">Total Predictors</div>
              <div className="text-2xl font-bold text-gray-900">{users.length}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm font-medium text-gray-500 mb-2">Average Accuracy</div>
              <div className="text-2xl font-bold text-gray-900">
                {(users.reduce((sum, user) => sum + user.accuracyScore, 0) / users.length).toFixed(1)}%
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm font-medium text-gray-500 mb-2">Top Score</div>
              <div className="text-2xl font-bold text-gray-900">
                {users[0]?.reputationPoints || 0}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

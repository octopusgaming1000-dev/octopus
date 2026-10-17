'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Mission {
  id: string
  date: string
  missionType: string
  requirementValue: number
  description: string
  isActive: boolean
  progress?: number
  completed?: boolean
  completedAt?: string
}

interface UserStreak {
  currentStreak: number
  longestStreak: number
  lastActiveDate?: string
}

interface Badge {
  id: string
  badgeType: string
  badgeName: string
  badgeIcon: string
  earnedAt: string
}

interface DailyMissionsProps {
  className?: string
}

export default function DailyMissions({ className = '' }: DailyMissionsProps) {
  const router = useRouter()
  const [missions, setMissions] = useState<Mission[]>([])
  const [streak, setStreak] = useState<UserStreak>({ currentStreak: 0, longestStreak: 0 })
  const [badges, setBadges] = useState<Badge[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)

  useEffect(() => {
    fetchDailyMissions()
    fetchUserStreak()
  }, [])

  const fetchDailyMissions = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      if (!token) {
        setLoading(false)
        return
      }

      const response = await fetch('/api/daily-missions?action=daily-missions', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setMissions(data.data.missions || [])
      } else if (response.status === 401) {
        router.push('/login')
      }
    } catch (error) {
      console.error('Failed to fetch daily missions:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchUserStreak = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      if (!token) return

      const response = await fetch('/api/daily-missions?action=user-streak', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setStreak(data.data.streak)
        setBadges(data.data.badges || [])
      }
    } catch (error) {
      console.error('Failed to fetch user streak:', error)
    }
  }

  const updateMissionProgress = async (missionId: string, progress: number, completed: boolean) => {
    setUpdating(missionId)

    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch('/api/daily-missions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'update-progress',
          missionId,
          progress,
          completed
        })
      })

      if (response.ok) {
        const data = await response.json()
        
        // Update local state
        setMissions(prev => prev.map(mission => 
          mission.id === missionId 
            ? { ...mission, progress, completed, completedAt: completed ? new Date().toISOString() : mission.completedAt }
            : mission
        ))

        // Show success message
        if (completed && data.data.reputationPoints > 0) {
          alert(`Mission completed! +${data.data.reputationPoints} reputation points`)
        }

        // Refresh streak if completed
        if (completed) {
          fetchUserStreak()
        }
      } else {
        const errorData = await response.json()
        alert(errorData.error || 'Failed to update mission progress')
      }
    } catch (error) {
      console.error('Failed to update mission progress:', error)
      alert('Failed to update mission progress')
    } finally {
      setUpdating(null)
    }
  }

  const getMissionIcon = (missionType: string) => {
    switch (missionType) {
      case 'PREDICT_3_MATCHES': return '⚽'
      case 'PARTICIPATE_DISCUSSION': return '💬'
      case 'REACT_5_PREDICTIONS': return '👍'
      case 'HIGH_CONFIDENCE_PREDICTION': return '⭐'
      case 'ANALYZE_AI_PREDICTION': return '🤖'
      default: return '📋'
    }
  }

  const getProgressColor = (progress: number, required: number) => {
    const percentage = (progress / required) * 100
    if (percentage >= 100) return 'bg-green-500'
    if (percentage >= 50) return 'bg-blue-500'
    return 'bg-gray-300'
  }

  const getStreakColor = (streak: number) => {
    if (streak >= 30) return 'text-purple-600'
    if (streak >= 7) return 'text-orange-600'
    if (streak >= 3) return 'text-yellow-600'
    return 'text-gray-600'
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
    <div className={`space-y-6 ${className}`}>
      {/* Streak Counter */}
      <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-lg shadow-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold flex items-center">
              🔥 {streak.currentStreak} Day Streak
            </h3>
            <p className="text-orange-100 mt-1">
              Longest: {streak.longestStreak} days
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">
              {streak.currentStreak >= 7 ? '🔥' : streak.currentStreak >= 3 ? '💪' : '🌱'}
            </div>
          </div>
        </div>
        
        {/* Streak Milestones */}
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>7 Day Streak</span>
            <span className={streak.currentStreak >= 7 ? 'text-yellow-300' : 'text-orange-200'}>
              {streak.currentStreak >= 7 ? '✅ +10 pts' : `${Math.max(0, streak.currentStreak)}/7`}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>30 Day Streak</span>
            <span className={streak.currentStreak >= 30 ? 'text-yellow-300' : 'text-orange-200'}>
              {streak.currentStreak >= 30 ? '✅ +50 pts' : `${Math.max(0, streak.currentStreak)}/30`}
            </span>
          </div>
        </div>
      </div>

      {/* Today's Missions */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200 p-4">
          <h3 className="text-lg font-semibold text-gray-900">Today's Missions</h3>
          <p className="text-sm text-gray-600 mt-1">
            Complete missions to earn reputation points and maintain your streak
          </p>
        </div>
        
        <div className="p-4 space-y-4">
          {missions.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-400 text-4xl mb-4">📋</div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">No missions available</h4>
              <p className="text-gray-600">
                Missions will be available soon. Check back later!
              </p>
            </div>
          ) : (
            missions.map((mission) => (
              <div key={mission.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="text-2xl">{getMissionIcon(mission.missionType)}</span>
                      <h4 className="font-medium text-gray-900">{mission.description}</h4>
                      {mission.completed && (
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                          Completed
                        </span>
                      )}
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                        <span>Progress</span>
                        <span>{mission.progress || 0}/{mission.requirementValue}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(mission.progress || 0, mission.requirementValue)}`}
                          style={{ width: `${Math.min(100, ((mission.progress || 0) / mission.requirementValue) * 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Action Button */}
                  <div className="ml-4">
                    {mission.completed ? (
                      <div className="text-green-600">
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          const newProgress = Math.min((mission.progress || 0) + 1, mission.requirementValue)
                          const isCompleted = newProgress >= mission.requirementValue
                          updateMissionProgress(mission.id, newProgress, isCompleted)
                        }}
                        disabled={updating === mission.id}
                        className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm"
                      >
                        {updating === mission.id ? 'Updating...' : 'Progress'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Badges */}
      {badges.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Badges</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {badges.map((badge) => (
              <div key={badge.id} className="text-center p-4 border border-gray-200 rounded-lg">
                <div className="text-3xl mb-2">{badge.badgeIcon}</div>
                <div className="text-sm font-medium text-gray-900">{badge.badgeName}</div>
                <div className="text-xs text-gray-500 mt-1">
                  Earned {new Date(badge.earnedAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

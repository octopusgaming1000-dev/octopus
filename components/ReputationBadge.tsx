'use client'

import React from 'react'

interface ReputationBadgeProps {
  reputationPoints?: number
  accuracyScore?: number
  rankTier?: string
  totalPredictions?: number
  showDetails?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export default function ReputationBadge({
  reputationPoints = 0,
  accuracyScore = 0,
  rankTier = 'Beginner',
  totalPredictions = 0,
  showDetails = false,
  size = 'sm'
}: ReputationBadgeProps) {
  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'Verified Predictor': return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'Elite': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'Expert': return 'bg-green-100 text-green-800 border-green-200'
      case 'Analyst': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case 'Verified Predictor': return '✨'
      case 'Elite': return '🏆'
      case 'Expert': return '⭐'
      case 'Analyst': return '📊'
      default: return '🌱'
    }
  }

  const getSizeClasses = () => {
    switch (size) {
      case 'sm': return 'px-2 py-1 text-xs'
      case 'md': return 'px-3 py-1.5 text-sm'
      case 'lg': return 'px-4 py-2 text-base'
      default: return 'px-2 py-1 text-xs'
    }
  }

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 70) return 'text-green-600'
    if (accuracy >= 60) return 'text-blue-600'
    if (accuracy >= 50) return 'text-yellow-600'
    return 'text-red-600'
  }

  if (showDetails) {
    return (
      <div className="flex items-center space-x-3">
        <div className={`inline-flex items-center space-x-1 border rounded-full font-medium ${getTierColor(rankTier)} ${getSizeClasses()}`}>
          <span>{getTierIcon(rankTier)}</span>
          <span>{rankTier}</span>
        </div>
        
        <div className="flex items-center space-x-4 text-sm">
          <div className="flex items-center space-x-1">
            <span className="text-gray-500">Accuracy:</span>
            <span className={`font-semibold ${getAccuracyColor(accuracyScore)}`}>
              {accuracyScore.toFixed(1)}%
            </span>
          </div>
          
          <div className="flex items-center space-x-1">
            <span className="text-gray-500">Points:</span>
            <span className="font-semibold text-gray-900">
              {reputationPoints}
            </span>
          </div>
          
          <div className="flex items-center space-x-1">
            <span className="text-gray-500">Predictions:</span>
            <span className="font-semibold text-gray-900">
              {totalPredictions}
            </span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`inline-flex items-center space-x-1 border rounded-full font-medium ${getTierColor(rankTier)} ${getSizeClasses()}`}>
      <span>{getTierIcon(rankTier)}</span>
      <span>{rankTier}</span>
      {size !== 'sm' && (
        <span className="ml-1 opacity-75">
          ({accuracyScore.toFixed(1)}%)
        </span>
      )}
    </div>
  )
}

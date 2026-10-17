'use client'

import { useState, useEffect } from 'react'

interface AiReliabilityIndicatorProps {
  marketType: string
  className?: string
}

interface CalibrationData {
  marketType: string
  reliability: number
  sampleSize: number
  accuracyRate: number
  isCalibrated: boolean
  calibrationFactor: number
}

export default function AiReliabilityIndicator({ 
  marketType, 
  className = '' 
}: AiReliabilityIndicatorProps) {
  const [calibration, setCalibration] = useState<CalibrationData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchCalibration = async () => {
      try {
        const response = await fetch(`/api/ai/calibration?marketType=${marketType}`)
        if (response.ok) {
          const data = await response.json()
          setCalibration(data)
        }
      } catch (error) {
        console.error('Failed to fetch calibration data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchCalibration()
  }, [marketType])

  if (loading) {
    return (
      <div className={`text-sm text-gray-500 ${className}`}>
        Loading AI reliability...
      </div>
    )
  }

  if (!calibration || !calibration.isCalibrated) {
    return (
      <div className={`text-sm text-gray-500 ${className}`}>
        AI Confidence: Learning phase ({calibration?.sampleSize || 0} samples)
      </div>
    )
  }

  const getReliabilityColor = (reliability: number) => {
    if (reliability >= 70) return 'text-green-600'
    if (reliability >= 55) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getReliabilityLabel = (reliability: number) => {
    if (reliability >= 70) return 'High'
    if (reliability >= 55) return 'Medium'
    return 'Low'
  }

  return (
    <div className={`text-sm ${className}`}>
      <div className={`font-medium ${getReliabilityColor(calibration.reliability)}`}>
        AI Confidence Reliability: {calibration.reliability}% ({getReliabilityLabel(calibration.reliability)})
      </div>
      <div className="text-xs text-gray-500 mt-1">
        Based on {calibration.sampleSize} predictions • Accuracy: {calibration.accuracyRate}%
      </div>
    </div>
  )
}

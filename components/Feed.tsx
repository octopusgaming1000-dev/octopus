'use client'

import { useState, useEffect } from 'react'

interface FeedItem {
  id: string
  type: string
  title: string
  description?: string
  metadata?: string
  relevanceScore: number
  createdAt: string
}

interface FeedProps {
  className?: string
}

export default function Feed({ className = '' }: FeedProps) {
  const [feedItems, setFeedItems] = useState<FeedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(true)

  useEffect(() => {
    fetchFeed()
  }, [])

  const fetchFeed = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      if (!token) return

      const response = await fetch('/api/feed?action=personalized', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        setFeedItems(data.data.feed)
        setHasMore(data.data.hasMore)
      }
    } catch (error) {
      console.error('Failed to fetch feed:', error)
    } finally {
      setLoading(false)
    }
  }

  const getFeedIcon = (type: string) => {
    const icons = {
      match: '⚽',
      ai_alert: '🤖',
      community: '💬',
      competition: '🏆'
    }
    return icons[type as keyof typeof icons] || '📋'
  }

  const getFeedColor = (type: string) => {
    const colors = {
      match: 'bg-blue-50 border-blue-200',
      ai_alert: 'bg-purple-50 border-purple-200',
      community: 'bg-green-50 border-green-200',
      competition: 'bg-yellow-50 border-yellow-200'
    }
    return colors[type as keyof typeof colors] || 'bg-gray-50 border-gray-200'
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffHours / 24)

    if (diffDays > 0) return `${diffDays}d ago`
    if (diffHours > 0) return `${diffHours}h ago`
    return 'Just now'
  }

  const loadMore = async () => {
    // Implement load more functionality
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse">
              <div className="h-24 bg-gray-200 rounded-lg"></div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {feedItems.map(item => (
            <div key={item.id} className={`border rounded-lg p-4 ${getFeedColor(item.type)}`}>
              <div className="flex items-start space-x-3">
                <div className="text-2xl">
                  {getFeedIcon(item.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 mb-1">{item.title}</h3>
                  {item.description && (
                    <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                  )}
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Relevance: {(item.relevanceScore * 100).toFixed(1)}%</span>
                    <span>{formatTime(item.createdAt)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {hasMore && (
            <div className="text-center">
              <button
                onClick={loadMore}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Load More
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

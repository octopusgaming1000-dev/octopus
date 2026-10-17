'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faEnvelope } from '@fortawesome/free-solid-svg-icons'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  relatedMatchId?: string
  relatedUserId?: string
  isRead: boolean
  createdAt: string
}

interface NotificationBellProps {
  className?: string
}

export default function NotificationBell({ className = '' }: NotificationBellProps) {
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()

  const getNotificationIcon = (type: string) => {
    const icons: { [key: string]: string } = {
      match_starting: '⚽',
      match_finished: '🏁',
      ai_confidence_spike: '🤖',
      lineup_released: '📋',
      red_card: '🟥',
      penalty: '⚽',
      halftime: '⏱️',
      fulltime: '🏁',
      comment_reply: '💬',
      prediction_liked: '👍',
      top_predictor: '🏆',
      rank_upgrade: '⬆️',
      streak_milestone: '🔥',
      daily_missions: '📋',
      community_announcement: '📢'
    }
    return icons[type] || '🔔'
  }

  useEffect(() => {
    fetchUnreadCount()
    const interval = setInterval(fetchUnreadCount, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchUnreadCount = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      if (!token) return

      const response = await fetch('/api/notifications?action=unread-count', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        setUnreadCount(data.data.unreadCount)
      }
    } catch (error) {
      console.error('Failed to fetch unread count:', error)
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      const token = localStorage.getItem('auth_token')
      if (!token) return

      await fetch(`/api/notifications?action=mark-read&notificationId=${notificationId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      fetchUnreadCount()
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
    }
  }

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors"
      >
        <FontAwesomeIcon icon={faEnvelope} className="w-6 h-6" />
        
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            <div className="p-4 text-center text-gray-500">
              <p>No notifications yet</p>
            </div>
          </div>

          <div className="p-4 border-t border-gray-200">
            <button
              onClick={() => router.push('/notifications')}
              className="w-full text-center text-blue-600 hover:text-blue-800 font-medium"
            >
              View All Notifications
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

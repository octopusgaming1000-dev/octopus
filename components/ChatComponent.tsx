/**
 * Chat Component - Reusable chat interface for matches and competitions
 */

'use client'

import { useState, useEffect, useRef } from 'react'
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

interface ChatMessage {
  id: string
  roomId: string
  userId: string
  message: string
  replyToId?: string
  isEdited: boolean
  isDeleted: boolean
  createdAt: string
  editedAt?: string
  userName?: string
  userImage?: string
  userReputationPoints?: number
  userAccuracyScore?: number
  userRankTier?: string
  userTotalPredictions?: number
  reactions?: string[]
  reactionCount?: number
  visibilityScore?: number
  visibilityLevel?: 'high' | 'normal' | 'low' | 'collapsed'
  isCollapsed?: boolean
}

interface ChatRoom {
  id: string
  type: string
  referenceId?: string
  name: string
  description?: string
  isActive: boolean
  createdAt: string
}

interface ChatComponentProps {
  room: ChatRoom
  user: User
  className?: string
  isMobile?: boolean
  onClose?: () => void
}

export default function ChatComponent({ 
  room, 
  user, 
  className = '', 
  isMobile = false, 
  onClose 
}: ChatComponentProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [cooldownInfo, setCooldownInfo] = useState<any>(null)
  const [collapsedMessages, setCollapsedMessages] = useState<Set<string>>(new Set())
  const [showModerationTools, setShowModerationTools] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadMessages()
    checkCooldownStatus()
  }, [room.id])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    // Update cooldown every second
    const interval = setInterval(() => {
      if (cooldownInfo?.isActive) {
        checkCooldownStatus()
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [cooldownInfo?.isActive])

  const checkCooldownStatus = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      if (!token) return

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'get-cooldown-status'
        })
      })

      if (response.ok) {
        const data = await response.json()
        setCooldownInfo(data.data.cooldown)
      }
    } catch (error) {
      console.error('Failed to check cooldown status:', error)
    }
  }

  const loadMessages = async (offset = 0) => {
    try {
      setLoadingMessages(true)
      const token = localStorage.getItem('auth_token')
      const response = await fetch(`/api/chat?action=messages&roomId=${room.id}&limit=50&offset=${offset}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (offset === 0) {
          setMessages(data.data.messages)
        } else {
          setMessages(prev => [...data.data.messages, ...prev])
        }
        setHasMore(data.data.hasMore)
      }
    } catch (error) {
      console.error('Failed to load messages:', error)
    } finally {
      setLoadingMessages(false)
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || sendingMessage) return

    // Check cooldown before sending
    if (cooldownInfo?.isActive) {
      alert(`Please wait ${cooldownInfo.remainingSeconds} seconds before posting again.`)
      return
    }

    try {
      setSendingMessage(true)
      const token = localStorage.getItem('auth_token')
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'send-message',
          roomId: room.id,
          message: newMessage.trim()
        })
      })

      if (response.ok) {
        const data = await response.json()
        setMessages(prev => [...prev, data.data.message])
        setNewMessage('')
      } else {
        const errorData = await response.json()
        if (response.status === 429 && errorData.cooldown) {
          setCooldownInfo(errorData.cooldown)
          alert(errorData.message || 'Slow mode activated')
        } else {
          alert(errorData.error || 'Failed to send message')
        }
      }
    } catch (error) {
      console.error('Failed to send message:', error)
      alert('Failed to send message')
    } finally {
      setSendingMessage(false)
    }
  }

  const addReaction = async (messageId: string, reactionType: string) => {
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'add-reaction',
          messageId,
          reactionType
        })
      })

      if (response.ok) {
        const data = await response.json()
        setMessages(prev => prev.map(msg => 
          msg.id === messageId 
            ? { 
                ...msg, 
                reactionCount: data.data.action === 'added' 
                  ? (msg.reactionCount || 0) + 1 
                  : (msg.reactionCount || 0) - 1
              }
            : msg
        ))
      }
    } catch (error) {
      console.error('Failed to add reaction:', error)
    }
  }

  const deleteMessage = async (messageId: string) => {
    if (!confirm('Are you sure you want to delete this message?')) return

    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch(`/api/chat?action=delete-message&messageId=${messageId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        setMessages(prev => prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, isDeleted: true, message: '[Message deleted]' }
            : msg
        ))
      }
    } catch (error) {
      console.error('Failed to delete message:', error)
    }
  }

  const reportMessage = async (messageId: string) => {
    const reason = prompt('Reason for report (spam, harassment, inappropriate, off-topic):')
    if (!reason) return

    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'report-message',
          messageId,
          reason
        })
      })

      if (response.ok) {
        alert('Message reported successfully')
      } else {
        const errorData = await response.json()
        alert(errorData.error || 'Failed to report message')
      }
    } catch (error) {
      console.error('Failed to report message:', error)
    }
  }

  const flagSpam = async (messageId: string) => {
    if (!confirm('Flag this message as spam?')) return

    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'flag-spam',
          messageId
        })
      })

      if (response.ok) {
        alert('Message flagged as spam')
      } else {
        const errorData = await response.json()
        alert(errorData.error || 'Failed to flag message')
      }
    } catch (error) {
      console.error('Failed to flag message:', error)
    }
  }

  const toggleMessageCollapse = (messageId: string) => {
    setCollapsedMessages(prev => {
      const newSet = new Set(prev)
      if (newSet.has(messageId)) {
        newSet.delete(messageId)
      } else {
        newSet.add(messageId)
      }
      return newSet
    })
  }

  const getVisibilityColor = (visibilityLevel?: string) => {
    switch (visibilityLevel) {
      case 'high': return 'bg-green-50 border-green-200'
      case 'normal': return 'bg-white border-gray-200'
      case 'low': return 'bg-yellow-50 border-yellow-200'
      case 'collapsed': return 'bg-red-50 border-red-200'
      default: return 'bg-white border-gray-200'
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) {
      return 'Today'
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday'
    } else {
      return date.toLocaleDateString()
    }
  }

  const groupMessagesByDate = (messages: ChatMessage[]) => {
    const groups: { [date: string]: ChatMessage[] } = {}
    messages.forEach(message => {
      const date = formatDate(message.createdAt)
      if (!groups[date]) {
        groups[date] = []
      }
      groups[date].push(message)
    })
    return groups
  }

  const messageGroups = groupMessagesByDate(messages)

  return (
    <div className={`bg-white rounded-lg shadow-lg flex flex-col ${className}`}>
      {/* Header */}
      <div className="border-b border-gray-200 p-4 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">{room.name}</h3>
          {room.description && (
            <p className="text-sm text-gray-600 mt-1">{room.description}</p>
          )}
        </div>
        {isMobile && onClose && (
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Messages */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
        style={{ minHeight: '300px', maxHeight: isMobile ? '50vh' : '400px' }}
      >
        {loadingMessages && messages.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            {Object.entries(messageGroups).map(([date, dateMessages]) => (
              <div key={date}>
                <div className="text-center text-xs text-gray-500 font-medium my-4">
                  {date}
                </div>
                {dateMessages.map((message) => {
                  const isCollapsed = message.isCollapsed || collapsedMessages.has(message.id)
                  const shouldShowModeration = showModerationTools || message.userId !== user.id
                  
                  return (
                    <div key={message.id} className={`border rounded-lg p-3 ${getVisibilityColor(message.visibilityLevel)}`}>
                      <div className="flex space-x-3">
                        <div className="flex-shrink-0">
                          {message.userImage ? (
                            <img
                              src={message.userImage}
                              alt={message.userName}
                              className="w-8 h-8 rounded-full"
                            />
                          ) : (
                            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                              <span className="text-xs text-gray-600">
                                {message.userName?.[0] || 'U'}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium text-gray-900">
                              {message.userName || 'Anonymous'}
                            </span>
                            {message.userRankTier && (
                              <ReputationBadge
                                reputationPoints={message.userReputationPoints}
                                accuracyScore={message.userAccuracyScore}
                                rankTier={message.userRankTier}
                                totalPredictions={message.userTotalPredictions}
                                size="sm"
                              />
                            )}
                            {message.visibilityLevel && message.visibilityLevel !== 'normal' && (
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                message.visibilityLevel === 'high' ? 'bg-green-100 text-green-800' :
                                message.visibilityLevel === 'low' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {message.visibilityLevel}
                              </span>
                            )}
                            <span className="text-xs text-gray-500">
                              {formatTime(message.createdAt)}
                            </span>
                            {message.isEdited && (
                              <span className="text-xs text-gray-400">(edited)</span>
                            )}
                          </div>
                          
                          <div className="text-sm text-gray-900 mt-1">
                            {isCollapsed ? (
                              <button
                                onClick={() => toggleMessageCollapse(message.id)}
                                className="text-gray-500 hover:text-gray-700 italic"
                              >
                                [Message collapsed - Click to expand]
                              </button>
                            ) : (
                              <div>
                                {message.message}
                                {message.isCollapsed && (
                                  <button
                                    onClick={() => toggleMessageCollapse(message.id)}
                                    className="ml-2 text-gray-500 hover:text-gray-700 text-xs"
                                  >
                                    [Collapse]
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                          
                          {message.reactionCount && message.reactionCount > 0 && (
                            <div className="flex items-center space-x-2 mt-2">
                              <span className="text-xs text-gray-500">
                                {message.reactionCount} reactions
                              </span>
                            </div>
                          )}
                          
                          <div className="flex items-center space-x-2 mt-2 flex-wrap">
                            <button
                              onClick={() => addReaction(message.id, '👍')}
                              className="text-xs text-gray-500 hover:text-gray-700"
                            >
                              👍
                            </button>
                            <button
                              onClick={() => addReaction(message.id, '🔥')}
                              className="text-xs text-gray-500 hover:text-gray-700"
                            >
                              🔥
                            </button>
                            <button
                              onClick={() => addReaction(message.id, '😂')}
                              className="text-xs text-gray-500 hover:text-gray-700"
                            >
                              😂
                            </button>
                            
                            {shouldShowModeration && (
                              <>
                                <span className="text-gray-300">|</span>
                                <button
                                  onClick={() => reportMessage(message.id)}
                                  className="text-xs text-orange-500 hover:text-orange-700"
                                >
                                  Report
                                </button>
                                <button
                                  onClick={() => flagSpam(message.id)}
                                  className="text-xs text-red-500 hover:text-red-700"
                                >
                                  Spam
                                </button>
                              </>
                            )}
                            
                            {message.userId === user.id && !message.isDeleted && (
                              <>
                                <span className="text-gray-300">|</span>
                                <button
                                  onClick={() => deleteMessage(message.id)}
                                  className="text-xs text-red-500 hover:text-red-700"
                                >
                                  Delete
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}
            {hasMore && (
              <div className="text-center">
                <button
                  onClick={() => loadMessages(messages.length)}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  Load older messages
                </button>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 p-4">
        {/* Cooldown Status */}
        {cooldownInfo?.isActive && (
          <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-center justify-between">
              <span className="text-sm text-red-800">
                ⏸️ Slow mode active: {cooldownInfo.reason}
              </span>
              <span className="text-sm font-medium text-red-800">
                {cooldownInfo.remainingSeconds}s
              </span>
            </div>
          </div>
        )}

        {/* Moderation Tools Toggle */}
        <div className="mb-3 flex items-center justify-between">
          <button
            onClick={() => setShowModerationTools(!showModerationTools)}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            {showModerationTools ? 'Hide' : 'Show'} moderation tools
          </button>
          
          <div className="text-xs text-gray-500">
            Messages are sorted by visibility • 
            <a href="/help/moderation" className="text-blue-600 hover:text-blue-700 ml-1">
              Learn more
            </a>
          </div>
        </div>

        <div className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder={
              cooldownInfo?.isActive 
                ? `Slow mode: wait ${cooldownInfo.remainingSeconds}s...`
                : "Type a message..."
            }
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            disabled={sendingMessage || cooldownInfo?.isActive}
          />
          <button
            onClick={sendMessage}
            disabled={sendingMessage || !newMessage.trim() || cooldownInfo?.isActive}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {sendingMessage ? '...' : 'Send'}
          </button>
        </div>
        
        {/* Quick moderation info */}
        {showModerationTools && (
          <div className="mt-3 p-2 bg-gray-50 border border-gray-200 rounded-md text-xs text-gray-600">
            <div className="font-medium mb-1">Moderation System:</div>
            <div>• 5 messages in 20s → 30s cooldown</div>
            <div>• Reports reduce visibility (no deletion)</div>
            <div>• High reputation users get priority</div>
            <div>• Messages auto-collapse below -20 score</div>
          </div>
        )}
      </div>
    </div>
  )
}

'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'

interface User {
  id: string
  email: string
  name?: string
  image?: string
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
  reactions?: string[]
  reactionCount?: number
}

interface ChatRoom {
  id: string
  type: string
  referenceId?: string
  name: string
  description?: string
  isActive: boolean
  createdAt: string
  messageCount?: number
  lastMessageAt?: string
}

export default function CommunityPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [rooms, setRooms] = useState<ChatRoom[]>([])
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (selectedRoom) {
      loadMessages(selectedRoom.id)
    }
  }, [selectedRoom])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      if (!token) {
        router.push('/login')
        return
      }

      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
        loadRooms()
      } else {
        localStorage.removeItem('auth_token')
        router.push('/login')
      }
    } catch (error) {
      console.error('Auth check failed:', error)
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  const loadRooms = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch('/api/chat?action=rooms', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setRooms(data.data.rooms)
        
        // Select global chat room by default
        const globalRoom = data.data.rooms.find((room: ChatRoom) => room.type === 'global')
        if (globalRoom) {
          setSelectedRoom(globalRoom)
        }
      }
    } catch (error) {
      console.error('Failed to load rooms:', error)
    }
  }

  const loadMessages = async (roomId: string, offset = 0) => {
    try {
      setLoadingMessages(true)
      const token = localStorage.getItem('auth_token')
      const response = await fetch(`/api/chat?action=messages&roomId=${roomId}&limit=50&offset=${offset}`, {
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
    if (!newMessage.trim() || !selectedRoom || sendingMessage) return

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
          roomId: selectedRoom.id,
          message: newMessage.trim()
        })
      })

      if (response.ok) {
        const data = await response.json()
        setMessages(prev => [...prev, data.data.message])
        setNewMessage('')
      } else {
        const errorData = await response.json()
        alert(errorData.error || 'Failed to send message')
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
        // Update message reactions locally
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-600">Loading community...</p>
          </div>
        </main>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center py-12">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Access Denied</h3>
            <p className="text-gray-600">Please log in to access the community.</p>
          </div>
        </main>
      </div>
    )
  }

  const messageGroups = groupMessagesByDate(messages)

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-8rem)]">
          
          {/* Room List Sidebar */}
          <div className="lg:col-span-1 bg-white rounded-lg shadow p-4 overflow-hidden flex flex-col">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Chat Rooms</h2>
            <div className="flex-1 overflow-y-auto space-y-2">
              {rooms.map((room) => (
                <div
                  key={room.id}
                  onClick={() => setSelectedRoom(room)}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedRoom?.id === room.id
                      ? 'bg-blue-50 border-blue-200 border'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-gray-900 truncate">
                        {room.name}
                      </h3>
                      <p className="text-xs text-gray-500 truncate">
                        {room.description}
                      </p>
                    </div>
                    {room.messageCount && (
                      <div className="ml-2 text-xs text-gray-400">
                        {room.messageCount}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Chat Area */}
          <div className="lg:col-span-3 bg-white rounded-lg shadow overflow-hidden flex flex-col">
            {selectedRoom ? (
              <>
                {/* Room Header */}
                <div className="border-b border-gray-200 p-4">
                  <h2 className="text-lg font-semibold text-gray-900">{selectedRoom.name}</h2>
                  {selectedRoom.description && (
                    <p className="text-sm text-gray-600 mt-1">{selectedRoom.description}</p>
                  )}
                </div>

                {/* Messages Area */}
                <div 
                  ref={messagesContainerRef}
                  className="flex-1 overflow-y-auto p-4 space-y-4"
                >
                  {loadingMessages && messages.length === 0 ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  ) : (
                    <>
                      {Object.entries(messageGroups).map(([date, dateMessages]) => (
                        <div key={date}>
                          <div className="text-center text-xs text-gray-500 font-medium my-4">
                            {date}
                          </div>
                          {dateMessages.map((message) => (
                            <div key={message.id} className="flex space-x-3">
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
                                  <span className="text-xs text-gray-500">
                                    {formatTime(message.createdAt)}
                                  </span>
                                  {message.isEdited && (
                                    <span className="text-xs text-gray-400">(edited)</span>
                                  )}
                                </div>
                                <div className="text-sm text-gray-900 mt-1">
                                  {message.message}
                                </div>
                                {message.reactionCount && message.reactionCount > 0 && (
                                  <div className="flex items-center space-x-2 mt-2">
                                    <span className="text-xs text-gray-500">
                                      {message.reactionCount} reactions
                                    </span>
                                  </div>
                                )}
                                <div className="flex items-center space-x-2 mt-2">
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
                                  {message.userId === user.id && !message.isDeleted && (
                                    <button
                                      onClick={() => deleteMessage(message.id)}
                                      className="text-xs text-red-500 hover:text-red-700"
                                    >
                                      Delete
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ))}
                      {hasMore && (
                        <div className="text-center">
                          <button
                            onClick={() => loadMessages(selectedRoom.id, messages.length)}
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

                {/* Message Input */}
                <div className="border-t border-gray-200 p-4">
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                      placeholder="Type a message..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={sendingMessage}
                    />
                    <button
                      onClick={sendMessage}
                      disabled={sendingMessage || !newMessage.trim()}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {sendingMessage ? 'Sending...' : 'Send'}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Chat Room</h3>
                  <p className="text-gray-500">Choose a room from the sidebar to start chatting</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

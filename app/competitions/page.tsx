'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import ChatComponent from '@/components/ChatComponent'

interface User {
  id: string
  email: string
  name?: string
  image?: string
}

interface Competition {
  id: string
  name: string
  displayName: string
  country?: string
  logo?: string
  isActive: boolean
  createdAt: string
}

interface ChatRoom {
  id: string
  type: string
  referenceId?: string
  name: string
  description?: string
  isActive: boolean
  createdAt: string
  competitionName?: string
  competitionLogo?: string
}

export default function CompetitionsPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [competitions, setCompetitions] = useState<Competition[]>([])
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([])
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    checkAuth()
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

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
        loadCompetitions()
        loadCompetitionRooms()
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

  const checkMobile = () => {
    setIsMobile(window.innerWidth < 1024)
  }

  const loadCompetitions = async () => {
    try {
      // Since we don't have a competitions API yet, let's use mock data
      const mockCompetitions: Competition[] = [
        {
          id: 'comp_1',
          name: 'premier-league',
          displayName: 'Premier League',
          country: 'England',
          logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/f/f2/Premier_League_Logo.svg/1200px-Premier_League_Logo.svg.png',
          isActive: true,
          createdAt: new Date().toISOString()
        },
        {
          id: 'comp_2',
          name: 'la-liga',
          displayName: 'La Liga',
          country: 'Spain',
          logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/4/4f/LaLiga_Santander.svg/1200px-LaLiga_Santander.svg.png',
          isActive: true,
          createdAt: new Date().toISOString()
        },
        {
          id: 'comp_3',
          name: 'bundesliga',
          displayName: 'Bundesliga',
          country: 'Germany',
          logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/df/Bundesliga_logo_%282017%29.svg/1200px-Bundesliga_logo_%282017%29.svg.png',
          isActive: true,
          createdAt: new Date().toISOString()
        },
        {
          id: 'comp_4',
          name: 'serie-a',
          displayName: 'Serie A',
          country: 'Italy',
          logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/0/02/Serie_A_logo_2022.svg/1200px-Serie_A_logo_2022.svg.png',
          isActive: true,
          createdAt: new Date().toISOString()
        },
        {
          id: 'comp_5',
          name: 'ligue-1',
          displayName: 'Ligue 1',
          country: 'France',
          logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/c/c3/Ligue_1_Uber_Eats_logo.svg/1200px-Ligue_1_Uber_Eats_logo.svg.png',
          isActive: true,
          createdAt: new Date().toISOString()
        },
        {
          id: 'comp_6',
          name: 'champions-league',
          displayName: 'UEFA Champions League',
          country: 'Europe',
          logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/e/e6/UEFA_Champions_League_logo_2.svg/1200px-UEFA_Champions_League_logo_2.svg.png',
          isActive: true,
          createdAt: new Date().toISOString()
        },
        {
          id: 'comp_7',
          name: 'europa-league',
          displayName: 'UEFA Europa League',
          country: 'Europe',
          logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/f/f2/UEFA_Europa_League.svg/1200px-UEFA_Europa_League.svg.png',
          isActive: true,
          createdAt: new Date().toISOString()
        },
        {
          id: 'comp_8',
          name: 'eredivisie',
          displayName: 'Eredivisie',
          country: 'Netherlands',
          logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0b/Eredivisie_nieuw_logo.svg/1200px-Eredivisie_nieuw_logo.svg.png',
          isActive: true,
          createdAt: new Date().toISOString()
        },
        {
          id: 'comp_9',
          name: 'primeira-liga',
          displayName: 'Primeira Liga',
          country: 'Portugal',
          logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/4/4a/Liga_Portugal_Bwin.svg/1200px-Liga_Portugal_Bwin.svg.png',
          isActive: true,
          createdAt: new Date().toISOString()
        },
        {
          id: 'comp_10',
          name: 'mls',
          displayName: 'MLS',
          country: 'USA',
          logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/6/69/Major_League_Soccer_2023.svg/1200px-Major_League_Soccer_2023.svg.png',
          isActive: true,
          createdAt: new Date().toISOString()
        }
      ]
      setCompetitions(mockCompetitions)
    } catch (error) {
      console.error('Failed to load competitions:', error)
    }
  }

  const loadCompetitionRooms = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch('/api/chat?action=competition-rooms', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setChatRooms(data.data.rooms || [])
      }
    } catch (error) {
      console.error('Failed to load competition rooms:', error)
    }
  }

  const createOrSelectRoom = async (competition: Competition) => {
    try {
      const token = localStorage.getItem('auth_token')
      
      // Try to find existing room
      const existingRoom = chatRooms.find(room => room.referenceId === competition.id)
      
      if (existingRoom) {
        setSelectedRoom(existingRoom)
        return
      }

      // Create new room
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'create-room',
          type: 'competition',
          referenceId: competition.id,
          name: `${competition.displayName} Room`,
          description: `Discuss ${competition.displayName} matches, standings, transfers, and news`
        })
      })

      if (response.ok) {
        const data = await response.json()
        setSelectedRoom(data.data.room)
        loadCompetitionRooms() // Refresh rooms list
      } else {
        const errorData = await response.json()
        alert(errorData.error || 'Failed to create chat room')
      }
    } catch (error) {
      console.error('Failed to create room:', error)
      alert('Failed to create chat room')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-600">Loading competitions...</p>
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
            <p className="text-gray-600">Please log in to access competitions.</p>
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
          <h1 className="text-3xl font-bold text-gray-900">Competition Rooms</h1>
          <p className="text-gray-600 mt-1">Join discussions about your favorite leagues and competitions</p>
        </div>

        {!selectedRoom ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {competitions.map((competition) => (
              <div
                key={competition.id}
                onClick={() => createOrSelectRoom(competition)}
                className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex items-center space-x-4 mb-4">
                    {competition.logo ? (
                      <img
                        src={competition.logo}
                        alt={competition.displayName}
                        className="w-12 h-12 object-contain"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                        <span className="text-gray-500 text-xs">No Logo</span>
                      </div>
                    )}
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">{competition.displayName}</h3>
                      <p className="text-sm text-gray-500">{competition.country}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">
                      Discuss matches, standings, transfers, and news with fellow fans
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        {chatRooms.find(room => room.referenceId === competition.id) 
                          ? 'Active discussion' 
                          : 'Start discussion'}
                      </span>
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setSelectedRoom(null)}
                  className="p-2 text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">{selectedRoom.name}</h2>
                  {selectedRoom.description && (
                    <p className="text-sm text-gray-600">{selectedRoom.description}</p>
                  )}
                </div>
              </div>
            </div>
            
            <ChatComponent
              room={selectedRoom}
              user={user}
              className={isMobile ? 'fixed inset-x-0 bottom-0 z-50' : 'h-[600px]'}
              isMobile={isMobile}
              onClose={() => setSelectedRoom(null)}
            />
          </div>
        )}
      </main>
    </div>
  )
}

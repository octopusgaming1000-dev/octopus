'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import ChatComponent from '@/components/ChatComponent'
import CompetitionSelector from '@/components/CompetitionSelector'

interface Match {
  id: string
  homeTeam: string
  awayTeam: string
  league: string
  leagueApiId?: string
  kickoffTime: string
  venue?: string
  weather?: string
  status: string
  source?: string
  competition?: {
    id: string
    name: string
    displayName: string
    country?: string
    leagueApiId?: string
    currentSeason?: string
    logo?: string
    isPopular: boolean
    popularityScore: number
  }
}

interface Competition {
  id: string
  name: string
  displayName: string
  country?: string
  leagueApiId?: string
  currentSeason?: string
  isPopular: boolean
  popularityScore: number
  logo?: string
}

export default function MatchesPage() {
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCompetition, setSelectedCompetition] = useState<Competition | null>(null)
  const [filters, setFilters] = useState({
    date: '',
    team: ''
  })
  const [user, setUser] = useState<any>(null)
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null)
  const [matchComment, setMatchComment] = useState('')
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const router = useRouter()

  const handleMatchClick = (matchId: string) => {
    router.push(`/match/${matchId}`)
  }

  const openMatchDiscussion = (matchId: string) => {
    if (!user) {
      router.push('/login')
      return
    }

    const match = matches.find(m => m.id === matchId)
    if (!match) return

    setSelectedMatch(match)
    setMatchComment('')
  }

  const submitMatchComment = async () => {
    if (!selectedMatch || !matchComment.trim() || isSubmittingComment) return

    setIsSubmittingComment(true)
    try {
      const token = localStorage.getItem('auth_token')
      
      const response = await fetch('/api/match-comments', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          matchId: selectedMatch.id,
          comment: matchComment.trim()
        })
      })

      if (response.ok) {
        setSelectedMatch(null)
        setMatchComment('')
      } else {
        setSelectedMatch(null)
        setMatchComment('')
      }
    } catch (error) {
      setSelectedMatch(null)
      setMatchComment('')
    } finally {
      setIsSubmittingComment(false)
    }
  }

  useEffect(() => {
    fetchMatches()
    checkAuth()
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    fetchMatches()
  }, [selectedCompetition, filters.date, filters.team])

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      if (token) {
        const response = await fetch('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        if (response.ok) {
          const data = await response.json()
          setUser(data.user)
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error)
    }
  }

  const checkMobile = () => {
    setIsMobile(window.innerWidth < 1024)
  }

  const fetchMatches = async () => {
    try {
      setError(null)
      setLoading(true)
      const token = localStorage.getItem('auth_token')
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      }
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
      
      // Build query parameters
      const params = new URLSearchParams()
      
      // Use competition ID if selected (preferred method)
      if (selectedCompetition) {
        params.append('league_id', selectedCompetition.id)
        if (selectedCompetition.currentSeason) {
          params.append('season', selectedCompetition.currentSeason)
        }
      }
      
      // Add other filters
      if (filters.date) {
        params.append('date', filters.date)
      }
      
      if (filters.team) {
        params.append('team', filters.team)
      }
      
      const url = `/api/matches?${params.toString()}`
      const response = await fetch(url, { headers })
      
      if (response.ok) {
        const data = await response.json()
        setMatches(data.data?.matches || [])
        
        // Show specific message if no matches found
        if (data.data?.message && data.data.matches.length === 0) {
          setError(data.data.message)
        }
      } else if (response.status === 401) {
        // Redirect to login if not authenticated
        router.push('/login')
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to fetch matches')
      }
    } catch (error) {
      console.error('Failed to fetch matches:', error)
      setError('Match data temporarily unavailable.')
    } finally {
      setLoading(false)
    }
  }

  // Client-side filtering is now minimal since we do most filtering on the server
  const filteredMatches = matches.filter(match => {
    // Only apply client-side filtering for date if not already filtered server-side
    if (filters.date && !selectedCompetition) {
      const matchDate = new Date(match.kickoffTime).toDateString()
      const filterDate = new Date(filters.date).toDateString()
      if (matchDate !== filterDate) {
        return false
      }
    }
    
    // Team search filtering (still done client-side for better UX)
    if (filters.team) {
      const teamLower = filters.team.toLowerCase()
      if (!match.homeTeam.toLowerCase().includes(teamLower) && 
          !match.awayTeam.toLowerCase().includes(teamLower)) {
        return false
      }
    }
    
    return true
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-600">Loading matches...</p>
          </div>
        </main>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center py-12">
            <div className="text-red-600 mb-4">
              <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-lg font-semibold mb-2">Error Loading Matches</h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <button
                onClick={fetchMatches}
                className="button-primary"
              >
                Try Again
              </button>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Upcoming Matches</h1>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Competition Selector */}
            <div className="lg:col-span-1">
              <CompetitionSelector
                selectedCompetition={selectedCompetition}
                onCompetitionSelect={setSelectedCompetition}
              />
            </div>
            
            {/* Filters and Matches */}
            <div className="lg:col-span-2 space-y-6">
              {/* Filters */}
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Filters</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date
                    </label>
                    <input
                      type="date"
                      value={filters.date}
                      onChange={(e) => setFilters({...filters, date: e.target.value})}
                      className="input-professional w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Team Search
                    </label>
                    <input
                      type="text"
                      placeholder="Search for team..."
                      value={filters.team}
                      onChange={(e) => setFilters({...filters, team: e.target.value})}
                      className="input-professional w-full"
                    />
                  </div>
                </div>
                
                {/* Clear Filters */}
                {(selectedCompetition || filters.date || filters.team) && (
                  <div className="mt-4">
                    <button
                      onClick={() => {
                        setSelectedCompetition(null)
                        setFilters({ date: '', team: '' })
                      }}
                      className="text-sm text-gray-500 hover:text-gray-700"
                    >
                      Clear all filters
                    </button>
                  </div>
                )}
              </div>

              {/* Matches List */}
              <div>
                {loading ? (
                  <div className="space-y-4">
                    {[1, 2, 3, 4, 5].map(i => (
                      <div key={i} className="bg-white p-6 rounded-lg shadow-sm animate-pulse">
                        <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                        <div className="h-6 bg-gray-200 rounded w-1/2 mb-2"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                      </div>
                    ))}
                  </div>
                ) : error ? (
                  <div className="bg-white p-8 rounded-lg shadow-sm text-center">
                    <div className="text-red-600 mb-4">
                      <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Matches Found</h3>
                    <p className="text-gray-600 mb-4">{error}</p>
                    <button
                      onClick={fetchMatches}
                      className="button-primary"
                    >
                      Try Again
                    </button>
                  </div>
                ) : filteredMatches.length === 0 ? (
                  <div className="bg-white p-8 rounded-lg shadow-sm text-center">
                    <p className="text-gray-500">No matches found matching your criteria.</p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {filteredMatches.map((match) => (
                      <div
                        key={match.id}
                        onClick={() => handleMatchClick(match.id)}
                        className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-4 mb-2">
                              {/* Competition Display */}
                              <div className="flex items-center gap-2">
                                {match.competition?.logo && (
                                  <img 
                                    src={match.competition.logo} 
                                    alt={match.competition.displayName}
                                    className="w-5 h-5 object-contain"
                                  />
                                )}
                                <span className="text-sm font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
                                  {match.competition?.displayName || match.league}
                                </span>
                                {match.competition?.country && (
                                  <span className="text-xs text-gray-500">
                                    {match.competition.country}
                                  </span>
                                )}
                              </div>
                              
                              <span className={`text-xs px-2 py-1 rounded ${
                                match.status === 'scheduled' ? 'bg-green-100 text-green-800' :
                                match.status === 'live' ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {match.status.toUpperCase()}
                              </span>
                              {match.source && (
                                <span className={`text-xs px-2 py-1 rounded ${
                                  match.source === 'manual' ? 'bg-purple-100 text-purple-800' :
                                  'bg-blue-100 text-blue-800'
                                }`}>
                                  {match.source.toUpperCase()}
                                </span>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-4 mb-2">
                              <span className="font-semibold text-lg">{match.homeTeam}</span>
                              <span className="text-gray-500">vs</span>
                              <span className="font-semibold text-lg">{match.awayTeam}</span>
                            </div>
                            
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              <span>{new Date(match.kickoffTime).toLocaleString()}</span>
                              {match.venue && <span>• {match.venue}</span>}
                              {match.weather && <span>• {match.weather}</span>}
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                openMatchDiscussion(match.id)
                              }}
                              className="px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors"
                            >
                              💬 Discuss
                            </button>
                            <div className="text-blue-600">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Match Comment Modal */}
      {selectedMatch && user && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className={`bg-white rounded-lg shadow-xl ${isMobile ? 'w-full h-full' : 'max-w-md w-full'}`}>
            <div className="border-b border-gray-200 p-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {selectedMatch.homeTeam} vs {selectedMatch.awayTeam}
                </h3>
                <p className="text-sm text-gray-600">{selectedMatch.league}</p>
              </div>
              <button
                onClick={() => {
                  setSelectedMatch(null)
                  setMatchComment('')
                }}
                className="p-2 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-4">
              <textarea
                value={matchComment}
                onChange={(e) => setMatchComment(e.target.value)}
                placeholder="Share your thoughts about this match..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={4}
              />
              <div className="mt-4 flex justify-end">
                <button
                  onClick={submitMatchComment}
                  disabled={!matchComment.trim() || isSubmittingComment}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmittingComment ? 'Submitting...' : 'Submit Comment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

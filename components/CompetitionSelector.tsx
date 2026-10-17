'use client'

import { useState, useEffect } from 'react'

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

interface CompetitionSelectorProps {
  selectedCompetition?: Competition | null
  onCompetitionSelect: (competition: Competition | null) => void
  className?: string
}

export default function CompetitionSelector({ 
  selectedCompetition, 
  onCompetitionSelect, 
  className = '' 
}: CompetitionSelectorProps) {
  const [popularCompetitions, setPopularCompetitions] = useState<Competition[]>([])
  const [allCompetitions, setAllCompetitions] = useState<Competition[]>([])
  const [searchResults, setSearchResults] = useState<Competition[]>([])
  const [loading, setLoading] = useState(true)
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showAll, setShowAll] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchPopularCompetitions()
  }, [])

  useEffect(() => {
    if (showAll) {
      fetchAllCompetitions()
    }
  }, [showAll])

  useEffect(() => {
    if (searchQuery.trim()) {
      searchCompetitions(searchQuery)
    } else {
      setSearchResults([])
    }
  }, [searchQuery])

  const fetchPopularCompetitions = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/competitions?action=popular')
      if (response.ok) {
        const data = await response.json()
        setPopularCompetitions(data.data)
      } else {
        throw new Error('Failed to fetch popular competitions')
      }
    } catch (error) {
      console.error('Failed to fetch popular competitions:', error)
      setError('Failed to load competitions')
    } finally {
      setLoading(false)
    }
  }

  const fetchAllCompetitions = async () => {
    try {
      const response = await fetch('/api/competitions')
      if (response.ok) {
        const data = await response.json()
        setAllCompetitions(data.data)
      } else {
        throw new Error('Failed to fetch all competitions')
      }
    } catch (error) {
      console.error('Failed to fetch all competitions:', error)
      setError('Failed to load competitions')
    }
  }

  const searchCompetitions = async (query: string) => {
    try {
      setSearchLoading(true)
      
      const response = await fetch(`/api/competitions?action=search&q=${encodeURIComponent(query)}`)
      if (response.ok) {
        const data = await response.json()
        setSearchResults(data.data)
      } else {
        setSearchResults([])
      }
    } catch (error) {
      console.error('Failed to search competitions:', error)
      setSearchResults([])
    } finally {
      setSearchLoading(false)
    }
  }

  const handleCompetitionClick = (competition: Competition) => {
    onCompetitionSelect(competition)
    setSearchQuery('')
    setSearchResults([])
  }

  const handleClearSelection = () => {
    onCompetitionSelect(null)
  }

  const getDisplayCompetitions = () => {
    if (searchQuery.trim()) {
      return searchResults
    }
    if (showAll) {
      return allCompetitions
    }
    return popularCompetitions
  }

  const getCountryFlag = (country?: string) => {
    const flags: { [key: string]: string } = {
      'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
      'Spain': '🇪🇸',
      'Italy': '🇮🇹',
      'Germany': '🇩🇪',
      'France': '🇫🇷',
      'Portugal': '🇵🇹',
      'Netherlands': '🇳🇱',
      'Belgium': '🇧🇪',
      'Scotland': '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
      'Turkey': '🇹🇷',
      'USA': '🇺🇸',
      'Brazil': '🇧🇷',
      'Argentina': '🇦🇷',
      'Mexico': '🇲🇽',
    }
    return flags[country || ''] || ''
  }

  if (loading) {
    return (
      <div className={`bg-white p-4 rounded-lg shadow-sm ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`bg-white p-4 rounded-lg shadow-sm ${className}`}>
        <div className="text-center py-4">
          <div className="text-red-600 mb-2">
            <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-gray-600 text-sm">{error}</p>
          <button
            onClick={fetchPopularCompetitions}
            className="mt-2 text-blue-600 hover:text-blue-700 text-sm"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white p-4 rounded-lg shadow-sm ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          {selectedCompetition ? 'Selected Competition' : 'Select Competition'}
        </h3>
        {selectedCompetition && (
          <button
            onClick={handleClearSelection}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Clear
          </button>
        )}
      </div>

      {/* Selected Competition Display */}
      {selectedCompetition && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center space-x-3">
            {selectedCompetition.logo && (
              <img 
                src={selectedCompetition.logo} 
                alt={selectedCompetition.displayName}
                className="w-8 h-8 object-contain"
              />
            )}
            <div className="flex-1">
              <div className="font-medium text-gray-900">
                {selectedCompetition.displayName}
              </div>
              <div className="text-sm text-gray-600">
                {getCountryFlag(selectedCompetition.country)} {selectedCompetition.country}
                {selectedCompetition.currentSeason && ` • ${selectedCompetition.currentSeason}`}
              </div>
            </div>
            {selectedCompetition.isPopular && (
              <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                ⭐ Popular
              </span>
            )}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="mb-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Search competitions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          {searchLoading && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            </div>
          )}
        </div>
      </div>

      {/* Competition List */}
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {searchQuery && searchResults.length === 0 && !searchLoading && (
          <div className="text-center py-4 text-gray-500 text-sm">
            No competitions found for "{searchQuery}"
          </div>
        )}

        {getDisplayCompetitions().map((competition) => (
          <div
            key={competition.id}
            onClick={() => handleCompetitionClick(competition)}
            className={`p-3 border rounded-lg cursor-pointer transition-colors ${
              selectedCompetition?.id === competition.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center space-x-3">
              {competition.logo && (
                <img 
                  src={competition.logo} 
                  alt={competition.displayName}
                  className="w-8 h-8 object-contain"
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 truncate">
                  {competition.displayName}
                </div>
                <div className="text-sm text-gray-600">
                  {getCountryFlag(competition.country)} {competition.country}
                  {competition.currentSeason && ` • ${competition.currentSeason}`}
                </div>
              </div>
              <div className="flex flex-col items-end space-y-1">
                {competition.isPopular && (
                  <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                    ⭐
                  </span>
                )}
                <div className="text-xs text-gray-500">
                  {competition.popularityScore > 0 && `Score: ${competition.popularityScore}`}
                </div>
              </div>
            </div>
          </div>
        ))}

        {!searchQuery && !showAll && popularCompetitions.length > 0 && (
          <button
            onClick={() => setShowAll(true)}
            className="w-full p-3 text-center text-blue-600 hover:text-blue-700 text-sm border border-dashed border-gray-300 rounded-lg hover:border-blue-300"
          >
            Show All Competitions
          </button>
        )}
      </div>
    </div>
  )
}

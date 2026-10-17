'use client'

import { useState } from 'react'

interface ManualMatch {
  id: string
  text: string
  homeTeam?: string
  awayTeam?: string
}

interface ManualMatchInputProps {
  onMatchesAnalyzed?: (matches: ManualMatch[]) => void
  isLoading?: boolean
}

export default function ManualMatchInput({
  onMatchesAnalyzed,
  isLoading = false,
}: ManualMatchInputProps) {
  const [matches, setMatches] = useState<ManualMatch[]>([
    { id: '1', text: '' }
  ])

  const addMatch = () => {
    if (matches.length < 30) {
      setMatches([...matches, { id: Date.now().toString(), text: '' }])
    }
  }

  const removeMatch = (id: string) => {
    if (matches.length > 1) {
      setMatches(matches.filter(match => match.id !== id))
    }
  }

  const updateMatch = (id: string, text: string) => {
    setMatches(matches.map(match => 
      match.id === id ? { ...match, text } : match
    ))
  }

  const parseMatchText = (text: string): { homeTeam: string; awayTeam: string } | null => {
    // Parse "Team A vs Team B" format
    const vsRegex = /^(.+?)\s+vs\s+(.+?)$/i
    const match = text.trim().match(vsRegex)
    
    if (match) {
      return {
        homeTeam: match[1].trim(),
        awayTeam: match[2].trim()
      }
    }
    
    return null
  }

  const checkDuplicates = (): boolean => {
    const normalizedMatches = matches
      .filter(m => m.text.trim())
      .map(m => m.text.toLowerCase().trim())
    
    const uniqueMatches = new Set(normalizedMatches)
    return uniqueMatches.size !== normalizedMatches.length
  }

  const handleSubmit = async () => {
    // Validate matches
    const validMatches = matches.filter(match => {
      const parsed = parseMatchText(match.text)
      return parsed && parsed.homeTeam && parsed.awayTeam
    })

    if (validMatches.length === 0) {
      alert('Please enter at least one match in the format "Team A vs Team B"')
      return
    }

    if (checkDuplicates()) {
      alert('Please remove duplicate matches')
      return
    }

    // Parse all matches and add parsed data
    const parsedMatches = validMatches.map(match => {
      const parsed = parseMatchText(match.text)
      return {
        ...match,
        homeTeam: parsed?.homeTeam,
        awayTeam: parsed?.awayTeam
      }
    })

    if (onMatchesAnalyzed) {
      onMatchesAnalyzed(parsedMatches)
    }
  }

  return (
    <div className="space-y-6">
      <div className="card-professional p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Enter Matches Manually
        </h3>
        <p className="text-gray-600 mb-6">
          Enter matches in the format "Team A vs Team B". You can add up to 30 matches.
        </p>
        
        <div className="space-y-4">
          {matches.map((match, index) => (
            <div key={match.id} className="flex items-center gap-3">
              <div className="flex-1">
                <input
                  type="text"
                  value={match.text}
                  onChange={(e) => updateMatch(match.id, e.target.value)}
                  placeholder="e.g., Manchester United vs Liverpool"
                  className="input-professional w-full"
                  disabled={isLoading}
                  style={{ 
                    color: '#000000', 
                    backgroundColor: '#ffffff',
                    WebkitTextFillColor: '#000000'
                  }}
                />
              </div>
              {matches.length > 1 && (
                <button
                  onClick={() => removeMatch(match.id)}
                  disabled={isLoading}
                  className="p-2 text-red-600 hover:text-red-800 disabled:opacity-50 disabled:cursor-not-allowed transition-smooth"
                  title="Remove match"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-4 mt-6">
          {matches.length < 30 && (
            <button
              onClick={addMatch}
              disabled={isLoading}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-smooth"
            >
              Add Another Match
            </button>
          )}
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="button-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Analyzing...' : 'Analyze Matches'}
          </button>
        </div>

        {matches.length >= 30 && (
          <p className="text-sm text-gray-500 mt-2">
            Maximum number of matches reached (30)
          </p>
        )}
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'

interface ManualGame {
  homeTeam: string
  awayTeam: string
  market: string
  marketDetail?: string
  selection: string
  odds: number
}

interface ManualGameSelectionProps {
  bookingCode?: string
  detectedBookmaker?: string
  confidenceLevel?: string
  onGamesConfirmed?: (games: ManualGame[]) => void
  manualMatches?: Array<{ homeTeam?: string; awayTeam?: string; text?: string }>
}

export default function ManualGameSelection({ 
  bookingCode, 
  detectedBookmaker, 
  confidenceLevel, 
  onGamesConfirmed,
  manualMatches
}: ManualGameSelectionProps) {
  const [games, setGames] = useState<ManualGame[]>(() => {
    // Initialize with manual matches if provided
    if (manualMatches && manualMatches.length > 0) {
      return manualMatches.map(match => ({
        homeTeam: match.homeTeam || '',
        awayTeam: match.awayTeam || '',
        market: '1X2',
        selection: '',
        odds: 0
      }))
    }
    return [{ homeTeam: '', awayTeam: '', market: '1X2', selection: '', odds: 0 }]
  })

  const markets = [
    '1X2', 
    'Over/Under 2.5 Goals', 
    'Both Teams To Score', 
    'Over / Under 8.5 Corners',
    'Over / Under 3.5 Cards'
  ]
  const teams = [
    'Manchester United', 'Liverpool', 'Arsenal', 'Chelsea', 'Manchester City',
    'Tottenham', 'Newcastle', 'Aston Villa', 'West Ham', 'Brighton',
    'Real Madrid', 'Barcelona', 'Atletico Madrid', 'Sevilla', 'Valencia',
    'Bayern Munich', 'Borussia Dortmund', 'RB Leipzig', 'Bayer Leverkusen'
  ]

  const getMarketDetails = (market: string) => {
    switch (market) {
      case '1X2':
        return ['Home', 'Draw', 'Away']
      case 'Over/Under 2.5 Goals':
      case 'Over / Under 8.5 Corners':
      case 'Over / Under 3.5 Cards':
        return ['Over', 'Under']
      case 'Both Teams To Score':
        return ['Yes', 'No']
      default:
        return []
    }
  }

  const addGame = () => {
    setGames([...games, { homeTeam: '', awayTeam: '', market: '1X2', selection: '', odds: 0 }])
  }

  const removeGame = (index: number) => {
    setGames(games.filter((_, i) => i !== index))
  }

  const updateGame = (index: number, field: keyof ManualGame, value: string | number) => {
    const updatedGames = [...games]
    updatedGames[index] = { ...updatedGames[index], [field]: value }
    
    // Reset market detail when market changes
    if (field === 'market') {
      updatedGames[index].selection = ''
      updatedGames[index].marketDetail = undefined
    }
    
    setGames(updatedGames)
  }

  const handleSubmit = () => {
    // Validate games
    const validGames = games.filter(game => 
      game.homeTeam && game.awayTeam && game.market && game.selection && game.odds > 0
    )
    
    if (validGames.length === 0) {
      alert('Please fill in at least one complete game')
      return
    }

    // Pass confirmed games to parent component
    if (onGamesConfirmed) {
      onGamesConfirmed(validGames)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Booking Code Information */}
      {(bookingCode || detectedBookmaker || confidenceLevel) && (
        <div className="card-professional p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Booking Code Analysis
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {bookingCode && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Booking Code
                </label>
                <div className="input-professional bg-gray-50">
                  {bookingCode}
                </div>
              </div>
            )}
            {detectedBookmaker && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Detected Bookmaker
                </label>
                <div className="input-professional bg-gray-50">
                  {detectedBookmaker}
                </div>
              </div>
            )}
            {confidenceLevel && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confidence Level
                </label>
                <div className="input-professional bg-gray-50">
                  {confidenceLevel}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Game Selection */}
      <div className="card-professional p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Confirm Game Details
        </h3>
        <div className="space-y-6">
          {games.map((game, index) => (
            <div key={index} className="card-professional p-6 hover-lift">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Home Team
                  </label>
                  <input
                    type="text"
                    list="teams"
                    value={game.homeTeam}
                    onChange={(e) => updateGame(index, 'homeTeam', e.target.value)}
                    className="input-professional w-full"
                    placeholder="Enter home team"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Away Team
                  </label>
                  <input
                    type="text"
                    list="teams"
                    value={game.awayTeam}
                    onChange={(e) => updateGame(index, 'awayTeam', e.target.value)}
                    className="input-professional w-full"
                    placeholder="Enter away team"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Market
                  </label>
                  <select
                    value={game.market}
                    onChange={(e) => updateGame(index, 'market', e.target.value)}
                    className="input-professional w-full"
                  >
                    {markets.map(market => (
                      <option key={market} value={market}>{market}</option>
                    ))}
                  </select>
                </div>

                {getMarketDetails(game.market).length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Selection
                    </label>
                    <select
                      value={game.selection}
                      onChange={(e) => updateGame(index, 'selection', e.target.value)}
                      className="input-professional w-full"
                    >
                      <option value="">Select...</option>
                      {getMarketDetails(game.market).map(detail => (
                        <option key={detail} value={detail}>{detail}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Odds
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={game.odds || ''}
                    onChange={(e) => updateGame(index, 'odds', parseFloat(e.target.value) || 0)}
                    className="input-professional w-full"
                    placeholder="Enter odds"
                  />
                </div>
              </div>

              {games.length > 1 && (
                <button
                  onClick={() => removeGame(index)}
                  className="mt-3 text-sm text-red-600 hover:text-red-800 transition-smooth"
                >
                  Remove Game
                </button>
              )}
            </div>
          ))}
        </div>

        <datalist id="teams">
          {teams.map(team => (
            <option key={team} value={team} />
          ))}
        </datalist>

        <div className="flex gap-4">
          <button
            onClick={addGame}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-smooth"
          >
            Add Another Game
          </button>
          <button
            onClick={handleSubmit}
            className="button-primary"
          >
            Analyze Games
          </button>
        </div>
      </div>
    </div>
  )
}

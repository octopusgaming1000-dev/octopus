'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/Header'
import Disclaimer from '@/components/Disclaimer'
import BookingCodeInput from '@/components/BookingCodeInput'
import ManualMatchInput from '@/components/ManualMatchInput'
import AnalysisCard from '@/components/AnalysisCard'
import ManualGameSelection from '@/components/ManualGameSelection'
import AnalysisResults from '@/components/AnalysisResults'
import { LazySection, ResponsiveWrapper, aiCache } from '@/components/LazyLoading'
import { footballAnalysisEngine, MatchData, MarketAnalysis } from '@/lib/analysis-engine'

interface ManualMatch {
  id: string
  text: string
  homeTeam?: string
  awayTeam?: string
}

interface ApiSelection {
  id: string
  fixture: {
    homeTeam: string
    awayTeam: string
    competition: string
    matchDate: string
  }
  market: string
  selection: string
  odds: number
  analysis: {
    impliedProbability: number
    combinedProbability?: number
    riskLevel: 'low' | 'medium' | 'high'
    probabilityRange: { min: number; max: number }
    explanation: string
  }
  consensus?: {
    percentage: number
    summary: string
  } | null
  alternativeMarkets?: Array<{
    market: string
    selection: string
    estimatedOdds: number
    impliedProbability: number
    rationale: string
  }>
  metadata?: {
    source: string
    decodedAt: string
    note?: string
  }
}

export default function HomePage() {
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<ApiSelection[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showManualSelection, setShowManualSelection] = useState(false)
  const [isGuest, setIsGuest] = useState(false)
  const [guestMessage, setGuestMessage] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const [manualMatches, setManualMatches] = useState<ManualMatch[]>([])

  useEffect(() => {
    checkAuthStatus()
  }, [])

  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      if (!token) {
        setUser(null)
        return
      }

      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const userData = await response.json()
        setUser(userData.user)
      } else {
        setUser(null)
        localStorage.removeItem('auth_token')
      }
    } catch (error) {
      setUser(null)
    }
  }

  const handleAnalyze = async (code: string) => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze booking code')
      }

      // Check if manual selection is needed
      if (data.data.manualSelection) {
        setShowManualSelection(true)
        setResults(null)
        return
      }

      // Set guest information - only show if user is not authenticated locally
      const isActuallyGuest = !user && data.data.isGuest
      setIsGuest(isActuallyGuest)
      setGuestMessage(isActuallyGuest ? "Results are temporary. Sign up to save your analysis." : null)

      setResults(data.data.selections)
    } catch (err: any) {
      setError(
        err.message ||
          'An unexpected error occurred while analyzing the booking code.'
      )
      setResults(null)
    } finally {
      setIsLoading(false)
    }
  }

  const handleManualMatchesAnalyze = async (matches: ManualMatch[]) => {
    try {
      setIsLoading(true)
      setError(null)
      setManualMatches(matches)

      // Convert manual matches to the format expected by the API
      const matchData = matches.map(match => ({
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        text: match.text
      }))

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          manualMatches: matchData,
          isManualInput: true 
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze matches')
      }

      // Set guest information - only show if user is not authenticated locally
      const isActuallyGuest = !user && data.data.isGuest
      setIsGuest(isActuallyGuest)
      setGuestMessage(isActuallyGuest ? "Results are temporary. Sign up to save your analysis." : null)

      setResults(data.data.selections)
    } catch (err: any) {
      setError(
        err.message ||
          'An unexpected error occurred while analyzing the matches.'
      )
      setResults(null)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      {/* Desktop Layout with Side Panel */}
      <div className="flex max-w-screen-2xl mx-auto">
        {/* Main Content */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-16 lg:pr-0">
          <section className="max-w-3xl mx-auto mb-12">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Analyze Football Matches
              </h2>
              <p className="text-gray-600 mb-4">
                Enter matches manually using the format "Team A vs Team B" to get AI-powered analysis and insights.
              </p>
              <Disclaimer />
            </div>
            
            <ManualMatchInput 
              onMatchesAnalyzed={handleManualMatchesAnalyze} 
              isLoading={isLoading}
            />
            
            <div className="mt-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Booking Code Entry (Temporarily Disabled)
              </h3>
              <BookingCodeInput onAnalyze={handleAnalyze} isLoading={isLoading} />
            </div>
            
            {error && (
              <p className="mt-4 text-sm text-red-600" role="alert">
                {error}
              </p>
            )}
          </section>

          {showManualSelection && (
            <section className="max-w-3xl mx-auto mt-10 animate-fade-in">
              <div className="card-professional p-6">
                <h2 className="text-xl font-semibold mb-4">Manual Game Selection</h2>
                <p className="text-gray-600 mb-6">
                  We couldn't auto-detect your games. Please select them manually.
                </p>
                <ManualGameSelection />
              </div>
            </section>
          )}

          {results && results.length > 0 && (
            <section className="max-w-5xl mx-auto mt-10 animate-fade-in">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-900">
                  Analysis Results
                </h3>
                <div className="flex items-center gap-2">
                  {results[0]?.metadata?.note && (
                    <div className="text-sm text-amber-600 bg-amber-50 px-3 py-1 rounded-full">
                      Sample Data
                    </div>
                  )}
                  {guestMessage && !user && (
                    <div className="text-sm text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                      {guestMessage}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Responsive Grid Layout */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {results.map((selection) => (
                  <div key={selection.id} className="animate-fade-in">
                    <AnalysisCard
                      fixture={selection.fixture}
                      market={selection.market}
                      selection={selection.selection}
                      odds={selection.odds}
                      analysis={selection.analysis}
                      consensus={selection.consensus || undefined}
                      alternativeMarkets={selection.alternativeMarkets}
                    />
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="max-w-3xl mx-auto mt-12">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              How it works
            </h3>
            <p className="text-gray-600 mb-2">
              When you enter matches manually in the format "Team A vs Team B", our AI analyzes each match using advanced statistical models. 
              We calculate implied probabilities, estimate risk levels, and provide plain-English explanations for each market.
            </p>
            <p className="text-gray-600 mb-2">
              Our analysis considers recent team form, head-to-head records, home/away performance, and other key factors to provide comprehensive insights.
            </p>
            <p className="text-gray-600">
              Over time, as more users submit matches, we also surface anonymous crowd intelligence, such as trending markets and consensus predictions. 
              This information is descriptive only and is not a recommendation to place any bets.
            </p>
          </section>
        </main>

        {/* Desktop Side Panel - Community & Stats */}
        <aside className="hidden xl:block w-80 border-l border-gray-200 bg-white">
          <div className="sticky top-6 h-fit p-6 space-y-6">
            {/* Lazy loaded Community Section */}
            <LazySection
              fallback={
                <div className="card-professional p-4">
                  <div className="h-6 bg-gray-200 rounded animate-pulse mb-3"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                </div>
              }
            >
              <div className="card-professional p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Community Activity
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Active Analyses</span>
                    <span className="font-medium text-gray-900">247</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Trending Markets</span>
                    <span className="font-medium text-gray-900">Over/Under 2.5</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Consensus Accuracy</span>
                    <span className="font-medium text-green-600">67%</span>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <Link
                    href="/community"
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    View Community →
                  </Link>
                </div>
              </div>
            </LazySection>

            {/* Lazy loaded Expanded Stats */}
            <LazySection
              fallback={
                <div className="card-professional p-4">
                  <div className="h-6 bg-gray-200 rounded animate-pulse mb-3"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                </div>
              }
            >
              <div className="card-professional p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Platform Statistics
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Total Analyses</span>
                    <span className="font-medium text-gray-900">12,847</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Success Rate</span>
                    <span className="font-medium text-green-600">64.3%</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Avg. Confidence</span>
                    <span className="font-medium text-gray-900">72.1%</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Risk Score</span>
                    <span className="font-medium text-amber-600">Medium</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Last Updated</span>
                    <span className="font-medium text-gray-900">2 min ago</span>
                  </div>
                </div>
              </div>
            </LazySection>

            {/* Lazy loaded Quick Actions */}
            <LazySection
              fallback={
                <div className="card-professional p-4">
                  <div className="h-6 bg-gray-200 rounded animate-pulse mb-3"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                </div>
              }
            >
              <div className="card-professional p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Quick Actions
                </h3>
                <div className="space-y-2">
                  <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md transition-colors">
                    📊 View Analysis History
                  </button>
                  <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md transition-colors">
                    📈 Trending Predictions
                  </button>
                  <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md transition-colors">
                    🏆 Top Performers
                  </button>
                  <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md transition-colors">
                    📚 Educational Resources
                  </button>
                </div>
              </div>
            </LazySection>
          </div>
        </aside>
      </div>

      {/* Tablet Layout - Two Column */}
      <div className="xl:hidden lg:block hidden">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content - 2 columns */}
            <div className="lg:col-span-2">
              {/* Community & Stats Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <div className="card-professional p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    Community Activity
                  </h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Active Analyses</span>
                      <span className="font-medium text-gray-900">247</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Trending Markets</span>
                      <span className="font-medium text-gray-900">Over/Under 2.5</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Consensus Accuracy</span>
                      <span className="font-medium text-green-600">67%</span>
                    </div>
                  </div>
                </div>

                <div className="card-professional p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    Platform Statistics
                  </h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Total Analyses</span>
                      <span className="font-medium text-gray-900">12,847</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Success Rate</span>
                      <span className="font-medium text-green-600">64.3%</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Avg. Confidence</span>
                      <span className="font-medium text-gray-900">72.1%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Side Content - 1 column */}
            <div className="lg:col-span-1">
              <div className="card-professional p-4 sticky top-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Quick Actions
                </h3>
                <div className="space-y-2">
                  <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md transition-colors">
                    📊 View Analysis History
                  </button>
                  <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md transition-colors">
                    📈 Trending Predictions
                  </button>
                  <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md transition-colors">
                    🏆 Top Performers
                  </button>
                  <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md transition-colors">
                    📚 Educational Resources
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}



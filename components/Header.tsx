'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import NotificationBell from './NotificationBell'
import { useState, useEffect, useRef } from 'react'
import OctopusLogo from './OctopusLogo'

export default function Header() {
  const pathname = usePathname()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    checkAuthStatus()
  }, [])

  useEffect(() => {
    // Close mobile menu when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMobileMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const checkAuthStatus = async () => {
    try {
      // Check for stored token first
      const token = localStorage.getItem('auth_token')
      const headers: HeadersInit = {}
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
      
      const response = await fetch('/api/auth/me', { headers })
      if (response.ok) {
        const userData = await response.json()
        setUser(userData.user)
      } else {
        // Handle 401 or other auth errors
        setUser(null)
        // Clear invalid token
        if (token) {
          localStorage.removeItem('auth_token')
        }
      }
    } catch (error) {
      // User is not logged in
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      setUser(null)
      // Clear stored token
      localStorage.removeItem('auth_token')
      window.location.href = '/'
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  const handleMobileMenuToggle = () => {
    setMobileMenuOpen(!mobileMenuOpen)
  }

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center space-x-3">
            <OctopusLogo size="medium" className="hover-lift" />
            <h1 className="text-xl sm:text-2xl font-bold text-gradient hover-lift">
              Octopus
            </h1>
          </Link>
          
          {/* Desktop Navigation */}
          <nav className="hidden sm:flex space-x-4">
            <Link
              href="/"
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                pathname === '/'
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Analyze
            </Link>
            
            {user && (
              <Link
                href="/matches"
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  pathname === '/matches'
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                Matches
              </Link>
            )}
            
            <Link
              href="/community"
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                pathname === '/community'
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Community
            </Link>
            
            {user && (
              <Link
                href="/competitions"
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  pathname === '/competitions'
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                Competitions
              </Link>
            )}
            
            {user && (
              <Link
                href="/leaderboard"
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  pathname === '/leaderboard'
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                Leaderboard
              </Link>
            )}
            
            {user && (
              <Link
                href="/dashboard"
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  pathname === '/dashboard'
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                Dashboard
              </Link>
            )}
            
            {user && <NotificationBell />}
            
            {loading ? (
              <div className="px-3 py-2 text-sm text-gray-500">Loading...</div>
            ) : user ? (
              <div className="flex items-center space-x-3">
                <span className="text-sm text-gray-700 hidden md:block">
                  {user.name || user.email}
                </span>
                <button
                  onClick={handleLogout}
                  className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100"
                >
                  Logout
                </button>
              </div>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100"
                >
                  Login
                </Link>
                <Link
                  href="/signup"
                  className="px-3 py-2 rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700"
                >
                  Sign Up
                </Link>
              </>
            )}
          </nav>

          {/* Mobile Profile Toggle */}
          <div className="sm:hidden" ref={menuRef}>
            {loading ? (
              <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
            ) : user ? (
              <button
                onClick={handleMobileMenuToggle}
                className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                aria-label="User menu"
                aria-expanded={mobileMenuOpen}
                aria-haspopup="true"
              >
                {user.image ? (
                  <img
                    src={user.image}
                    alt="Profile"
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <svg
                    className="w-6 h-6 text-gray-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                )}
              </button>
            ) : (
              <button
                onClick={handleMobileMenuToggle}
                className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                aria-label="User menu"
                aria-expanded={mobileMenuOpen}
                aria-haspopup="true"
              >
                <svg
                  className="w-6 h-6 text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </button>
            )}

            {/* Mobile Dropdown Menu */}
            {mobileMenuOpen && (
              <div 
                className="absolute right-2 sm:right-4 top-16 w-56 max-w-[calc(100vw-2rem)] bg-white rounded-lg shadow-lg border border-gray-200 z-50 animate-in slide-in-from-top-2 duration-200"
                role="menu"
              >
                {loading ? (
                  <div className="py-4">
                    <div className="px-4 py-2">
                      <div className="w-full h-4 bg-gray-200 rounded animate-pulse mb-2"></div>
                      <div className="w-full h-3 bg-gray-200 rounded animate-pulse w-3/4"></div>
                    </div>
                    <div className="border-t border-gray-200 mt-2 pt-2">
                      <div className="px-4 py-2">
                        <div className="w-full h-3 bg-gray-200 rounded animate-pulse mb-1"></div>
                        <div className="w-full h-3 bg-gray-200 rounded animate-pulse mb-1"></div>
                        <div className="w-full h-3 bg-gray-200 rounded animate-pulse"></div>
                      </div>
                    </div>
                  </div>
                ) : user ? (
                  <div className="py-2">
                    <div className="px-4 py-2 border-b border-gray-200">
                      <p className="text-sm font-medium text-gray-900">
                        {user.name || 'User'}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {user.email}
                      </p>
                    </div>
                    
                    {/* Mobile Navigation Links */}
                    <div className="border-b border-gray-200">
                      <Link
                        href="/"
                        role="menuitem"
                        className={`block px-4 py-2 text-sm touch-manipulation ${
                          pathname === '/'
                            ? 'text-blue-600 font-medium bg-blue-50'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Analyze
                      </Link>
                      
                      <Link
                        href="/matches"
                        role="menuitem"
                        className={`block px-4 py-2 text-sm touch-manipulation ${
                          pathname === '/matches'
                            ? 'text-blue-600 font-medium bg-blue-50'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Matches
                      </Link>
                      
                      <Link
                        href="/community"
                        role="menuitem"
                        className={`block px-4 py-2 text-sm touch-manipulation ${
                          pathname === '/community'
                            ? 'text-blue-600 font-medium bg-blue-50'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Community
                      </Link>
                      
                      <Link
                        href="/competitions"
                        role="menuitem"
                        className={`block px-4 py-2 text-sm touch-manipulation ${
                          pathname === '/competitions'
                            ? 'text-blue-600 font-medium bg-blue-50'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Competitions
                      </Link>
                      
                      <Link
                        href="/leaderboard"
                        role="menuitem"
                        className={`block px-4 py-2 text-sm touch-manipulation ${
                          pathname === '/leaderboard'
                            ? 'text-blue-600 font-medium bg-blue-50'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Leaderboard
                      </Link>
                      
                      <Link
                        href="/dashboard"
                        role="menuitem"
                        className={`block px-4 py-2 text-sm touch-manipulation ${
                          pathname === '/dashboard'
                            ? 'text-blue-600 font-medium bg-blue-50'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Dashboard
                      </Link>
                    </div>
                    
                    {/* User Actions */}
                    <Link
                      href="/notifications"
                      role="menuitem"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 touch-manipulation"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Notifications
                    </Link>
                    
                    <Link
                      href="/profile"
                      role="menuitem"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 touch-manipulation"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      View Profile
                    </Link>
                    
                    <Link
                      href="/dashboard"
                      role="menuitem"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 touch-manipulation"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Saved Analyses
                    </Link>
                    
                    <Link
                      href="/community"
                      role="menuitem"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 touch-manipulation"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Community Activity
                    </Link>
                    
                    <Link
                      href="/settings"
                      role="menuitem"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 touch-manipulation"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Settings
                    </Link>
                    
                    <div className="border-t border-gray-200 mt-2 pt-2">
                      <button
                        onClick={() => {
                          handleLogout()
                          setMobileMenuOpen(false)
                        }}
                        className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 touch-manipulation"
                        role="menuitem"
                      >
                        Logout
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="py-2">
                    {/* Guest Navigation Links */}
                    <Link
                      href="/"
                      role="menuitem"
                      className={`block px-4 py-2 text-sm touch-manipulation ${
                        pathname === '/'
                          ? 'text-blue-600 font-medium bg-blue-50'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Analyze
                    </Link>
                    
                    <div className="border-t border-gray-200 mt-2 pt-2">
                      <Link
                        href="/login"
                        role="menuitem"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 touch-manipulation"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Login
                      </Link>
                      
                      <Link
                        href="/signup"
                        role="menuitem"
                        className="block px-4 py-2 text-sm font-medium text-blue-600 hover:bg-gray-100 touch-manipulation"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Sign Up
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}


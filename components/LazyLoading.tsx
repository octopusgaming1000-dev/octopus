/**
 * Lazy Loading Component for Performance Optimization
 * 
 * Implements mobile-first loading with lazy loading for non-critical sections
 * and shared AI cache across devices.
 */

'use client'

import { useState, useEffect, useRef, Suspense } from 'react'

interface LazySectionProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  rootMargin?: string
  threshold?: number
  className?: string
}

/**
 * Lazy loading component with intersection observer
 */
export function LazySection({ 
  children, 
  fallback = <div className="animate-pulse bg-gray-200 h-32 rounded-lg"></div>,
  rootMargin = '50px',
  threshold = 0.1,
  className = ''
}: LazySectionProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(false)
  const elementRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasLoaded) {
          setIsVisible(true)
          setHasLoaded(true)
          observer.unobserve(element)
        }
      },
      {
        rootMargin,
        threshold,
      }
    )

    observer.observe(element)

    return () => {
      if (element) {
        observer.unobserve(element)
      }
    }
  }, [rootMargin, threshold, hasLoaded])

  return (
    <div ref={elementRef} className={className}>
      {isVisible ? (
        <Suspense fallback={fallback}>
          {children}
        </Suspense>
      ) : (
        fallback
      )}
    </div>
  )
}

/**
 * Progressive image loading component
 */
interface ProgressiveImageProps {
  src: string
  alt: string
  className?: string
  placeholder?: string
}

export function ProgressiveImage({ 
  src, 
  alt, 
  className = '',
  placeholder = '/api/placeholder/400/300'
}: ProgressiveImageProps) {
  const [imageSrc, setImageSrc] = useState(placeholder)
  const [imageLoaded, setImageLoaded] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    const img = new Image()
    img.src = src
    img.onload = () => {
      setImageSrc(src)
      setImageLoaded(true)
    }
  }, [src])

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <img
        ref={imgRef}
        src={imageSrc}
        alt={alt}
        className={`transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-70'}`}
      />
      {!imageLoaded && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse" />
      )}
    </div>
  )
}

/**
 * Mobile-first data loading hook
 */
export function useMobileFirstData<T>(
  mobileData: () => Promise<T>,
  tabletData?: () => Promise<T>,
  desktopData?: () => Promise<T>
) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Detect screen size
        const width = window.innerWidth
        let dataPromise: Promise<T>

        if (width >= 1024 && desktopData) {
          // Desktop: Load full data
          dataPromise = desktopData()
        } else if (width >= 768 && tabletData) {
          // Tablet: Load medium data
          dataPromise = tabletData()
        } else {
          // Mobile: Load minimal data first
          dataPromise = mobileData()
        }

        const result = await dataPromise
        setData(result)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data')
      } finally {
        setLoading(false)
      }
    }

    loadData()

    // Handle resize events to load appropriate data
    const handleResize = () => {
      const width = window.innerWidth
      
      // Only reload if crossing breakpoints
      if ((width < 768 && data) || (width >= 768 && width < 1024 && !tabletData) || (width >= 1024 && desktopData)) {
        loadData()
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [mobileData, tabletData, desktopData])

  return { data, loading, error }
}

/**
 * Shared AI cache manager
 */
class AICacheManager {
  private cache = new Map<string, any>()
  private cacheExpiry = new Map<string, number>()
  private readonly DEFAULT_TTL = 5 * 60 * 1000 // 5 minutes

  set(key: string, data: any, ttl: number = this.DEFAULT_TTL): void {
    this.cache.set(key, data)
    this.cacheExpiry.set(key, Date.now() + ttl)
    
    // Also store in localStorage for cross-device sharing
    try {
      const cacheData = {
        data,
        expiry: Date.now() + ttl,
      }
      localStorage.setItem(`ai_cache_${key}`, JSON.stringify(cacheData))
    } catch (error) {
      console.warn('Failed to store in localStorage:', error)
    }
  }

  get(key: string): any | null {
    // Check memory cache first
    const memoryExpiry = this.cacheExpiry.get(key)
    if (memoryExpiry && Date.now() < memoryExpiry) {
      return this.cache.get(key)
    }

    // Check localStorage
    try {
      const stored = localStorage.getItem(`ai_cache_${key}`)
      if (stored) {
        const cacheData = JSON.parse(stored)
        if (cacheData.expiry > Date.now()) {
          // Restore to memory cache
          this.cache.set(key, cacheData.data)
          this.cacheExpiry.set(key, cacheData.expiry)
          return cacheData.data
        } else {
          // Clean up expired cache
          localStorage.removeItem(`ai_cache_${key}`)
        }
      }
    } catch (error) {
      console.warn('Failed to read from localStorage:', error)
    }

    // Clean up expired memory cache
    if (memoryExpiry && Date.now() >= memoryExpiry) {
      this.cache.delete(key)
      this.cacheExpiry.delete(key)
    }

    return null
  }

  clear(): void {
    this.cache.clear()
    this.cacheExpiry.clear()
    
    // Clear localStorage cache
    try {
      const keys = Object.keys(localStorage)
      keys.forEach(key => {
        if (key.startsWith('ai_cache_')) {
          localStorage.removeItem(key)
        }
      })
    } catch (error) {
      console.warn('Failed to clear localStorage cache:', error)
    }
  }

  // Preload common AI responses
  async preloadCommonResponses(): Promise<void> {
    const commonQueries = [
      'match_analysis',
      'probability_calculation',
      'risk_assessment',
      'market_insights',
    ]

    for (const query of commonQueries) {
      if (!this.get(query)) {
        try {
          // Simulate AI response preloading
          const mockData = {
            query,
            response: `Preloaded response for ${query}`,
            timestamp: Date.now(),
          }
          this.set(query, mockData, 10 * 60 * 1000) // 10 minutes
        } catch (error) {
          console.warn(`Failed to preload ${query}:`, error)
        }
      }
    }
  }
}

// Global AI cache instance
export const aiCache = new AICacheManager()

/**
 * Performance monitoring hook
 */
export function usePerformanceMonitor() {
  const [metrics, setMetrics] = useState({
    loadTime: 0,
    renderTime: 0,
    cacheHitRate: 0,
    errorCount: 0,
  })

  const startTime = useRef<number>(Date.now())

  useEffect(() => {
    // Record initial load time
    const loadTime = Date.now() - startTime.current
    setMetrics(prev => ({ ...prev, loadTime }))

    // Monitor performance
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.entryType === 'measure') {
          setMetrics(prev => ({
            ...prev,
            renderTime: entry.duration,
          }))
        }
      })
    })

    observer.observe({ entryTypes: ['measure'] })

    return () => observer.disconnect()
  }, [])

  const recordError = () => {
    setMetrics(prev => ({ ...prev, errorCount: prev.errorCount + 1 }))
  }

  const recordCacheHit = () => {
    setMetrics(prev => ({
      ...prev,
      cacheHitRate: prev.cacheHitRate + 1,
    }))
  }

  return { metrics, recordError, recordCacheHit }
}

/**
 * Responsive component wrapper with performance optimization
 */
interface ResponsiveWrapperProps {
  children: React.ReactNode
  mobile?: React.ReactNode
  tablet?: React.ReactNode
  desktop?: React.ReactNode
  className?: string
}

export function ResponsiveWrapper({
  children,
  mobile,
  tablet,
  desktop,
  className = ''
}: ResponsiveWrapperProps) {
  const [screenSize, setScreenSize] = useState<'mobile' | 'tablet' | 'desktop'>('mobile')

  useEffect(() => {
    const updateScreenSize = () => {
      const width = window.innerWidth
      if (width < 768) {
        setScreenSize('mobile')
      } else if (width < 1024) {
        setScreenSize('tablet')
      } else {
        setScreenSize('desktop')
      }
    }

    updateScreenSize()
    window.addEventListener('resize', updateScreenSize)
    return () => window.removeEventListener('resize', updateScreenSize)
  }, [])

  const getContent = () => {
    switch (screenSize) {
      case 'mobile':
        return mobile || children
      case 'tablet':
        return tablet || children
      case 'desktop':
        return desktop || children
      default:
        return children
    }
  }

  return (
    <div className={`responsive-wrapper ${className}`}>
      {getContent()}
    </div>
  )
}

export default {
  LazySection,
  ProgressiveImage,
  useMobileFirstData,
  aiCache,
  usePerformanceMonitor,
  ResponsiveWrapper,
}

/**
 * Silent Analytics System
 * 
 * Tracks feature usage and engagement for internal insights only.
 * No user-facing analytics or tracking notifications.
 */

import { isFeatureEnabled } from './feature-flags'

export interface AnalyticsEvent {
  event: string
  userId?: string
  sessionId: string
  timestamp: Date
  properties: Record<string, any>
  metadata: {
    userAgent: string
    referrer: string
    path: string
    tier: string
  }
}

export interface UsageMetrics {
  userId?: string
  date: string
  analysesPerformed: number
  featuresUsed: string[]
  sessionDuration: number
  pagesViewed: string[]
  errors: number
}

export interface EngagementMetrics {
  userId?: string
  date: string
  timeSpent: number
  interactionsCount: number
  featureInteractions: Record<string, number>
  returnVisits: number
  lastActive: Date
}

class SilentAnalytics {
  private sessionId: string
  private startTime: Date
  private isEnabled: boolean
  private events: AnalyticsEvent[] = []
  private usageMetrics: Partial<UsageMetrics> = {}
  private engagementMetrics: Partial<EngagementMetrics> = {}

  constructor() {
    this.sessionId = this.generateSessionId()
    this.startTime = new Date()
    this.isEnabled = isFeatureEnabled('USAGE_ANALYTICS_ENABLED')
    
    if (this.isEnabled) {
      this.initializeSession()
    }
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private initializeSession(): void {
    this.trackEvent('session_start', {
      sessionDuration: 0,
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server',
      referrer: typeof window !== 'undefined' ? document.referrer : 'direct',
      path: typeof window !== 'undefined' ? window.location.pathname : 'server',
    })
  }

  /**
   * Track an event silently (no user notification)
   */
  trackEvent(event: string, properties: Record<string, any> = {}): void {
    if (!this.isEnabled) return

    const analyticsEvent: AnalyticsEvent = {
      event,
      userId: this.getUserId(),
      sessionId: this.sessionId,
      timestamp: new Date(),
      properties,
      metadata: {
        userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server',
        referrer: typeof window !== 'undefined' ? document.referrer : 'direct',
        path: typeof window !== 'undefined' ? window.location.pathname : 'server',
        tier: 'FREE', // Currently all users are FREE
      },
    }

    this.events.push(analyticsEvent)
    this.updateMetrics(event, properties)
    
    // Send to analytics service (silently)
    this.sendEvent(analyticsEvent)
  }

  /**
   * Track feature usage
   */
  trackFeatureUsage(feature: string, properties: Record<string, any> = {}): void {
    this.trackEvent('feature_used', {
      feature,
      ...properties,
    })

    // Update usage metrics
    if (!this.usageMetrics.featuresUsed) {
      this.usageMetrics.featuresUsed = []
    }
    if (!this.usageMetrics.featuresUsed.includes(feature)) {
      this.usageMetrics.featuresUsed.push(feature)
    }
  }

  /**
   * Track analysis performed
   */
  trackAnalysisPerformed(properties: {
    analysisType: string
    bookmaker?: string
    matchCount: number
    processingTime?: number
    success: boolean
  }): void {
    this.trackEvent('analysis_performed', properties)

    // Update usage metrics
    this.usageMetrics.analysesPerformed = (this.usageMetrics.analysesPerformed || 0) + 1

    if (properties.success) {
      this.trackFeatureUsage('analysis_success', properties)
    } else {
      this.trackFeatureUsage('analysis_failure', properties)
      this.usageMetrics.errors = (this.usageMetrics.errors || 0) + 1
    }
  }

  /**
   * Track page view
   */
  trackPageView(path: string): void {
    this.trackEvent('page_view', { path })

    // Update engagement metrics
    if (!this.usageMetrics.pagesViewed) {
      this.usageMetrics.pagesViewed = []
    }
    this.usageMetrics.pagesViewed.push(path)

    if (!this.engagementMetrics.featureInteractions) {
      this.engagementMetrics.featureInteractions = {}
    }
    this.engagementMetrics.featureInteractions[path] = 
      (this.engagementMetrics.featureInteractions[path] || 0) + 1
  }

  /**
   * Track user interaction
   */
  trackInteraction(action: string, properties: Record<string, any> = {}): void {
    this.trackEvent('user_interaction', { action, ...properties })

    // Update engagement metrics
    this.engagementMetrics.interactionsCount = (this.engagementMetrics.interactionsCount || 0) + 1
  }

  /**
   * Track error
   */
  trackError(error: Error | string, context: Record<string, any> = {}): void {
    this.trackEvent('error_occurred', {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      ...context,
    })

    this.usageMetrics.errors = (this.usageMetrics.errors || 0) + 1
  }

  /**
   * End session and send final metrics
   */
  endSession(): void {
    if (!this.isEnabled) return

    const sessionDuration = Date.now() - this.startTime.getTime()
    
    this.trackEvent('session_end', {
      sessionDuration,
      totalEvents: this.events.length,
      totalAnalyses: this.usageMetrics.analysesPerformed || 0,
      totalErrors: this.usageMetrics.errors || 0,
    })

    // Send final metrics
    this.sendMetrics()
  }

  private updateMetrics(event: string, properties: Record<string, any>): void {
    // Update engagement metrics
    this.engagementMetrics.lastActive = new Date()
    this.engagementMetrics.interactionsCount = (this.engagementMetrics.interactionsCount || 0) + 1
  }

  private getUserId(): string | undefined {
    // Get user ID from localStorage or auth context
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('auth_token')
      if (token) {
        try {
          // Simple token parsing - in real app, decode JWT properly
          return 'user_' + token.substring(0, 8)
        } catch {
          return undefined
        }
      }
    }
    return undefined
  }

  private async sendEvent(event: AnalyticsEvent): Promise<void> {
    // In production, send to analytics service
    // For now, just store in memory (could be sent to a logging service)
    try {
      // Example: await fetch('/api/analytics', { method: 'POST', body: JSON.stringify(event) })
      console.debug('Analytics event tracked:', event.event)
    } catch (error) {
      // Fail silently - analytics should never break the app
      console.debug('Analytics tracking failed:', error)
    }
  }

  private async sendMetrics(): Promise<void> {
    if (!this.isEnabled) return

    const metrics = {
      usage: {
        ...this.usageMetrics,
        userId: this.getUserId(),
        date: new Date().toISOString().split('T')[0],
        sessionDuration: Date.now() - this.startTime.getTime(),
      },
      engagement: {
        ...this.engagementMetrics,
        userId: this.getUserId(),
        date: new Date().toISOString().split('T')[0],
        timeSpent: Date.now() - this.startTime.getTime(),
        returnVisits: 1, // Simplified
      },
    }

    try {
      // Send metrics to analytics service
      console.debug('Analytics metrics sent:', metrics)
    } catch (error) {
      console.debug('Analytics metrics failed:', error)
    }
  }

  /**
   * Get current session metrics (for debugging)
   */
  getSessionMetrics(): {
    events: AnalyticsEvent[]
    usage: Partial<UsageMetrics>
    engagement: Partial<EngagementMetrics>
  } {
    return {
      events: this.events,
      usage: this.usageMetrics,
      engagement: this.engagementMetrics,
    }
  }
}

// Global analytics instance
export const analytics = new SilentAnalytics()

// React hook for analytics
export function useAnalytics() {
  return {
    trackEvent: analytics.trackEvent.bind(analytics),
    trackFeatureUsage: analytics.trackFeatureUsage.bind(analytics),
    trackAnalysisPerformed: analytics.trackAnalysisPerformed.bind(analytics),
    trackPageView: analytics.trackPageView.bind(analytics),
    trackInteraction: analytics.trackInteraction.bind(analytics),
    trackError: analytics.trackError.bind(analytics),
    endSession: analytics.endSession.bind(analytics),
  }
}

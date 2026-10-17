/**
 * Monetization Middleware System
 * 
 * Integrates feature flags, user tiers, premium features, analytics, and ethics.
 * Provides a unified interface for monetization-related functionality.
 */

import { isFeatureEnabled, FEATURE_FLAGS } from './feature-flags'
import { getUserTier, canPerformAction, getTierLimits, UserTier } from './user-tiers'
import { isPremiumFeatureCandidate, isCoreFreeFeature } from './premium-features'
import { analytics } from './analytics'
import { ethicsSafeguards } from './ethics-safeguards'

export interface MonetizationContext {
  userId?: string
  userTier?: UserTier
  sessionId: string
  isAuthenticated: boolean
  currentUsage?: {
    analysesToday: number
    analysesThisMonth: number
  }
}

export interface FeatureAccessResult {
  hasAccess: boolean
  reason?: string
  upgradeRequired?: boolean
  remainingUsage?: number
  limit?: number
}

export interface AnalysisRequest {
  userId?: string
  analysisType: string
  bookmaker?: string
  matchCount: number
  isGuest?: boolean
}

export class MonetizationMiddleware {
  private context: MonetizationContext

  constructor(context: Partial<MonetizationContext> = {}) {
    this.context = {
      sessionId: analytics['sessionId'] || 'unknown',
      isAuthenticated: false,
      ...context,
    }
  }

  /**
   * Check if user can access a feature
   */
  checkFeatureAccess(
    feature: string,
    userTier?: string,
    currentUsage?: number
  ): FeatureAccessResult {
    // Track feature access attempt
    analytics.trackFeatureUsage(feature, {
      userTier: userTier || UserTier.FREE,
      currentUsage,
    })

    // Check if it's a core free feature
    if (isCoreFreeFeature(feature)) {
      return {
        hasAccess: true,
        reason: 'Core free feature - always accessible',
      }
    }

    // Check if monetization is enabled
    if (!isFeatureEnabled('MONETIZATION_ENABLED')) {
      return {
        hasAccess: true,
        reason: 'Monetization disabled - all features accessible',
      }
    }

    // Check if premium features are enabled
    if (!isFeatureEnabled('PREMIUM_FEATURES_ENABLED')) {
      return {
        hasAccess: true,
        reason: 'Premium features disabled - all features accessible',
      }
    }

    // Check tier-based access
    const tier = getUserTier(userTier)
    const canAccess = canPerformAction(
      feature as any,
      userTier,
      currentUsage
    )

    if (canAccess) {
      return {
        hasAccess: true,
        reason: `Accessible for ${tier} tier`,
      }
    }

    // Get limits for more detailed response
    const limits = getTierLimits(userTier)
    const limitValue = limits[feature as keyof typeof limits]

    return {
      hasAccess: false,
      reason: `Feature not available for ${tier} tier`,
      upgradeRequired: true,
      remainingUsage: typeof currentUsage === 'number' && typeof limitValue === 'number' 
        ? Math.max(0, limitValue - currentUsage) 
        : undefined,
      limit: typeof limitValue === 'number' ? limitValue : undefined,
    }
  }

  /**
   * Check if user can perform analysis
   */
  canPerformAnalysis(request: AnalysisRequest): FeatureAccessResult {
    const { userId, analysisType, isGuest } = request

    // Track analysis attempt
    analytics.trackEvent('analysis_attempted', {
      analysisType,
      isGuest,
      userId,
    })

    // Guests can always analyze (for now)
    if (isGuest) {
      return {
        hasAccess: true,
        reason: 'Guest access allowed',
      }
    }

    // Check daily limits
    const dailyAccess = this.checkFeatureAccess('analysesPerDay', undefined, this.context.currentUsage?.analysesToday)
    
    if (!dailyAccess.hasAccess) {
      return {
        ...dailyAccess,
        reason: 'Daily analysis limit reached',
      }
    }

    // Check monthly limits
    const monthlyAccess = this.checkFeatureAccess('analysesPerMonth', undefined, this.context.currentUsage?.analysesThisMonth)
    
    if (!monthlyAccess.hasAccess) {
      return {
        ...monthlyAccess,
        reason: 'Monthly analysis limit reached',
      }
    }

    return {
      hasAccess: true,
      reason: 'Analysis permitted',
      remainingUsage: dailyAccess.remainingUsage,
    }
  }

  /**
   * Record successful analysis
   */
  recordAnalysis(request: AnalysisRequest, success: boolean, processingTime?: number): void {
    analytics.trackAnalysisPerformed({
      analysisType: request.analysisType,
      bookmaker: request.bookmaker,
      matchCount: request.matchCount,
      processingTime,
      success,
    })

    // Update usage metrics
    if (success) {
      this.context.currentUsage = {
        analysesToday: (this.context.currentUsage?.analysesToday || 0) + 1,
        analysesThisMonth: (this.context.currentUsage?.analysesThisMonth || 0) + 1,
      }
    }
  }

  /**
   * Get user's current limits and usage
   */
  getUserLimits(): {
    tier: UserTier
    limits: any
    currentUsage: any
    canUpgrade: boolean
  } {
    const tier = getUserTier(this.context.userTier)
    const limits = getTierLimits(this.context.userTier)
    const currentUsage = this.context.currentUsage || { analysesToday: 0, analysesThisMonth: 0 }
    
    return {
      tier,
      limits,
      currentUsage,
      canUpgrade: false, // Upgrades not available yet
    }
  }

  /**
   * Validate content for ethics compliance
   */
  validateContent(content: string): {
    isValid: boolean
    violations: string[]
    suggestions: string[]
  } {
    return ethicsSafeguards.validateContent(content)
  }

  /**
   * Get confidence score with ethics validation
   */
  getValidatedConfidence(baseConfidence: number): number {
    const validation = ethicsSafeguards.validateConfidenceScore(
      baseConfidence,
      this.context.userTier
    )

    if (validation.isManipulated) {
      analytics.trackEvent('confidence_manipulation_detected', {
        baseConfidence,
        adjustedConfidence: validation.adjustedConfidence,
        reason: validation.adjustmentReason,
      })
    }

    return validation.adjustedConfidence
  }

  /**
   * Track page view for analytics
   */
  trackPageView(path: string): void {
    analytics.trackPageView(path)
  }

  /**
   * Track user interaction
   */
  trackInteraction(action: string, properties?: Record<string, any>): void {
    analytics.trackInteraction(action, properties)
  }

  /**
   * Track error
   */
  trackError(error: Error | string, context?: Record<string, any>): void {
    analytics.trackError(error, context)
  }

  /**
   * Get monetization status (for debugging/admin)
   */
  getMonetizationStatus(): {
    monetizationEnabled: boolean
    premiumFeaturesEnabled: boolean
    activeFeatures: string[]
    ethicsCompliance: any
    userTier: UserTier
  } {
    return {
      monetizationEnabled: isFeatureEnabled('MONETIZATION_ENABLED'),
      premiumFeaturesEnabled: isFeatureEnabled('PREMIUM_FEATURES_ENABLED'),
      activeFeatures: Object.entries(FEATURE_FLAGS)
        .filter(([_, enabled]) => enabled)
        .map(([feature]) => feature),
      ethicsCompliance: ethicsSafeguards.getComplianceReport(),
      userTier: getUserTier(this.context.userTier),
    }
  }

  /**
   * Update user context
   */
  updateContext(context: Partial<MonetizationContext>): void {
    this.context = { ...this.context, ...context }
  }

  /**
   * End session
   */
  endSession(): void {
    analytics.endSession()
  }
}

// Create middleware instance
export const monetizationMiddleware = new MonetizationMiddleware()

// React hook for monetization
export function useMonetization(context?: Partial<MonetizationContext>) {
  const middleware = new MonetizationMiddleware(context)
  
  return {
    checkFeatureAccess: middleware.checkFeatureAccess.bind(middleware),
    canPerformAnalysis: middleware.canPerformAnalysis.bind(middleware),
    recordAnalysis: middleware.recordAnalysis.bind(middleware),
    getUserLimits: middleware.getUserLimits.bind(middleware),
    validateContent: middleware.validateContent.bind(middleware),
    getValidatedConfidence: middleware.getValidatedConfidence.bind(middleware),
    trackPageView: middleware.trackPageView.bind(middleware),
    trackInteraction: middleware.trackInteraction.bind(middleware),
    trackError: middleware.trackError.bind(middleware),
    getMonetizationStatus: middleware.getMonetizationStatus.bind(middleware),
    endSession: middleware.endSession.bind(middleware),
  }
}

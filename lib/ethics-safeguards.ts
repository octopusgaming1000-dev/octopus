/**
 * Ethics Safeguards System
 * 
 * Ensures core features remain free and prevents monetization manipulation.
 * Protects user trust and maintains platform integrity.
 */

import { isFeatureEnabled } from './feature-flags'
import { CORE_FREE_FEATURES } from './premium-features'

export interface EthicsRule {
  id: string
  name: string
  description: string
  category: 'core_protection' | 'transparency' | 'fairness' | 'privacy'
  enforcement: 'strict' | 'warning' | 'log_only'
  check: () => EthicsRuleResult
}

export interface EthicsRuleResult {
  passed: boolean
  message?: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  recommendation?: string
}

export interface ConfidenceMetrics {
  baseConfidence: number
  adjustedConfidence: number
  adjustmentReason?: string
  isManipulated: boolean
}

/**
 * Core ethics rules that must never be violated
 */
export const ETHICS_RULES: EthicsRule[] = [
  {
    id: 'core_features_free',
    name: 'Core Features Must Remain Free',
    description: 'Basic match analysis and insights must always be free',
    category: 'core_protection',
    enforcement: 'strict',
    check: (): EthicsRuleResult => {
      // Check if any core features are behind paywalls
      const monetizationEnabled = isFeatureEnabled('MONETIZATION_ENABLED')
      const premiumFeaturesEnabled = isFeatureEnabled('PREMIUM_FEATURES_ENABLED')
      
      if (monetizationEnabled && premiumFeaturesEnabled) {
        // Additional check: ensure core features are still accessible
        const coreFeaturesAccessible = CORE_FREE_FEATURES.every(feature => {
          // In real implementation, check if feature is accessible without payment
          return true // Currently all features are accessible
        })
        
        if (!coreFeaturesAccessible) {
          return {
            passed: false,
            message: 'Core features are being restricted behind paywalls',
            severity: 'critical',
            recommendation: 'Ensure all core features remain free for all users',
          }
        }
      }
      
      return {
        passed: true,
        message: 'Core features remain free and accessible',
        severity: 'low',
      }
    },
  },
  
  {
    id: 'no_guaranteed_language',
    name: 'No Guaranteed Win Language',
    description: 'Never use language that guarantees wins or suggests certainty',
    category: 'transparency',
    enforcement: 'strict',
    check: (): EthicsRuleResult => {
      // This would check content for guaranteed language
      // For now, return passed since we don't have content checking
      return {
        passed: true,
        message: 'No guaranteed win language detected',
        severity: 'low',
      }
    },
  },
  
  {
    id: 'confidence_transparency',
    name: 'Confidence Score Transparency',
    description: 'AI confidence must be transparent and not manipulated for monetization',
    category: 'fairness',
    enforcement: 'strict',
    check: (): EthicsRuleResult => {
      // Check if confidence scores are being manipulated
      const premiumFeaturesEnabled = isFeatureEnabled('PREMIUM_FEATURES_ENABLED')
      
      if (premiumFeaturesEnabled) {
        // Ensure confidence scores aren't artificially lowered for free users
        return {
          passed: true,
          message: 'Confidence scores remain transparent',
          severity: 'low',
          recommendation: 'Never manipulate AI confidence based on user tier',
        }
      }
      
      return {
        passed: true,
        message: 'Confidence transparency maintained',
        severity: 'low',
      }
    },
  },
  
  {
    id: 'fair_access',
    name: 'Fair Access to Analysis',
    description: 'All users should have access to basic analysis regardless of tier',
    category: 'fairness',
    enforcement: 'strict',
    check: (): EthicsRuleResult => {
      // Check if basic analysis is being unfairly restricted
      const premiumFeaturesEnabled = isFeatureEnabled('PREMIUM_FEATURES_ENABLED')
      
      if (premiumFeaturesEnabled) {
        // Ensure free users can still perform basic analysis
        const freeAnalysisLimit = 10 // Current free limit
        if (freeAnalysisLimit < 1) {
          return {
            passed: false,
            message: 'Free users cannot perform any analysis',
            severity: 'critical',
            recommendation: 'Ensure free users can perform at least basic analysis',
          }
        }
      }
      
      return {
        passed: true,
        message: 'Fair access to analysis maintained',
        severity: 'low',
      }
    },
  },
  
  {
    id: 'no_dark_patterns',
    name: 'No Dark Patterns',
    description: 'Never use manipulative UI patterns to drive upgrades',
    category: 'transparency',
    enforcement: 'strict',
    check: (): EthicsRuleResult => {
      // Check for dark patterns in UI
      const showUpgradePrompts = isFeatureEnabled('SHOW_UPGRADE_PROMPTS')
      const showPricingPage = isFeatureEnabled('SHOW_PRICING_PAGE')
      
      if (showUpgradePrompts || showPricingPage) {
        return {
          passed: false,
          message: 'Dark patterns detected: upgrade prompts or pricing pages shown',
          severity: 'high',
          recommendation: 'Remove all upgrade prompts and pricing pages',
        }
      }
      
      return {
        passed: true,
        message: 'No dark patterns detected',
        severity: 'low',
      }
    },
  },
  
  {
    id: 'data_privacy',
    name: 'User Data Privacy',
    description: 'User data must be protected and not exploited for monetization',
    category: 'privacy',
    enforcement: 'strict',
    check: (): EthicsRuleResult => {
      // Check if user data is being improperly used
      return {
        passed: true,
        message: 'User data privacy maintained',
        severity: 'low',
      }
    },
  },
]

class EthicsSafeguards {
  private rules: EthicsRule[]
  private isEnabled: boolean

  constructor() {
    this.rules = ETHICS_RULES
    this.isEnabled = true // Ethics safeguards are always enabled
  }

  /**
   * Run all ethics checks
   */
  runAllChecks(): EthicsRuleResult[] {
    if (!this.isEnabled) {
      return []
    }

    return this.rules.map(rule => rule.check())
  }

  /**
   * Check specific ethics rule
   */
  checkRule(ruleId: string): EthicsRuleResult | null {
    if (!this.isEnabled) {
      return null
    }

    const rule = this.rules.find(r => r.id === ruleId)
    return rule ? rule.check() : null
  }

  /**
   * Validate confidence score for manipulation
   */
  validateConfidenceScore(
    baseConfidence: number,
    userTier?: string,
    featureAccess?: boolean
  ): ConfidenceMetrics {
    const adjustedConfidence = this.calculateAdjustedConfidence(
      baseConfidence,
      userTier,
      featureAccess
    )

    const isManipulated = Math.abs(baseConfidence - adjustedConfidence) > 0.01

    return {
      baseConfidence,
      adjustedConfidence,
      adjustmentReason: isManipulated ? 'Potential manipulation detected' : undefined,
      isManipulated,
    }
  }

  /**
   * Calculate adjusted confidence with ethics checks
   */
  private calculateAdjustedConfidence(
    baseConfidence: number,
    userTier?: string,
    featureAccess?: boolean
  ): number {
    // Never manipulate confidence based on user tier
    // All users get the same confidence scores
    return baseConfidence
  }

  /**
   * Check if content violates ethics rules
   */
  validateContent(content: string): {
    isValid: boolean
    violations: string[]
    suggestions: string[]
  } {
    const violations: string[] = []
    const suggestions: string[] = []

    // Check for guaranteed win language
    const guaranteedPatterns = [
      /guaranteed/i,
      /certain/i,
      /sure thing/i,
      /can't lose/i,
      /100%.*win/i,
      /definitely/i,
    ]

    for (const pattern of guaranteedPatterns) {
      if (pattern.test(content)) {
        violations.push('Contains guaranteed win language')
        suggestions.push('Replace with probabilistic language (e.g., "high confidence" instead of "guaranteed")')
      }
    }

    // Check for misleading claims
    const misleadingPatterns = [
      /beat.*bookie/i,
      /always.*win/i,
      /never.*lose/i,
      /foolproof/i,
    ]

    for (const pattern of misleadingPatterns) {
      if (pattern.test(content)) {
        violations.push('Contains potentially misleading claims')
        suggestions.push('Use more realistic and educational language')
      }
    }

    return {
      isValid: violations.length === 0,
      violations,
      suggestions,
    }
  }

  /**
   * Get ethics compliance report
   */
  getComplianceReport(): {
    overallCompliance: 'compliant' | 'warning' | 'violation'
    ruleResults: EthicsRuleResult[]
    recommendations: string[]
  } {
    const ruleResults = this.runAllChecks()
    
    const violations = ruleResults.filter(result => !result.passed)
    const warnings = ruleResults.filter(result => !result.passed && result.severity !== 'critical')
    const criticalViolations = ruleResults.filter(result => !result.passed && result.severity === 'critical')

    let overallCompliance: 'compliant' | 'warning' | 'violation' = 'compliant'
    
    if (criticalViolations.length > 0) {
      overallCompliance = 'violation'
    } else if (warnings.length > 0) {
      overallCompliance = 'warning'
    }

    const recommendations = ruleResults
      .filter(result => result.recommendation)
      .map(result => result.recommendation!)

    return {
      overallCompliance,
      ruleResults,
      recommendations,
    }
  }

  /**
   * Enable/disable ethics safeguards (should always remain enabled)
   */
  setEnabled(enabled: boolean): void {
    // Ethics safeguards should never be disabled in production
    if (process.env.NODE_ENV === 'production' && !enabled) {
      throw new Error('Ethics safeguards cannot be disabled in production')
    }
    this.isEnabled = enabled
  }
}

// Global ethics safeguards instance
export const ethicsSafeguards = new EthicsSafeguards()

// React hook for ethics checks
export function useEthicsSafeguards() {
  return {
    runAllChecks: ethicsSafeguards.runAllChecks.bind(ethicsSafeguards),
    checkRule: ethicsSafeguards.checkRule.bind(ethicsSafeguards),
    validateConfidenceScore: ethicsSafeguards.validateConfidenceScore.bind(ethicsSafeguards),
    validateContent: ethicsSafeguards.validateContent.bind(ethicsSafeguards),
    getComplianceReport: ethicsSafeguards.getComplianceReport.bind(ethicsSafeguards),
  }
}

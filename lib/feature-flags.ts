/**
 * Feature Flags Configuration
 * 
 * All monetization features are disabled by default.
 * This system allows for future activation without breaking changes.
 */

export const FEATURE_FLAGS = {
  // Monetization Controls
  MONETIZATION_ENABLED: false,
  PREMIUM_FEATURES_ENABLED: false,
  
  // Premium Features (All Disabled)
  UNLIMITED_ANALYSES: false,
  ADVANCED_INSIGHTS: false,
  PREDICTION_CONFIDENCE: false,
  HISTORICAL_DATA: false,
  CUSTOM_REPORTS: false,
  API_ACCESS: false,
  PRIORITY_SUPPORT: false,
  
  // Analytics & Tracking (Internal Only)
  USAGE_ANALYTICS_ENABLED: true,
  ENGAGEMENT_TRACKING_ENABLED: true,
  
  // UI Controls
  SHOW_UPGRADE_PROMPTS: false,
  SHOW_PRICING_PAGE: false,
  SHOW_USAGE_LIMITS: false,
  
  // Future Features (Inactive)
  COLLABORATIVE_ANALYSIS: false,
  TEAM_FEATURES: false,
  ENTERPRISE_FEATURES: false,
} as const

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(feature: keyof typeof FEATURE_FLAGS): boolean {
  return FEATURE_FLAGS[feature]
}

/**
 * Get all enabled features
 */
export function getEnabledFeatures(): string[] {
  return Object.entries(FEATURE_FLAGS)
    .filter(([_, enabled]) => enabled)
    .map(([feature]) => feature)
}

/**
 * Check if monetization is active
 */
export function isMonetizationActive(): boolean {
  return FEATURE_FLAGS.MONETIZATION_ENABLED && FEATURE_FLAGS.PREMIUM_FEATURES_ENABLED
}

/**
 * Check if user can access premium features
 */
export function canAccessPremiumFeatures(): boolean {
  return isMonetizationActive() && FEATURE_FLAGS.PREMIUM_FEATURES_ENABLED
}

/**
 * Premium feature candidates - tagged for future monetization
 * These features are identified as potentially valuable for premium tiers
 */
export const PREMIUM_FEATURE_CANDIDATES = [
  'unlimited_analyses',
  'advanced_insights',
  'prediction_confidence_scores',
  'historical_performance_data',
  'custom_export_reports',
  'api_integration',
  'priority_customer_support',
  'advanced_filtering',
  'real_time_notifications',
  'collaborative_workspaces',
] as const

/**
 * Core features that must always remain free
 * These features are protected and will never be monetized
 */
export const CORE_FREE_FEATURES = [
  'basic_match_analysis',
  'booking_code_interpretation',
  'standard_insights',
  'user_authentication',
  'result_viewing',
  'basic_history',
] as const

/**
 * Feature categories for organization
 */
export const FEATURE_CATEGORIES = {
  CORE: 'core',           // Always free
  PREMIUM: 'premium',     // Future paid features
  ENTERPRISE: 'enterprise', // Future business features
  EXPERIMENTAL: 'experimental', // Testing features
} as const

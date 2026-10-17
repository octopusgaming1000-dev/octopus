/**
 * Premium Feature Tagging System
 * 
 * Internally tags features for future monetization without restricting access.
 * This helps identify which features could become premium offerings.
 */

export interface PremiumFeatureTag {
  id: string
  name: string
  description: string
  category: 'analysis' | 'insights' | 'data' | 'support' | 'integration'
  currentValue: string
  premiumValue: string
  userBenefit: string
  businessValue: 'high' | 'medium' | 'low'
  implementationComplexity: 'simple' | 'moderate' | 'complex'
  isCurrentlyFree: boolean
  futureTier?: 'PRO' | 'CREATOR' | 'ENTERPRISE'
}

/**
 * Features tagged as potential premium offerings
 * These are currently free but identified for future monetization
 */
export const PREMIUM_FEATURE_TAGS: PremiumFeatureTag[] = [
  {
    id: 'unlimited_analyses',
    name: 'Unlimited Analyses',
    description: 'Remove daily/monthly analysis limits',
    category: 'analysis',
    currentValue: '10 analyses per day, 100 per month',
    premiumValue: 'Unlimited analyses',
    userBenefit: 'Never hit usage limits, analyze as much as needed',
    businessValue: 'high',
    implementationComplexity: 'simple',
    isCurrentlyFree: true,
    futureTier: 'PRO',
  },
  
  {
    id: 'advanced_insights',
    name: 'Advanced AI Insights',
    description: 'Deeper analysis with confidence scores and risk metrics',
    category: 'insights',
    currentValue: 'Basic probability analysis',
    premiumValue: 'Advanced AI insights with confidence scores, risk metrics, and trend analysis',
    userBenefit: 'More accurate predictions with detailed reasoning',
    businessValue: 'high',
    implementationComplexity: 'moderate',
    isCurrentlyFree: true,
    futureTier: 'PRO',
  },
  
  {
    id: 'historical_data',
    name: 'Extended Historical Data',
    description: 'Access to longer history of match outcomes and predictions',
    category: 'data',
    currentValue: '7 days of historical data',
    premiumValue: '3 months to 1 year of historical data',
    userBenefit: 'Better analysis with more historical context',
    businessValue: 'medium',
    implementationComplexity: 'simple',
    isCurrentlyFree: true,
    futureTier: 'PRO',
  },
  
  {
    id: 'prediction_confidence',
    name: 'Prediction Confidence Scores',
    description: 'AI confidence levels for each prediction',
    category: 'insights',
    currentValue: 'Basic predictions without confidence',
    premiumValue: 'Confidence scores (0-100%) with reasoning',
    userBenefit: 'Know which predictions to trust more',
    businessValue: 'high',
    implementationComplexity: 'moderate',
    isCurrentlyFree: true,
    futureTier: 'PRO',
  },
  
  {
    id: 'custom_reports',
    name: 'Custom Export Reports',
    description: 'Export analysis results in various formats',
    category: 'analysis',
    currentValue: 'Basic web viewing only',
    premiumValue: 'PDF, Excel, CSV exports with custom branding',
    userBenefit: 'Share analysis with others, keep records',
    businessValue: 'medium',
    implementationComplexity: 'moderate',
    isCurrentlyFree: true,
    futureTier: 'PRO',
  },
  
  {
    id: 'api_access',
    name: 'API Integration',
    description: 'Programmatic access to analysis engine',
    category: 'integration',
    currentValue: 'No API access',
    premiumValue: 'REST API with webhooks and documentation',
    userBenefit: 'Integrate with your own tools and workflows',
    businessValue: 'high',
    implementationComplexity: 'complex',
    isCurrentlyFree: true,
    futureTier: 'CREATOR',
  },
  
  {
    id: 'collaborative_features',
    name: 'Collaborative Workspaces',
    description: 'Share and collaborate on analyses with team members',
    category: 'analysis',
    currentValue: 'Individual use only',
    premiumValue: 'Team workspaces, shared analyses, comments',
    userBenefit: 'Work together on betting strategies',
    businessValue: 'medium',
    implementationComplexity: 'complex',
    isCurrentlyFree: true,
    futureTier: 'CREATOR',
  },
  
  {
    id: 'priority_support',
    name: 'Priority Customer Support',
    description: 'Faster response times and dedicated support',
    category: 'support',
    currentValue: 'Standard email support',
    premiumValue: 'Priority queue, live chat, phone support',
    userBenefit: 'Get help faster when needed',
    businessValue: 'medium',
    implementationComplexity: 'simple',
    isCurrentlyFree: true,
    futureTier: 'PRO',
  },
  
  {
    id: 'real_time_notifications',
    name: 'Real-time Notifications',
    description: 'Instant alerts for match outcomes and analysis updates',
    category: 'insights',
    currentValue: 'No notifications',
    premiumValue: 'Push notifications, email alerts, SMS alerts',
    userBenefit: 'Stay updated on match results and analysis changes',
    businessValue: 'medium',
    implementationComplexity: 'moderate',
    isCurrentlyFree: true,
    futureTier: 'PRO',
  },
  
  {
    id: 'advanced_filtering',
    name: 'Advanced Filtering & Search',
    description: 'Powerful search and filtering of analysis history',
    category: 'data',
    currentValue: 'Basic date-based filtering',
    premiumValue: 'Advanced filters, saved searches, custom tags',
    userBenefit: 'Find relevant analyses quickly',
    businessValue: 'low',
    implementationComplexity: 'simple',
    isCurrentlyFree: true,
    futureTier: 'PRO',
  },
]

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
  'probability_ranges',
  'risk_assessment',
  'educational_explanations',
] as const

/**
 * Get premium feature by ID
 */
export function getPremiumFeatureTag(id: string): PremiumFeatureTag | undefined {
  return PREMIUM_FEATURE_TAGS.find(feature => feature.id === id)
}

/**
 * Get premium features by category
 */
export function getPremiumFeaturesByCategory(category: PremiumFeatureTag['category']): PremiumFeatureTag[] {
  return PREMIUM_FEATURE_TAGS.filter(feature => feature.category === category)
}

/**
 * Get premium features by business value
 */
export function getPremiumFeaturesByBusinessValue(value: PremiumFeatureTag['businessValue']): PremiumFeatureTag[] {
  return PREMIUM_FEATURE_TAGS.filter(feature => feature.businessValue === value)
}

/**
 * Check if a feature is tagged as premium candidate
 */
export function isPremiumFeatureCandidate(featureId: string): boolean {
  return PREMIUM_FEATURE_TAGS.some(feature => feature.id === featureId)
}

/**
 * Check if a feature is core free (never to be monetized)
 */
export function isCoreFreeFeature(featureId: string): boolean {
  return CORE_FREE_FEATURES.includes(featureId as any)
}

/**
 * Get features ready for monetization (simple implementation)
 */
export function getMonetizationReadyFeatures(): PremiumFeatureTag[] {
  return PREMIUM_FEATURE_TAGS.filter(feature => 
    feature.implementationComplexity === 'simple' && 
    feature.businessValue === 'high'
  )
}

/**
 * Tag a feature for premium consideration
 * This would be used internally when developing new features
 */
export function tagFeatureForPremium(feature: Omit<PremiumFeatureTag, 'id'>): PremiumFeatureTag {
  const id = feature.name.toLowerCase().replace(/\s+/g, '_')
  return {
    ...feature,
    id,
  }
}

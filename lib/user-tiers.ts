/**
 * User Tier System
 * 
 * Backend support for user tiers with FREE tier active.
 * All users currently function as FREE tier.
 */

export enum UserTier {
  FREE = 'FREE',
  PRO = 'PRO',         // Inactive
  CREATOR = 'CREATOR', // Inactive
  ENTERPRISE = 'ENTERPRISE', // Inactive
}

export interface TierLimits {
  analysesPerDay: number
  analysesPerMonth: number
  advancedFeatures: boolean
  historicalDataDays: number
  apiCallsPerHour: number
  supportLevel: 'basic' | 'priority' | 'dedicated'
  customReports: boolean
  collaborativeFeatures: boolean
}

export const TIER_LIMITS: Record<UserTier, TierLimits> = {
  [UserTier.FREE]: {
    analysesPerDay: 10,      // Generous free limit
    analysesPerMonth: 100,   // Very generous monthly limit
    advancedFeatures: false,
    historicalDataDays: 7,   // Week of history
    apiCallsPerHour: 10,
    supportLevel: 'basic',
    customReports: false,
    collaborativeFeatures: false,
  },
  
  [UserTier.PRO]: {
    analysesPerDay: 100,     // 10x free tier
    analysesPerMonth: 1000,  // 10x free tier
    advancedFeatures: true,
    historicalDataDays: 90,  // 3 months
    apiCallsPerHour: 100,
    supportLevel: 'priority',
    customReports: true,
    collaborativeFeatures: false,
  },
  
  [UserTier.CREATOR]: {
    analysesPerDay: 500,     // 50x free tier
    analysesPerMonth: 5000,  // 50x free tier
    advancedFeatures: true,
    historicalDataDays: 365, // Full year
    apiCallsPerHour: 500,
    supportLevel: 'priority',
    customReports: true,
    collaborativeFeatures: true,
  },
  
  [UserTier.ENTERPRISE]: {
    analysesPerDay: -1,      // Unlimited
    analysesPerMonth: -1,    // Unlimited
    advancedFeatures: true,
    historicalDataDays: -1,  // Unlimited
    apiCallsPerHour: -1,    // Unlimited
    supportLevel: 'dedicated',
    customReports: true,
    collaborativeFeatures: true,
  },
}

export interface TierBenefits {
  name: string
  description: string
  features: string[]
  recommendedFor?: string
}

export const TIER_BENEFITS: Record<UserTier, TierBenefits> = {
  [UserTier.FREE]: {
    name: 'Free',
    description: 'Perfect for getting started with betting analysis',
    features: [
      '10 analyses per day',
      '100 analyses per month',
      'Basic match insights',
      'Week of historical data',
      'Email support',
      'Standard reports',
    ],
    recommendedFor: 'Casual users, beginners',
  },
  
  [UserTier.PRO]: {
    name: 'Pro',
    description: 'For serious bettors who need more power',
    features: [
      '100 analyses per day',
      '1,000 analyses per month',
      'Advanced AI insights',
      '3 months of historical data',
      'Priority support',
      'Custom reports',
      'API access',
    ],
    recommendedFor: 'Regular bettors, analysts',
  },
  
  [UserTier.CREATOR]: {
    name: 'Creator',
    description: 'For content creators and professional analysts',
    features: [
      '500 analyses per day',
      '5,000 analyses per month',
      'Advanced AI insights',
      'Full year of historical data',
      'Priority support',
      'Custom reports',
      'API access',
      'Collaborative features',
    ],
    recommendedFor: 'Content creators, professional analysts',
  },
  
  [UserTier.ENTERPRISE]: {
    name: 'Enterprise',
    description: 'Custom solutions for teams and organizations',
    features: [
      'Unlimited analyses',
      'Advanced AI insights',
      'Unlimited historical data',
      'Dedicated support',
      'Custom reports',
      'API access',
      'Collaborative features',
      'Custom integrations',
    ],
    recommendedFor: 'Businesses, teams, organizations',
  },
}

/**
 * Get user tier (currently always FREE)
 */
export function getUserTier(userTier?: string): UserTier {
  // Currently all users are FREE tier
  // In future, this would check user.subscription.tier
  return UserTier.FREE
}

/**
 * Check if user can perform action based on tier
 */
export function canPerformAction(
  action: keyof TierLimits,
  userTier?: string,
  currentUsage?: number
): boolean {
  const tier = getUserTier(userTier)
  const limits = TIER_LIMITS[tier]
  
  const limitValue = limits[action]
  
  if (typeof limitValue === 'boolean') {
    return limitValue
  }
  
  if (limitValue === -1) {
    return true // Unlimited
  }
  
  if (currentUsage !== undefined && typeof limitValue === 'number') {
    return currentUsage < limitValue
  }
  
  return typeof limitValue === 'number' && limitValue > 0
}

/**
 * Get tier limits for user
 */
export function getTierLimits(userTier?: string): TierLimits {
  const tier = getUserTier(userTier)
  return TIER_LIMITS[tier]
}

/**
 * Check if user has access to feature
 */
export function hasFeatureAccess(
  feature: keyof TierLimits,
  userTier?: string
): boolean {
  const tier = getUserTier(userTier)
  const limits = TIER_LIMITS[tier]
  const featureValue = limits[feature]
  
  if (typeof featureValue === 'boolean') {
    return featureValue
  }
  
  return typeof featureValue === 'number' && featureValue > 0
}

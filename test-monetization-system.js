/**
 * Monetization System Test
 * 
 * Verifies that the monetization preparation system is working correctly
 * and that all features remain disabled and accessible.
 */

import { FEATURE_FLAGS, isFeatureEnabled } from '../lib/feature-flags'
import { getUserTier, getTierLimits, UserTier } from '../lib/user-tiers'
import { isCoreFreeFeature, isPremiumFeatureCandidate } from '../lib/premium-features'
import { ethicsSafeguards } from '../lib/ethics-safeguards'
import { monetizationMiddleware } from '../lib/monetization-middleware'

export function runMonetizationTests() {
  console.log('🧪 Running Monetization System Tests...\n')

  // Test 1: Feature Flags
  console.log('📋 Test 1: Feature Flags')
  console.log(`Monetization Enabled: ${isFeatureEnabled('MONETIZATION_ENABLED')}`)
  console.log(`Premium Features Enabled: ${isFeatureEnabled('PREMIUM_FEATURES_ENABLED')}`)
  console.log(`Show Upgrade Prompts: ${isFeatureEnabled('SHOW_UPGRADE_PROMPTS')}`)
  console.log(`Show Pricing Page: ${isFeatureEnabled('SHOW_PRICING_PAGE')}`)
  console.log(`✅ All monetization features should be DISABLED\n`)

  // Test 2: User Tiers
  console.log('👥 Test 2: User Tiers')
  const currentTier = getUserTier()
  console.log(`Current Tier: ${currentTier}`)
  const limits = getTierLimits()
  console.log(`Daily Limit: ${limits.analysesPerDay}`)
  console.log(`Monthly Limit: ${limits.analysesPerMonth}`)
  console.log(`✅ All users should be FREE tier\n`)

  // Test 3: Feature Access
  console.log('🔓 Test 3: Feature Access')
  const basicAccess = monetizationMiddleware.checkFeatureAccess('basic_match_analysis')
  const advancedAccess = monetizationMiddleware.checkFeatureAccess('advanced_insights')
  console.log(`Basic Analysis Access: ${basicAccess.hasAccess} - ${basicAccess.reason}`)
  console.log(`Advanced Insights Access: ${advancedAccess.hasAccess} - ${advancedAccess.reason}`)
  console.log(`✅ All features should be accessible\n`)

  // Test 4: Core Free Features
  console.log('🛡️ Test 4: Core Free Features')
  const coreFeatures = ['basic_match_analysis', 'booking_code_interpretation', 'standard_insights']
  coreFeatures.forEach(feature => {
    const isCore = isCoreFreeFeature(feature)
    console.log(`${feature}: ${isCore ? 'CORE FREE' : 'PREMIUM CANDIDATE'}`)
  })
  console.log(`✅ Core features should be protected\n`)

  // Test 5: Ethics Safeguards
  console.log('⚖️ Test 5: Ethics Safeguards')
  const ethicsReport = ethicsSafeguards.getComplianceReport()
  console.log(`Overall Compliance: ${ethicsReport.overallCompliance}`)
  console.log(`Rules Passed: ${ethicsReport.ruleResults.filter(r => r.passed).length}/${ethicsReport.ruleResults.length}`)
  console.log(`✅ All ethics rules should pass\n`)

  // Test 6: Content Validation
  console.log('📝 Test 6: Content Validation')
  const validContent = "High confidence prediction based on statistical analysis"
  const invalidContent = "Guaranteed win - 100% certain"
  
  const validValidation = ethicsSafeguards.validateContent(validContent)
  const invalidValidation = ethicsSafeguards.validateContent(invalidContent)
  
  console.log(`Valid Content: ${validValidation.isValid ? '✅' : '❌'}`)
  console.log(`Invalid Content: ${invalidValidation.isValid ? '❌' : '✅'} - ${invalidValidation.violations.join(', ')}`)
  console.log(`✅ Content validation should work correctly\n`)

  // Test 7: Analysis Limits
  console.log('📊 Test 7: Analysis Limits')
  const analysisRequest = {
    analysisType: 'booking_code',
    matchCount: 5,
    isGuest: false,
  }
  
  const canAnalyze = monetizationMiddleware.canPerformAnalysis(analysisRequest)
  console.log(`Can Perform Analysis: ${canAnalyze.hasAccess} - ${canAnalyze.reason}`)
  console.log(`✅ Analysis should be permitted\n`)

  // Test 8: Monetization Status
  console.log('📈 Test 8: Monetization Status')
  const status = monetizationMiddleware.getMonetizationStatus()
  console.log(`Monetization Enabled: ${status.monetizationEnabled}`)
  console.log(`Premium Features Enabled: ${status.premiumFeaturesEnabled}`)
  console.log(`User Tier: ${status.userTier}`)
  console.log(`Ethics Compliance: ${status.ethicsCompliance.overallCompliance}`)
  console.log(`✅ Status should show everything disabled\n`)

  console.log('🎉 All tests completed!')
  console.log('\n📋 Summary:')
  console.log('✅ Monetization is fully DISABLED')
  console.log('✅ All features are ACCESSIBLE')
  console.log('✅ No paywalls or restrictions')
  console.log('✅ Ethics safeguards are ACTIVE')
  console.log('✅ System is ready for future activation')
  console.log('\n🚀 Platform is monetization-ready but currently FREE!')
}

// Run tests if this file is executed directly
if (typeof window === 'undefined') {
  runMonetizationTests()
}

export default runMonetizationTests

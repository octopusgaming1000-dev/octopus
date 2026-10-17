/**
 * Initialize and start the fixture ingestion system
 * This can be called from the main app or a startup script
 */

import { jobScheduler } from '@/lib/job-scheduler'

/**
 * Initialize the fixture ingestion system
 */
export function initializeFixtureIngestion() {
  console.log('🚀 Initializing Fixture Ingestion System...')
  
  try {
    // Start the job scheduler
    jobScheduler.start()
    
    console.log('✅ Fixture ingestion system initialized successfully')
    console.log('📅 Daily sync job scheduled to run at 6 AM UTC')
    
    // Log initial status
    const status = jobScheduler.getStatus()
    console.log('📊 Scheduler status:', status)
    
    return true
  } catch (error) {
    console.error('❌ Failed to initialize fixture ingestion system:', error)
    return false
  }
}

/**
 * Gracefully shutdown the fixture ingestion system
 */
export function shutdownFixtureIngestion() {
  console.log('🛑 Shutting down Fixture Ingestion System...')
  
  try {
    jobScheduler.stop()
    console.log('✅ Fixture ingestion system shut down successfully')
    return true
  } catch (error) {
    console.error('❌ Failed to shutdown fixture ingestion system:', error)
    return false
  }
}

// Auto-initialize if this module is imported in a server context
if (typeof window === 'undefined') {
  // Server-side initialization
  initializeFixtureIngestion()
  
  // Graceful shutdown on process exit
  process.on('SIGINT', () => {
    shutdownFixtureIngestion()
    process.exit(0)
  })
  
  process.on('SIGTERM', () => {
    shutdownFixtureIngestion()
    process.exit(0)
  })
}

export default {
  initializeFixtureIngestion,
  shutdownFixtureIngestion
}

/**
 * API endpoint for fixture ingestion management
 */

import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/middleware'
import { fixtureIngestionManager, type NormalizedFixture } from '@/lib/fixture-ingestion'
import { jobScheduler } from '@/lib/job-scheduler'

// GET /api/fixtures - Get fixtures and ingestion status
export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const date = searchParams.get('date')

    switch (action) {
      case 'status':
        // Get ingestion system status
        const cacheStats = fixtureIngestionManager.getCacheStats()
        const schedulerStatus = jobScheduler.getStatus()
        const jobStatus = jobScheduler.getJobStatus('daily-fixture-sync')

        return NextResponse.json({
          success: true,
          data: {
            cache: cacheStats,
            scheduler: schedulerStatus,
            dailySyncJob: jobStatus,
            providers: fixtureIngestionManager.getProviders().map(p => ({
              name: p.name,
              configured: p.isConfigured()
            }))
          }
        })

      case 'fetch':
        // Fetch fixtures for a specific date
        if (!date) {
          return NextResponse.json(
            { error: 'Date parameter is required for fetch action' },
            { status: 400 }
          )
        }

        const targetDate = new Date(date)
        const fixtures = await fixtureIngestionManager.fetchFixturesForDate(targetDate)

        return NextResponse.json({
          success: true,
          data: {
            date: targetDate.toISOString().split('T')[0],
            fixtures,
            count: fixtures.length
          }
        })

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: status, fetch' },
          { status: 400 }
        )
    }

  } catch (error: any) {
    console.error('Fixtures API error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to process request' },
      { status: 500 }
    )
  }
}

// POST /api/fixtures - Trigger manual sync or other actions
export async function POST(request: NextRequest) {
  try {
    const user = await authenticateRequest(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { action, date } = body

    switch (action) {
      case 'sync':
        // Manual sync for a specific date
        if (!date) {
          return NextResponse.json(
            { error: 'Date parameter is required for sync action' },
            { status: 400 }
          )
        }

        const syncDate = new Date(date)
        const result = await fixtureIngestionManager.syncFixturesToDatabase(syncDate)

        return NextResponse.json({
          success: true,
          data: {
            date: syncDate.toISOString().split('T')[0],
            result
          }
        })

      case 'trigger-daily-sync':
        // Trigger the daily sync job manually
        const execution = await jobScheduler.triggerJob('daily-fixture-sync')

        return NextResponse.json({
          success: true,
          data: {
            execution
          }
        })

      case 'clear-cache':
        // Clear fixture cache
        fixtureIngestionManager.clearCache()

        return NextResponse.json({
          success: true,
          message: 'Cache cleared successfully'
        })

      case 'toggle-scheduler':
        // Enable/disable the scheduler
        const { enabled } = body
        if (typeof enabled !== 'boolean') {
          return NextResponse.json(
            { error: 'enabled parameter must be boolean' },
            { status: 400 }
          )
        }

        const success = jobScheduler.toggleJob('daily-fixture-sync', enabled)
        if (!success) {
          return NextResponse.json(
            { error: 'Failed to update job schedule' },
            { status: 500 }
          )
        }

        return NextResponse.json({
          success: true,
          message: `Scheduler ${enabled ? 'enabled' : 'disabled'} successfully`
        })

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: sync, trigger-daily-sync, clear-cache, toggle-scheduler' },
          { status: 400 }
        )
    }

  } catch (error: any) {
    console.error('Fixtures API error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to process request' },
      { status: 500 }
    )
  }
}

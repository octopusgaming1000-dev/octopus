/**
 * Scheduled Job System for Daily Fixture Sync
 * 
 * Handles automated fixture ingestion with configurable schedules
 */

import { fixtureIngestionManager, IngestionResult } from '@/lib/fixture-ingestion'

export interface JobSchedule {
  id: string
  name: string
  enabled: boolean
  cronExpression: string // Simple cron: "0 6 * * *" = 6 AM daily
  lastRun?: Date
  nextRun?: Date
  timezone?: string
}

export interface JobExecution {
  jobId: string
  startTime: Date
  endTime?: Date
  status: 'running' | 'completed' | 'failed'
  result?: IngestionResult
  error?: string
}

/**
 * Daily fixture sync job
 */
export class DailyFixtureSyncJob {
  static readonly JOB_ID = 'daily-fixture-sync'
  static readonly DEFAULT_SCHEDULE = '0 6 * * *' // 6 AM daily

  private executions: JobExecution[] = []
  private isRunning = false

  /**
   * Execute the daily fixture sync
   */
  async execute(): Promise<JobExecution> {
    const execution: JobExecution = {
      jobId: DailyFixtureSyncJob.JOB_ID,
      startTime: new Date(),
      status: 'running'
    }

    try {
      if (this.isRunning) {
        throw new Error('Job is already running')
      }

      this.isRunning = true
      console.log(`Starting daily fixture sync at ${execution.startTime.toISOString()}`)

      // Sync today's fixtures
      const today = new Date()
      const todayResult = await fixtureIngestionManager.syncFixturesToDatabase(today)

      // Sync tomorrow's fixtures
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      const tomorrowResult = await fixtureIngestionManager.syncFixturesToDatabase(tomorrow)

      // Sync the day after tomorrow's fixtures
      const dayAfter = new Date(today)
      dayAfter.setDate(dayAfter.getDate() + 2)
      const dayAfterResult = await fixtureIngestionManager.syncFixturesToDatabase(dayAfter)

      // Combine results
      const combinedResult: IngestionResult = {
        added: todayResult.added + tomorrowResult.added + dayAfterResult.added,
        updated: todayResult.updated + tomorrowResult.updated + dayAfterResult.updated,
        skipped: todayResult.skipped + tomorrowResult.skipped + dayAfterResult.skipped,
        errors: [
          ...todayResult.errors,
          ...tomorrowResult.errors,
          ...dayAfterResult.errors
        ]
      }

      execution.endTime = new Date()
      execution.status = 'completed'
      execution.result = combinedResult

      console.log(`Daily fixture sync completed:`, combinedResult)
      console.log(`Execution time: ${execution.endTime.getTime() - execution.startTime.getTime()}ms`)

    } catch (error) {
      execution.endTime = new Date()
      execution.status = 'failed'
      execution.error = error instanceof Error ? error.message : 'Unknown error'
      
      console.error('Daily fixture sync failed:', error)
    } finally {
      this.isRunning = false
      this.executions.push(execution)
      
      // Keep only last 10 executions
      if (this.executions.length > 10) {
        this.executions = this.executions.slice(-10)
      }
    }

    return execution
  }

  /**
   * Get job status
   */
  getStatus(): {
    isRunning: boolean
    lastExecution?: JobExecution
    executionHistory: JobExecution[]
  } {
    return {
      isRunning: this.isRunning,
      lastExecution: this.executions[this.executions.length - 1],
      executionHistory: [...this.executions]
    }
  }

  /**
   * Check if job should run now
   */
  shouldRun(schedule: JobSchedule): boolean {
    if (!schedule.enabled || this.isRunning) {
      return false
    }

    const now = new Date()
    
    // Simple check: run if it's 6 AM and hasn't run today
    if (now.getHours() === 6 && now.getMinutes() === 0) {
      const lastRun = this.executions[this.executions.length - 1]
      if (!lastRun || lastRun.startTime.toDateString() !== now.toDateString()) {
        return true
      }
    }

    return false
  }
}

/**
 * Job scheduler manager
 */
export class JobScheduler {
  private jobs: Map<string, JobSchedule> = new Map()
  private dailySyncJob = new DailyFixtureSyncJob()
  private intervalId?: NodeJS.Timeout

  constructor() {
    this.registerDefaultJobs()
  }

  /**
   * Register default jobs
   */
  private registerDefaultJobs(): void {
    this.registerJob({
      id: DailyFixtureSyncJob.JOB_ID,
      name: 'Daily Fixture Sync',
      enabled: true,
      cronExpression: DailyFixtureSyncJob.DEFAULT_SCHEDULE,
      timezone: 'UTC'
    })
  }

  /**
   * Register a new job
   */
  registerJob(schedule: JobSchedule): void {
    this.jobs.set(schedule.id, schedule)
  }

  /**
   * Get all registered jobs
   */
  getJobs(): JobSchedule[] {
    return Array.from(this.jobs.values())
  }

  /**
   * Get job by ID
   */
  getJob(id: string): JobSchedule | undefined {
    return this.jobs.get(id)
  }

  /**
   * Update job schedule
   */
  updateJob(id: string, updates: Partial<JobSchedule>): boolean {
    const job = this.jobs.get(id)
    if (!job) {
      return false
    }

    this.jobs.set(id, { ...job, ...updates })
    return true
  }

  /**
   * Enable/disable job
   */
  toggleJob(id: string, enabled: boolean): boolean {
    return this.updateJob(id, { enabled })
  }

  /**
   * Start the scheduler
   */
  start(): void {
    if (this.intervalId) {
      console.warn('Job scheduler is already running')
      return
    }

    console.log('Starting job scheduler...')
    
    // Check every minute
    this.intervalId = setInterval(() => {
      this.checkAndRunJobs()
    }, 60 * 1000)

    // Also run immediately for testing
    setTimeout(() => {
      this.checkAndRunJobs()
    }, 5000)
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = undefined
      console.log('Job scheduler stopped')
    }
  }

  /**
   * Check and run scheduled jobs
   */
  private async checkAndRunJobs(): Promise<void> {
    for (const schedule of this.jobs.values()) {
      if (schedule.id === DailyFixtureSyncJob.JOB_ID) {
        if (this.dailySyncJob.shouldRun(schedule)) {
          console.log(`Running scheduled job: ${schedule.name}`)
          await this.dailySyncJob.execute()
        }
      }
    }
  }

  /**
   * Manually trigger a job
   */
  async triggerJob(id: string): Promise<JobExecution> {
    if (id === DailyFixtureSyncJob.JOB_ID) {
      return await this.dailySyncJob.execute()
    }

    throw new Error(`Unknown job: ${id}`)
  }

  /**
   * Get job execution status
   */
  getJobStatus(id: string): any {
    if (id === DailyFixtureSyncJob.JOB_ID) {
      return this.dailySyncJob.getStatus()
    }

    throw new Error(`Unknown job: ${id}`)
  }

  /**
   * Get scheduler status
   */
  getStatus(): {
    isRunning: boolean
    jobs: JobSchedule[]
    lastCheck?: Date
  } {
    return {
      isRunning: !!this.intervalId,
      jobs: this.getJobs(),
      lastCheck: new Date() // Could track actual last check time
    }
  }
}

// Singleton instance
export const jobScheduler = new JobScheduler()

export default {
  DailyFixtureSyncJob,
  JobScheduler,
  jobScheduler
}

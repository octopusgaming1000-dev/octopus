/**
 * Provider Sync Logging Service
 * 
 * Tracks provider synchronization operations for observability and debugging.
 * Enables monitoring of data ingestion from multiple providers.
 */

import { prisma } from './prisma'

export type Provider = 'match_api' | 'fbref' | 'understat' | 'weather' | 'referee'
export type SyncType = 'daily_fixtures' | 'match_details' | 'statistics' | 'lineups' | 'events' | 'weather' | 'referee_data'
export type SyncStatus = 'running' | 'completed' | 'failed' | 'partial'

export interface SyncLog {
  id: string
  provider: Provider
  syncType: SyncType
  startedAt: Date
  completedAt: Date | null
  status: SyncStatus
  recordsFetched: number
  recordsCreated: number
  recordsUpdated: number
  recordsSkipped: number
  errorCount: number
  errorMessage: string | null
  metadata: string | null
}

export interface SyncResult {
  recordsFetched: number
  recordsCreated: number
  recordsUpdated: number
  recordsSkipped: number
  errors: string[]
}

export class ProviderSyncLogger {
  /**
   * Start a new sync operation
   */
  static async startSync(
    provider: Provider,
    syncType: SyncType,
    metadata?: Record<string, any>
  ): Promise<string> {
    try {
      const log = await prisma.providerSyncLog.create({
        data: {
          provider,
          syncType,
          status: 'running',
          metadata: metadata ? JSON.stringify(metadata) : null
        }
      })

      return log.id
    } catch (error) {
      console.error('Failed to start sync log:', error)
      throw new Error(`Failed to start sync: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Complete a sync operation with results
   */
  static async completeSync(
    logId: string,
    result: SyncResult,
    status: SyncStatus = 'completed'
  ): Promise<void> {
    try {
      await prisma.providerSyncLog.update({
        where: { id: logId },
        data: {
          status,
          completedAt: new Date(),
          recordsFetched: result.recordsFetched,
          recordsCreated: result.recordsCreated,
          recordsUpdated: result.recordsUpdated,
          recordsSkipped: result.recordsSkipped,
          errorCount: result.errors.length,
          errorMessage: result.errors.length > 0 ? result.errors.join('; ') : null
        }
      })
    } catch (error) {
      console.error('Failed to complete sync log:', error)
      throw new Error(`Failed to complete sync: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Mark a sync as failed
   */
  static async failSync(
    logId: string,
    errorMessage: string,
    result?: Partial<SyncResult>
  ): Promise<void> {
    try {
      await prisma.providerSyncLog.update({
        where: { id: logId },
        data: {
          status: 'failed',
          completedAt: new Date(),
          errorMessage,
          ...(result && {
            recordsFetched: result.recordsFetched || 0,
            recordsCreated: result.recordsCreated || 0,
            recordsUpdated: result.recordsUpdated || 0,
            recordsSkipped: result.recordsSkipped || 0,
            errorCount: result.errors?.length || (errorMessage ? 1 : 0)
          })
        }
      })
    } catch (error) {
      console.error('Failed to fail sync log:', error)
      throw new Error(`Failed to fail sync: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get sync log by ID
   */
  static async getLog(logId: string): Promise<SyncLog | null> {
    try {
      const log = await prisma.providerSyncLog.findUnique({
        where: { id: logId }
      })

      if (!log) {
        return null
      }

      return {
        ...log,
        provider: log.provider as Provider,
        syncType: log.syncType as SyncType,
        status: log.status as SyncStatus
      }
    } catch (error) {
      console.error('Failed to get sync log:', error)
      return null
    }
  }

  /**
   * Get recent sync logs for a provider
   */
  static async getRecentSyncs(
    provider: Provider,
    limit: number = 50,
    syncType?: SyncType
  ): Promise<SyncLog[]> {
    try {
      const where: any = { provider }
      if (syncType) {
        where.syncType = syncType
      }

      const logs = await prisma.providerSyncLog.findMany({
        where,
        orderBy: { startedAt: 'desc' },
        take: limit
      })

      return logs.map(log => ({
        ...log,
        provider: log.provider as Provider,
        syncType: log.syncType as SyncType,
        status: log.status as SyncStatus
      }))
    } catch (error) {
      console.error('Failed to get recent syncs:', error)
      return []
    }
  }

  /**
   * Get sync logs by status
   */
  static async getSyncsByStatus(
    status: SyncStatus,
    limit: number = 50
  ): Promise<SyncLog[]> {
    try {
      const logs = await prisma.providerSyncLog.findMany({
        where: { status },
        orderBy: { startedAt: 'desc' },
        take: limit
      })

      return logs.map(log => ({
        ...log,
        provider: log.provider as Provider,
        syncType: log.syncType as SyncType,
        status: log.status as SyncStatus
      }))
    } catch (error) {
      console.error('Failed to get syncs by status:', error)
      return []
    }
  }

  /**
   * Get running syncs
   */
  static async getRunningSyncs(): Promise<SyncLog[]> {
    return this.getSyncsByStatus('running')
  }

  /**
   * Get failed syncs
   */
  static async getFailedSyncs(limit: number = 50): Promise<SyncLog[]> {
    return this.getSyncsByStatus('failed', limit)
  }

  /**
   * Get sync statistics for a provider
   */
  static async getProviderStatistics(
    provider: Provider,
    syncType?: SyncType
  ): Promise<{
    totalSyncs: number
    successfulSyncs: number
    failedSyncs: number
    runningSyncs: number
    totalRecordsFetched: number
    totalRecordsCreated: number
    totalRecordsUpdated: number
    totalRecordsSkipped: number
    averageDuration: number | null
    lastSyncAt: Date | null
    lastSyncStatus: SyncStatus | null
  }> {
    try {
      const where: any = { provider }
      if (syncType) {
        where.syncType = syncType
      }

      const logs = await prisma.providerSyncLog.findMany({
        where,
        orderBy: { startedAt: 'desc' }
      })

      const totalSyncs = logs.length
      const successfulSyncs = logs.filter(l => l.status === 'completed').length
      const failedSyncs = logs.filter(l => l.status === 'failed').length
      const runningSyncs = logs.filter(l => l.status === 'running').length

      const totalRecordsFetched = logs.reduce((sum, l) => sum + l.recordsFetched, 0)
      const totalRecordsCreated = logs.reduce((sum, l) => sum + l.recordsCreated, 0)
      const totalRecordsUpdated = logs.reduce((sum, l) => sum + l.recordsUpdated, 0)
      const totalRecordsSkipped = logs.reduce((sum, l) => sum + l.recordsSkipped, 0)

      // Calculate average duration for completed syncs
      const completedLogs = logs.filter(l => l.status === 'completed' && l.completedAt)
      const averageDuration = completedLogs.length > 0
        ? completedLogs.reduce((sum, l) => {
            const duration = l.completedAt!.getTime() - l.startedAt.getTime()
            return sum + duration
          }, 0) / completedLogs.length
        : null

      const lastSync = logs[0] || null

      return {
        totalSyncs,
        successfulSyncs,
        failedSyncs,
        runningSyncs,
        totalRecordsFetched,
        totalRecordsCreated,
        totalRecordsUpdated,
        totalRecordsSkipped,
        averageDuration: averageDuration ? Math.round(averageDuration / 1000) : null, // Convert to seconds
        lastSyncAt: lastSync?.startedAt || null,
        lastSyncStatus: lastSync?.status as SyncStatus || null
      }
    } catch (error) {
      console.error('Failed to get provider statistics:', error)
      return {
        totalSyncs: 0,
        successfulSyncs: 0,
        failedSyncs: 0,
        runningSyncs: 0,
        totalRecordsFetched: 0,
        totalRecordsCreated: 0,
        totalRecordsUpdated: 0,
        totalRecordsSkipped: 0,
        averageDuration: null,
        lastSyncAt: null,
        lastSyncStatus: null
      }
    }
  }

  /**
   * Get overall sync statistics across all providers
   */
  static async getOverallStatistics(): Promise<{
    byProvider: Record<Provider, ReturnType<typeof ProviderSyncLogger['getProviderStatistics']>>
    totalSyncs: number
    totalRecordsFetched: number
    totalRecordsCreated: number
  }> {
    const providers: Provider[] = ['match_api', 'fbref', 'understat', 'weather', 'referee']

    const byProvider: any = {}
    let totalSyncs = 0
    let totalRecordsFetched = 0
    let totalRecordsCreated = 0

    for (const provider of providers) {
      const stats = await this.getProviderStatistics(provider)
      byProvider[provider] = stats
      totalSyncs += stats.totalSyncs
      totalRecordsFetched += stats.totalRecordsFetched
      totalRecordsCreated += stats.totalRecordsCreated
    }

    return {
      byProvider,
      totalSyncs,
      totalRecordsFetched,
      totalRecordsCreated
    }
  }

  /**
   * Clean up old sync logs
   */
  static async cleanup(
    olderThanDays: number = 30,
    provider?: Provider
  ): Promise<{ deleted: number }> {
    try {
      const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000)

      const where: any = {
        startedAt: {
          lt: cutoffDate
        },
        status: {
          in: ['completed', 'failed', 'partial']
        }
      }

      if (provider) {
        where.provider = provider
      }

      const result = await prisma.providerSyncLog.deleteMany({
        where
      })

      return { deleted: result.count }
    } catch (error) {
      console.error('Failed to cleanup sync logs:', error)
      return { deleted: 0 }
    }
  }

  /**
   * Update sync metadata
   */
  static async updateMetadata(
    logId: string,
    metadata: Record<string, any>
  ): Promise<void> {
    try {
      await prisma.providerSyncLog.update({
        where: { id: logId },
        data: {
          metadata: JSON.stringify(metadata)
        }
      })
    } catch (error) {
      console.error('Failed to update sync metadata:', error)
    }
  }

  /**
   * Increment error count for a running sync
   */
  static async incrementErrorCount(
    logId: string,
    errorMessage: string
  ): Promise<void> {
    try {
      const log = await prisma.providerSyncLog.findUnique({
        where: { id: logId }
      })

      if (!log) {
        return
      }

      const currentErrors = log.errorMessage ? log.errorMessage.split(';').length : 0
      const updatedErrorMessage = log.errorMessage 
        ? `${log.errorMessage}; ${errorMessage}`
        : errorMessage

      await prisma.providerSyncLog.update({
        where: { id: logId },
        data: {
          errorCount: currentErrors + 1,
          errorMessage: updatedErrorMessage
        }
      })
    } catch (error) {
      console.error('Failed to increment error count:', error)
    }
  }
}

export default ProviderSyncLogger

/**
 * Raw Data Storage Service
 * 
 * Stores original provider responses for debugging, auditing, and replay.
 * This enables troubleshooting and data quality analysis.
 */

import { prisma } from './prisma'
import { createHash } from 'crypto'

export type Provider = 'match_api' | 'fbref' | 'understat' | 'weather' | 'referee'

export interface RawDataRecord {
  id: string
  provider: Provider
  endpoint: string
  externalId: string | null
  payloadJson: string
  fetchedAt: Date
  contentHash: string
  status: 'success' | 'error'
  errorMessage: string | null
}

export interface StoreResult {
  id: string
  isDuplicate: boolean
}

export class RawDataStorageService {
  /**
   * Helper to cast Prisma record to RawDataRecord
   */
  private static castToRawDataRecord(record: any): RawDataRecord {
    return {
      ...record,
      provider: record.provider as Provider,
      status: record.status as 'success' | 'error'
    }
  }

  /**
   * Store a raw provider response
   */
  static async store(
    provider: Provider,
    endpoint: string,
    payload: any,
    externalId?: string,
    status: 'success' | 'error' = 'success',
    errorMessage?: string
  ): Promise<StoreResult> {
    try {
      const payloadJson = JSON.stringify(payload)
      const contentHash = this.computeHash(payloadJson)

      // Check for duplicate by hash (same content)
      const existing = await prisma.providerRawData.findFirst({
        where: {
          provider,
          endpoint,
          contentHash,
          fetchedAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        }
      })

      if (existing) {
        return {
          id: existing.id,
          isDuplicate: true
        }
      }

      // Create new record
      const record = await prisma.providerRawData.create({
        data: {
          provider,
          endpoint,
          externalId: externalId || null,
          payloadJson,
          contentHash,
          status,
          errorMessage: errorMessage || null
        }
      })

      return {
        id: record.id,
        isDuplicate: false
      }
    } catch (error) {
      console.error('Failed to store raw data:', error)
      throw new Error(`Raw data storage error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Retrieve raw data by ID
   */
  static async retrieve(id: string): Promise<RawDataRecord | null> {
    try {
      const record = await prisma.providerRawData.findUnique({
        where: { id }
      })

      if (!record) {
        return null
      }

      return this.castToRawDataRecord(record)
    } catch (error) {
      console.error('Failed to retrieve raw data:', error)
      return null
    }
  }

  /**
   * Retrieve raw data by provider and external ID
   */
  static async retrieveByExternalId(
    provider: Provider,
    externalId: string,
    endpoint?: string
  ): Promise<RawDataRecord | null> {
    try {
      const where: any = {
        provider,
        externalId
      }

      if (endpoint) {
        where.endpoint = endpoint
      }

      const record = await prisma.providerRawData.findFirst({
        where,
        orderBy: { fetchedAt: 'desc' }
      })

      return record ? this.castToRawDataRecord(record) : null
    } catch (error) {
      console.error('Failed to retrieve raw data by external ID:', error)
      return null
    }
  }

  /**
   * Get recent raw data for a provider
   */
  static async getRecent(
    provider: Provider,
    limit: number = 50,
    offset: number = 0
  ): Promise<RawDataRecord[]> {
    try {
      const records = await prisma.providerRawData.findMany({
        where: { provider },
        orderBy: { fetchedAt: 'desc' },
        take: limit,
        skip: offset
      })
      return records.map(r => this.castToRawDataRecord(r))
    } catch (error) {
      console.error('Failed to get recent raw data:', error)
      return []
    }
  }

  /**
   * Get raw data for a specific endpoint
   */
  static async getByEndpoint(
    provider: Provider,
    endpoint: string,
    limit: number = 50
  ): Promise<RawDataRecord[]> {
    try {
      const records = await prisma.providerRawData.findMany({
        where: {
          provider,
          endpoint
        },
        orderBy: { fetchedAt: 'desc' },
        take: limit
      })
      return records.map(r => this.castToRawDataRecord(r))
    } catch (error) {
      console.error('Failed to get raw data by endpoint:', error)
      return []
    }
  }

  /**
   * Get failed requests for a provider
   */
  static async getFailed(
    provider: Provider,
    limit: number = 50
  ): Promise<RawDataRecord[]> {
    try {
      const records = await prisma.providerRawData.findMany({
        where: {
          provider,
          status: 'error'
        },
        orderBy: { fetchedAt: 'desc' },
        take: limit
      })
      return records.map(r => this.castToRawDataRecord(r))
    } catch (error) {
      console.error('Failed to get failed requests:', error)
      return []
    }
  }

  /**
   * Delete old raw data (cleanup)
   */
  static async cleanup(
    olderThanDays: number = 30,
    provider?: Provider
  ): Promise<{ deleted: number }> {
    try {
      const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000)

      const where: any = {
        fetchedAt: {
          lt: cutoffDate
        }
      }

      if (provider) {
        where.provider = provider
      }

      const result = await prisma.providerRawData.deleteMany({
        where
      })

      return { deleted: result.count }
    } catch (error) {
      console.error('Failed to cleanup raw data:', error)
      return { deleted: 0 }
    }
  }

  /**
   * Get storage statistics
   */
  static async getStatistics(provider?: Provider): Promise<{
    totalRecords: number
    successCount: number
    errorCount: number
    oldestRecord: Date | null
    newestRecord: Date | null
    byEndpoint: Record<string, number>
  }> {
    try {
      const where = provider ? { provider } : {}

      const [totalRecords, successCount, errorCount, oldest, newest] = await Promise.all([
        prisma.providerRawData.count({ where }),
        prisma.providerRawData.count({ where: { ...where, status: 'success' } }),
        prisma.providerRawData.count({ where: { ...where, status: 'error' } }),
        prisma.providerRawData.findFirst({
          where,
          orderBy: { fetchedAt: 'asc' },
          select: { fetchedAt: true }
        }),
        prisma.providerRawData.findFirst({
          where,
          orderBy: { fetchedAt: 'desc' },
          select: { fetchedAt: true }
        })
      ])

      // Get counts by endpoint
      const byEndpointResult = await prisma.providerRawData.groupBy({
        by: ['endpoint'],
        where,
        _count: true
      })

      const byEndpoint: Record<string, number> = {}
      for (const item of byEndpointResult) {
        byEndpoint[item.endpoint] = item._count
      }

      return {
        totalRecords,
        successCount,
        errorCount,
        oldestRecord: oldest?.fetchedAt || null,
        newestRecord: newest?.fetchedAt || null,
        byEndpoint
      }
    } catch (error) {
      console.error('Failed to get raw data statistics:', error)
      return {
        totalRecords: 0,
        successCount: 0,
        errorCount: 0,
        oldestRecord: null,
        newestRecord: null,
        byEndpoint: {}
      }
    }
  }

  /**
   * Compute hash for content deduplication
   */
  private static computeHash(content: string): string {
    return createHash('sha256').update(content).digest('hex')
  }

  /**
   * Replay a stored request (for debugging/testing)
   */
  static async replay(id: string): Promise<any | null> {
    try {
      const record = await this.retrieve(id)
      if (!record) {
        return null
      }

      return JSON.parse(record.payloadJson)
    } catch (error) {
      console.error('Failed to replay raw data:', error)
      return null
    }
  }

  /**
   * Export raw data (for backup/analysis)
   */
  static async export(
    provider: Provider,
    startDate?: Date,
    endDate?: Date
  ): Promise<Array<{ id: string; provider: string; endpoint: string; payload: any }>> {
    try {
      const where: any = { provider }

      if (startDate || endDate) {
        where.fetchedAt = {}
        if (startDate) {
          where.fetchedAt.gte = startDate
        }
        if (endDate) {
          where.fetchedAt.lte = endDate
        }
      }

      const records = await prisma.providerRawData.findMany({
        where,
        orderBy: { fetchedAt: 'asc' }
      })

      return records.map(record => ({
        id: record.id,
        provider: record.provider,
        endpoint: record.endpoint,
        payload: JSON.parse(record.payloadJson)
      }))
    } catch (error) {
      console.error('Failed to export raw data:', error)
      return []
    }
  }
}

export default RawDataStorageService

/**
 * Provider Mapping Service
 * 
 * Manages mappings between provider IDs and canonical Octopus entity IDs.
 * This enables normalization across multiple data providers.
 */

import { prisma } from './prisma'

export type EntityType = 'team' | 'player' | 'competition' | 'match' | 'referee' | 'venue'
export type Provider = 'match_api' | 'fbref' | 'understat' | 'weather' | 'referee'

export interface ProviderMapping {
  id: string
  entityType: EntityType
  octopusEntityId: string
  provider: Provider
  providerEntityId: string
  providerName?: string
  createdAt: Date
  updatedAt: Date
}

export interface MappingResult {
  octopusEntityId: string | null
  isNewMapping: boolean
}

export class ProviderMappingService {
  /**
   * Helper to cast Prisma record to ProviderMapping
   */
  private static castToProviderMapping(record: any): ProviderMapping {
    return {
      ...record,
      entityType: record.entityType as EntityType,
      provider: record.provider as Provider
    }
  }

  /**
   * Get or create a mapping for a provider entity
   */
  static async getOrCreateMapping(
    entityType: EntityType,
    provider: Provider,
    providerEntityId: string,
    providerName?: string
  ): Promise<MappingResult> {
    try {
      // Try to find existing mapping
      const existing = await prisma.providerMapping.findUnique({
        where: {
          entityType_provider_providerEntityId: {
            entityType,
            provider,
            providerEntityId
          }
        }
      })

      if (existing) {
        // Update provider name if provided and different
        if (providerName && providerName !== existing.providerName) {
          await prisma.providerMapping.update({
            where: { id: existing.id },
            data: { providerName }
          })
        }

        return {
          octopusEntityId: existing.octopusEntityId,
          isNewMapping: false
        }
      }

      // Create new mapping with a new Octopus entity ID
      const octopusEntityId = this.generateOctopusEntityId(entityType, provider, providerEntityId)

      const mapping = await prisma.providerMapping.create({
        data: {
          entityType,
          octopusEntityId,
          provider,
          providerEntityId,
          providerName
        }
      })

      return {
        octopusEntityId: mapping.octopusEntityId,
        isNewMapping: true
      }
    } catch (error) {
      console.error('Failed to get or create mapping:', error)
      throw new Error(`Mapping service error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get Octopus entity ID from provider entity ID
   */
  static async getOctopusId(
    entityType: EntityType,
    provider: Provider,
    providerEntityId: string
  ): Promise<string | null> {
    try {
      const mapping = await prisma.providerMapping.findUnique({
        where: {
          entityType_provider_providerEntityId: {
            entityType,
            provider,
            providerEntityId
          }
        }
      })

      return mapping?.octopusEntityId || null
    } catch (error) {
      console.error('Failed to get Octopus ID:', error)
      return null
    }
  }

  /**
   * Get all provider IDs for an Octopus entity
   */
  static async getProviderIds(
    octopusEntityId: string,
    entityType?: EntityType
  ): Promise<ProviderMapping[]> {
    try {
      const where: any = { octopusEntityId }
      if (entityType) {
        where.entityType = entityType
      }

      const records = await prisma.providerMapping.findMany({
        where,
        orderBy: [{ provider: 'asc' }]
      })
      return records.map(r => this.castToProviderMapping(r))
    } catch (error) {
      console.error('Failed to get provider IDs:', error)
      return []
    }
  }

  /**
   * Get all mappings for a specific provider
   */
  static async getProviderMappings(
    provider: Provider,
    entityType?: EntityType
  ): Promise<ProviderMapping[]> {
    try {
      const where: any = { provider }
      if (entityType) {
        where.entityType = entityType
      }

      const records = await prisma.providerMapping.findMany({
        where,
        orderBy: [{ entityType: 'asc' }, { providerName: 'asc' }]
      })
      return records.map(r => this.castToProviderMapping(r))
    } catch (error) {
      console.error('Failed to get provider mappings:', error)
      return []
    }
  }

  /**
   * Manually create a mapping (for admin use or data migration)
   */
  static async createMapping(
    entityType: EntityType,
    octopusEntityId: string,
    provider: Provider,
    providerEntityId: string,
    providerName?: string
  ): Promise<ProviderMapping> {
    try {
      const record = await prisma.providerMapping.create({
        data: {
          entityType,
          octopusEntityId,
          provider,
          providerEntityId,
          providerName
        }
      })
      return this.castToProviderMapping(record)
    } catch (error) {
      console.error('Failed to create mapping:', error)
      throw new Error(`Failed to create mapping: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Update a mapping
   */
  static async updateMapping(
    id: string,
    updates: Partial<{
      octopusEntityId: string
      providerName: string
    }>
  ): Promise<ProviderMapping> {
    try {
      const record = await prisma.providerMapping.update({
        where: { id },
        data: updates
      })
      return this.castToProviderMapping(record)
    } catch (error) {
      console.error('Failed to update mapping:', error)
      throw new Error(`Failed to update mapping: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Delete a mapping
   */
  static async deleteMapping(id: string): Promise<void> {
    try {
      await prisma.providerMapping.delete({
        where: { id }
      })
    } catch (error) {
      console.error('Failed to delete mapping:', error)
      throw new Error(`Failed to delete mapping: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Generate a consistent Octopus entity ID
   * In production, this might use a different strategy
   */
  private static generateOctopusEntityId(
    entityType: EntityType,
    provider: Provider,
    providerEntityId: string
  ): string {
    // Simple hash-based generation for consistency
    const hash = this.simpleHash(`${entityType}:${provider}:${providerEntityId}`)
    return `${entityType}_${hash.substring(0, 12)}`
  }

  /**
   * Simple hash function for ID generation
   */
  private static simpleHash(str: string): string {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16)
  }

  /**
   * Bulk create mappings (useful for initial data import)
   */
  static async bulkCreateMappings(
    mappings: Array<{
      entityType: EntityType
      octopusEntityId: string
      provider: Provider
      providerEntityId: string
      providerName?: string
    }>
  ): Promise<{ created: number; errors: number }> {
    let created = 0
    let errors = 0

    for (const mapping of mappings) {
      try {
        await prisma.providerMapping.create({
          data: mapping
        })
        created++
      } catch (error) {
        console.error('Failed to create bulk mapping:', error)
        errors++
      }
    }

    return { created, errors }
  }

  /**
   * Get mapping statistics
   */
  static async getStatistics(): Promise<{
    totalMappings: number
    byEntityType: Record<EntityType, number>
    byProvider: Record<Provider, number>
  }> {
    try {
      const totalMappings = await prisma.providerMapping.count()

      const byEntityType: Record<EntityType, number> = {
        team: 0,
        player: 0,
        competition: 0,
        match: 0,
        referee: 0,
        venue: 0
      }

      const byProvider: Record<Provider, number> = {
        match_api: 0,
        fbref: 0,
        understat: 0,
        weather: 0,
        referee: 0
      }

      // Get counts by entity type
      for (const type of Object.keys(byEntityType) as EntityType[]) {
        byEntityType[type] = await prisma.providerMapping.count({
          where: { entityType: type }
        })
      }

      // Get counts by provider
      for (const provider of Object.keys(byProvider) as Provider[]) {
        byProvider[provider] = await prisma.providerMapping.count({
          where: { provider }
        })
      }

      return { totalMappings, byEntityType, byProvider }
    } catch (error) {
      console.error('Failed to get mapping statistics:', error)
      return {
        totalMappings: 0,
        byEntityType: {
          team: 0,
          player: 0,
          competition: 0,
          match: 0,
          referee: 0,
          venue: 0
        },
        byProvider: {
          match_api: 0,
          fbref: 0,
          understat: 0,
          weather: 0,
          referee: 0
        }
      }
    }
  }
}

export default ProviderMappingService

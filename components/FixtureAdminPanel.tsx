/**
 * Admin Panel Component for Fixture Ingestion Management
 */

'use client'

import { useState, useEffect } from 'react'
import { authenticateRequest } from '@/lib/middleware'

interface FixtureStatus {
  cache: {
    size: number
    entries: Array<{ key: string; age: number }>
  }
  scheduler: {
    isRunning: boolean
    jobs: Array<{
      id: string
      name: string
      enabled: boolean
      lastRun?: string
      nextRun?: string
    }>
  }
  dailySyncJob: {
    isRunning: boolean
    lastExecution?: {
      startTime: string
      endTime?: string
      status: string
      result?: {
        added: number
        updated: number
        skipped: number
        errors: string[]
      }
      error?: string
    }
    executionHistory: any[]
  }
  providers: Array<{
    name: string
    configured: boolean
  }>
}

export default function FixtureAdminPanel() {
  const [status, setStatus] = useState<FixtureStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    fetchStatus()
  }, [])

  const fetchStatus = async () => {
    try {
      setLoading(true)
      setError(null)

      const token = localStorage.getItem('auth_token')
      const response = await fetch('/api/fixtures?action=status', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch status')
      }

      const data = await response.json()
      setStatus(data.data)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const triggerDailySync = async () => {
    try {
      setActionLoading('daily-sync')
      setError(null)

      const token = localStorage.getItem('auth_token')
      const response = await fetch('/api/fixtures', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'trigger-daily-sync' })
      })

      if (!response.ok) {
        throw new Error('Failed to trigger daily sync')
      }

      const data = await response.json()
      console.log('Daily sync triggered:', data)
      
      // Refresh status after a delay
      setTimeout(() => {
        fetchStatus()
      }, 2000)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unknown error')
    } finally {
      setActionLoading(null)
    }
  }

  const clearCache = async () => {
    try {
      setActionLoading('clear-cache')
      setError(null)

      const token = localStorage.getItem('auth_token')
      const response = await fetch('/api/fixtures', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'clear-cache' })
      })

      if (!response.ok) {
        throw new Error('Failed to clear cache')
      }

      const data = await response.json()
      console.log('Cache cleared:', data)
      
      // Refresh status
      fetchStatus()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unknown error')
    } finally {
      setActionLoading(null)
    }
  }

  const toggleScheduler = async (enabled: boolean) => {
    try {
      setActionLoading('toggle-scheduler')
      setError(null)

      const token = localStorage.getItem('auth_token')
      const response = await fetch('/api/fixtures', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'toggle-scheduler', enabled })
      })

      if (!response.ok) {
        throw new Error('Failed to toggle scheduler')
      }

      const data = await response.json()
      console.log('Scheduler toggled:', data)
      
      // Refresh status
      fetchStatus()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unknown error')
    } finally {
      setActionLoading(null)
    }
  }

  const syncToday = async () => {
    try {
      setActionLoading('sync-today')
      setError(null)

      const token = localStorage.getItem('auth_token')
      const today = new Date().toISOString().split('T')[0]
      
      const response = await fetch('/api/fixtures', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'sync', date: today })
      })

      if (!response.ok) {
        throw new Error('Failed to sync today')
      }

      const data = await response.json()
      console.log('Today sync result:', data)
      
      // Refresh status
      fetchStatus()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unknown error')
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-4"></div>
          <div className="h-4 bg-gray-200 rounded mb-2"></div>
          <div className="h-4 bg-gray-200 rounded mb-2"></div>
          <div className="h-4 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-semibold mb-2">Error</h3>
          <p className="text-red-600">{error}</p>
          <button
            onClick={fetchStatus}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!status) {
    return null
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Fixture Ingestion Management</h2>
        
        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <button
            onClick={triggerDailySync}
            disabled={actionLoading === 'daily-sync' || status.dailySyncJob.isRunning}
            className="button-primary disabled:opacity-50"
          >
            {actionLoading === 'daily-sync' || status.dailySyncJob.isRunning 
              ? 'Running...' 
              : 'Trigger Daily Sync'
            }
          </button>
          
          <button
            onClick={syncToday}
            disabled={actionLoading === 'sync-today'}
            className="button-secondary disabled:opacity-50"
          >
            {actionLoading === 'sync-today' ? 'Syncing...' : 'Sync Today'}
          </button>
          
          <button
            onClick={clearCache}
            disabled={actionLoading === 'clear-cache'}
            className="button-secondary disabled:opacity-50"
          >
            {actionLoading === 'clear-cache' ? 'Clearing...' : 'Clear Cache'}
          </button>
          
          <button
            onClick={() => toggleScheduler(!status.scheduler.isRunning)}
            disabled={actionLoading === 'toggle-scheduler'}
            className={`${
              status.scheduler.isRunning 
                ? 'bg-red-600 hover:bg-red-700' 
                : 'bg-green-600 hover:bg-green-700'
            } text-white px-4 py-2 rounded disabled:opacity-50`}
          >
            {actionLoading === 'toggle-scheduler' 
              ? 'Toggling...' 
              : status.scheduler.isRunning 
                ? 'Stop Scheduler' 
                : 'Start Scheduler'
            }
          </button>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Scheduler Status */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Scheduler Status</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <span className={`font-medium ${
                  status.scheduler.isRunning ? 'text-green-600' : 'text-red-600'
                }`}>
                  {status.scheduler.isRunning ? 'Running' : 'Stopped'}
                </span>
              </div>
              
              {status.scheduler.jobs.map(job => (
                <div key={job.id} className="border-t pt-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">{job.name}:</span>
                    <span className={`font-medium ${
                      job.enabled ? 'text-green-600' : 'text-gray-400'
                    }`}>
                      {job.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Last Execution */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Last Execution</h3>
            {status.dailySyncJob.lastExecution ? (
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className={`font-medium ${
                    status.dailySyncJob.lastExecution.status === 'completed' ? 'text-green-600' :
                    status.dailySyncJob.lastExecution.status === 'failed' ? 'text-red-600' :
                    'text-blue-600'
                  }`}>
                    {status.dailySyncJob.lastExecution.status}
                  </span>
                </div>
                
                {status.dailySyncJob.lastExecution.result && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Added:</span>
                      <span className="font-medium">{status.dailySyncJob.lastExecution.result.added}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Updated:</span>
                      <span className="font-medium">{status.dailySyncJob.lastExecution.result.updated}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Skipped:</span>
                      <span className="font-medium">{status.dailySyncJob.lastExecution.result.skipped}</span>
                    </div>
                    {status.dailySyncJob.lastExecution.result.errors.length > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Errors:</span>
                        <span className="font-medium text-red-600">
                          {status.dailySyncJob.lastExecution.result.errors.length}
                        </span>
                      </div>
                    )}
                  </>
                )}
                
                <div className="text-sm text-gray-500">
                  Started: {new Date(status.dailySyncJob.lastExecution.startTime).toLocaleString()}
                </div>
              </div>
            ) : (
              <p className="text-gray-500">No executions yet</p>
            )}
          </div>

          {/* Cache & Providers */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">System Info</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Cache Size:</span>
                <span className="font-medium">{status.cache.size}</span>
              </div>
              
              <div className="border-t pt-3">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Providers:</h4>
                {status.providers.map(provider => (
                  <div key={provider.name} className="flex justify-between text-sm">
                    <span className="text-gray-600">{provider.name}:</span>
                    <span className={`font-medium ${
                      provider.configured ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {provider.configured ? 'Configured' : 'Not Configured'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Execution History */}
        {status.dailySyncJob.executionHistory.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Execution History</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Start Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Added
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Updated
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Errors
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {status.dailySyncJob.executionHistory.slice(-10).reverse().map((execution, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(execution.startTime).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          execution.status === 'completed' ? 'bg-green-100 text-green-800' :
                          execution.status === 'failed' ? 'bg-red-100 text-red-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {execution.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {execution.result?.added || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {execution.result?.updated || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {execution.result?.errors.length || 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

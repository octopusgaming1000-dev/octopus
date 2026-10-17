import { NextResponse } from 'next/server'
import { checkDatabaseHealth } from '@/lib/database'
import { checkRedisHealth } from '@/lib/redis'
import { getSocketIO } from '@/lib/websocket'

export async function GET() {
  const startTime = Date.now()
  
  try {
    // Check all services
    const [dbHealth, redisHealth] = await Promise.all([
      checkDatabaseHealth(),
      checkRedisHealth()
    ])

    // Check WebSocket status
    let wsHealth: { status: string; connectedClients?: number; rooms?: number; error?: string } = { status: 'unknown' }
    try {
      const io = getSocketIO()
      wsHealth = { 
        status: 'healthy',
        connectedClients: io.engine.clientsCount,
        rooms: Object.keys(io.sockets.adapter.rooms).length
      }
    } catch (error) {
      wsHealth = { status: 'unhealthy', error: 'WebSocket not initialized' }
    }

    const responseTime = Date.now() - startTime
    const overallStatus = dbHealth.status === 'healthy' && 
                          redisHealth.status === 'healthy' && 
                          wsHealth.status === 'healthy' ? 'healthy' : 'degraded'

    return NextResponse.json({
      status: overallStatus,
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      services: {
        database: dbHealth,
        redis: redisHealth,
        websocket: wsHealth
      },
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    }, {
      status: overallStatus === 'healthy' ? 200 : 503
    })

  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      responseTime: `${Date.now() - startTime}ms`
    }, { status: 503 })
  }
}

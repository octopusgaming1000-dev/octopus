#!/usr/bin/env node

/**
 * AI Settlement Worker Cron Job
 * 
 * This script runs the AI settlement worker to evaluate predictions
 * after matches finish and update calibration factors.
 * 
 * Run this every 15-30 minutes via cron:
 * */15 * * * * /path/to/node /path/to/ai-settlement-cron.js
 */

const { exec } = require('child_process')
const fs = require('fs')
const path = require('path')

// Log file for debugging
const logFile = path.join(__dirname, 'logs', 'ai-settlement.log')

// Ensure logs directory exists
const logsDir = path.join(__dirname, 'logs')
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true })
}

function log(message) {
  const timestamp = new Date().toISOString()
  const logMessage = `[${timestamp}] ${message}\n`
  console.log(message)
  fs.appendFileSync(logFile, logMessage)
}

async function runSettlementWorker() {
  try {
    log('Starting AI settlement worker cron job...')
    
    // Set environment variables
    const env = {
      ...process.env,
      NODE_ENV: 'production',
      INTERNAL_API_KEY: process.env.INTERNAL_API_KEY || 'your-secret-key',
    }

    // Call the settlement API endpoint
    const response = await fetch('http://localhost:3000/api/internal/ai-settlement', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.INTERNAL_API_KEY}`,
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const result = await response.json()
    log(`Settlement worker completed: ${JSON.stringify(result)}`)
    
  } catch (error) {
    log(`Settlement worker failed: ${error.message}`)
    
    // Optionally send error notification
    if (process.env.ERROR_WEBHOOK) {
      try {
        await fetch(process.env.ERROR_WEBHOOK, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `AI Settlement Worker Failed: ${error.message}`,
            timestamp: new Date().toISOString(),
          }),
        })
      } catch (webhookError) {
        log(`Failed to send error webhook: ${webhookError.message}`)
      }
    }
    
    process.exit(1)
  }
}

// Run the settlement worker
runSettlementWorker().then(() => {
  log('AI settlement worker cron job completed successfully')
  process.exit(0)
}).catch((error) => {
  log(`Fatal error in settlement worker: ${error.message}`)
  process.exit(1)
})

import { NextApiRequest, NextApiResponse } from 'next'
import { initializeSocketIO } from '@/lib/websocket'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!res.socket) {
    res.status(500).json({ error: 'Socket not available' })
    return
  }

  const socket = res.socket as any
  if (socket.server.io) {
    console.log('Socket.IO already running')
  } else {
    console.log('Setting up Socket.IO server...')
    initializeSocketIO(req, res)
  }
  res.end()
}

export const config = {
  api: {
    bodyParser: false
  }
}

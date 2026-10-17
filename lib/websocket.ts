import { Server as SocketIOServer, Socket } from 'socket.io'
import { NextApiRequest, NextApiResponse } from 'next'
import { authenticateRequest } from './middleware'
import { CacheService, CACHE_TTL } from './redis'

interface AuthenticatedSocket extends Socket {
  userId: string
  userName: string
  currentRoom?: string
}

let io: SocketIOServer | null = null

export function getSocketIO(): SocketIOServer {
  if (!io) {
    throw new Error('Socket.IO not initialized')
  }
  return io
}

export function initializeSocketIO(req: NextApiRequest, res: NextApiResponse) {
  if (!io) {
    console.log('Initializing Socket.IO server...')
    
    if (!res.socket) {
      throw new Error('Socket not available')
    }
    
    const socket = res.socket as any
    if (!socket.server) {
      throw new Error('Server not available')
    }
    
    io = new SocketIOServer(socket.server, {
      path: '/api/socket',
      addTrailingSlash: false,
      transports: ['websocket', 'polling'],
      cors: {
        origin: process.env.NODE_ENV === 'production' 
          ? process.env.ALLOWED_ORIGINS?.split(',') 
          : ['http://localhost:3000'],
        methods: ['GET', 'POST']
      }
    })

    // Authentication middleware
    io.use(async (socket: any, next) => {
      try {
        const token = socket.handshake.auth.token
        if (!token) {
          return next(new Error('Authentication token required'))
        }

        // Create a mock request for authentication
        const mockReq = {
          headers: {
            authorization: `Bearer ${token}`
          }
        } as any

        const user = await authenticateRequest(mockReq)
        if (!user) {
          return next(new Error('Invalid authentication token'))
        }

        socket.userId = user.id
        socket.userName = user.name || user.email
        next()
      } catch (error) {
        next(new Error('Authentication failed'))
      }
    })

    // Handle connections
    io.on('connection', (socket: AuthenticatedSocket) => {
      console.log(`User ${socket.userName} connected (${socket.userId})`)

      // Join user to their personal room
      socket.join(`user:${socket.userId}`)

      // Handle joining chat rooms
      socket.on('join-room', async (roomId: string) => {
        try {
          // Validate room exists and user has access
          const roomData = await CacheService.get(`chat_room:${roomId}`)
          if (!roomData) {
            socket.emit('error', { message: 'Room not found' })
            return
          }

          socket.join(roomId)
          socket.currentRoom = roomId
          
          // Notify others in room
          socket.to(roomId).emit('user-joined', {
            userId: socket.userId,
            userName: socket.userName
          })

          // Send current room state
          const recentMessages = await getRecentMessages(roomId)
          socket.emit('room-joined', {
            roomId,
            messages: recentMessages,
            onlineCount: io.sockets.adapter.rooms.get(roomId)?.size || 0
          })

        } catch (error) {
          console.error('Join room error:', error)
          socket.emit('error', { message: 'Failed to join room' })
        }
      })

      // Handle leaving chat rooms
      socket.on('leave-room', (roomId: string) => {
        socket.leave(roomId)
        socket.to(roomId).emit('user-left', {
          userId: socket.userId,
          userName: socket.userName
        })
        socket.currentRoom = null
      })

      // Handle sending messages
      socket.on('send-message', async (data: { roomId: string; message: string; type?: string }) => {
        try {
          if (!socket.currentRoom || socket.currentRoom !== data.roomId) {
            socket.emit('error', { message: 'Not in room' })
            return
          }

          // Save message to database
          const messageData = await saveMessage({
            roomId: data.roomId,
            userId: socket.userId,
            message: data.message,
            type: data.type || 'text'
          })

          // Broadcast to room
          io.to(data.roomId).emit('new-message', messageData)

          // Update room cache
          await updateRoomCache(data.roomId, messageData)

        } catch (error) {
          console.error('Send message error:', error)
          socket.emit('error', { message: 'Failed to send message' })
        }
      })

      // Handle typing indicators
      socket.on('typing', (data: { roomId: string; isTyping: boolean }) => {
        if (socket.currentRoom === data.roomId) {
          socket.to(data.roomId).emit('user-typing', {
            userId: socket.userId,
            userName: socket.userName,
            isTyping: data.isTyping
          })
        }
      })

      // Handle reactions
      socket.on('add-reaction', async (data: { messageId: string; reaction: string }) => {
        try {
          const updatedMessage = await addMessageReaction(data.messageId, socket.userId, data.reaction)
          
          if (updatedMessage) {
            io.to(socket.currentRoom).emit('message-updated', updatedMessage)
          }
        } catch (error) {
          console.error('Add reaction error:', error)
          socket.emit('error', { message: 'Failed to add reaction' })
        }
      })

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log(`User ${socket.userName} disconnected`)
        if (socket.currentRoom) {
          socket.to(socket.currentRoom).emit('user-left', {
            userId: socket.userId,
            userName: socket.userName
          })
        }
      })
    })

    socket.server.io = io
  }
  return res.end()
}

// Helper functions
async function getRecentMessages(roomId: string, limit: number = 50): Promise<any[]> {
  try {
    const cacheKey = `chat_messages:${roomId}`
    let messages = await CacheService.get<any[]>(cacheKey)
    
    if (!messages) {
      // Fetch from database if not in cache
      const { prisma } = await import('./database')
      messages = await prisma.chatMessage.findMany({
        where: { roomId, isDeleted: false },
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: {
          user: {
            select: { id: true, name: true, image: true }
          },
          reactions: true
        }
      })
      
      // Cache for 10 minutes
      await CacheService.set(cacheKey, messages, CACHE_TTL.CHAT_ROOMS)
    }
    
    return messages.reverse() // Show oldest first
  } catch (error) {
    console.error('Get recent messages error:', error)
    return []
  }
}

async function saveMessage(data: { roomId: string; userId: string; message: string; type: string }): Promise<any> {
  try {
    const { prisma } = await import('./database')
    const message = await prisma.chatMessage.create({
      data: {
        roomId: data.roomId,
        userId: data.userId,
        message: data.message
      },
      include: {
        user: {
          select: { id: true, name: true, image: true }
        }
      }
    })
    
    return message
  } catch (error) {
    console.error('Save message error:', error)
    throw error
  }
}

async function updateRoomCache(roomId: string, message: any) {
  try {
    const cacheKey = `chat_messages:${roomId}`
    const messages = await CacheService.get<any[]>(cacheKey) || []
    
    // Add new message and keep only last 50
    messages.unshift(message)
    const updatedMessages = messages.slice(0, 50)
    
    await CacheService.set(cacheKey, updatedMessages, CACHE_TTL.CHAT_ROOMS)
  } catch (error) {
    console.error('Update room cache error:', error)
  }
}

async function addMessageReaction(messageId: string, userId: string, reaction: string) {
  try {
    const { prisma } = await import('./database')
    
    // Check if reaction already exists
    const existingReaction = await prisma.messageReaction.findFirst({
      where: { messageId, userId, reactionType: reaction }
    })
    
    if (existingReaction) {
      // Remove reaction if it exists
      await prisma.messageReaction.delete({
        where: { id: existingReaction.id }
      })
    } else {
      // Add new reaction
      await prisma.messageReaction.create({
        data: { messageId, userId, reactionType: reaction }
      })
    }
    
    // Return updated message
    const updatedMessage = await prisma.chatMessage.findUnique({
      where: { id: messageId },
      include: {
        user: { select: { id: true, name: true, image: true } },
        reactions: true
      }
    })
    
    return updatedMessage
  } catch (error) {
    console.error('Add message reaction error:', error)
    throw error
  }
}

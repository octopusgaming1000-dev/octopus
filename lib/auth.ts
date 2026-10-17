import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from './prisma'
import crypto from 'crypto'

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production'

export interface JWTPayload {
  userId: string
  email: string
}

export interface GoogleUserInfo {
  id: string
  email: string
  name: string
  picture: string
  verified_email: boolean
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload
  } catch {
    return null
  }
}

export async function createOrUpdateGoogleUser(googleUser: GoogleUserInfo): Promise<{ user: any; isNew: boolean }> {
  // Check if user exists by Google ID
  let user = await prisma.user.findFirst({
    where: {
      provider: 'google',
      providerId: googleUser.id,
    },
  })

  if (user) {
    return { user, isNew: false }
  }

  // Check if user exists by email (merge accounts)
  user = await prisma.user.findUnique({
    where: { email: googleUser.email },
  })

  if (user) {
    // Update existing user with Google info
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        provider: 'google',
        providerId: googleUser.id,
        name: googleUser.name,
        image: googleUser.picture,
        emailVerified: googleUser.verified_email,
      },
    })
    return { user, isNew: false }
  }

  // Create new user
  user = await prisma.user.create({
    data: {
      email: googleUser.email,
      provider: 'google',
      providerId: googleUser.id,
      name: googleUser.name,
      image: googleUser.picture,
      emailVerified: googleUser.verified_email,
    },
  })

  return { user, isNew: true }
}

export function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

export async function createVerificationToken(email: string): Promise<string> {
  const token = generateVerificationToken()
  const expires = new Date()
  expires.setHours(expires.getHours() + 24) // 24 hour expiry

  // Note: verificationToken model not implemented yet
  console.log('Verification token creation not implemented:', { email, token, expires })

  return token
}

export async function verifyEmailToken(email: string, token: string): Promise<boolean> {
  // Note: verificationToken model not implemented yet
  console.log('Email token verification not implemented:', { email, token })
  return false
}


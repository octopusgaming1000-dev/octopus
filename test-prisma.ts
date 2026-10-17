import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Test what models are available
console.log('Available models:')
console.log(Object.keys(prisma).filter(key => !key.startsWith('_') && !key.startsWith('$') && key !== 'constructor' && key !== 'prototype'))

#!/bin/bash

# Production Deployment Script
echo "🚀 Starting production deployment..."

# Check if required environment variables are set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL is required"
    exit 1
fi

if [ -z "$REDIS_HOST" ]; then
    echo "❌ REDIS_HOST is required"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --production

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# Run database migrations
echo "🗄️ Running database migrations..."
npx prisma db push

# Build the application
echo "🏗️ Building application..."
npm run build

# Run health checks
echo "🏥 Running health checks..."
npm run health-check || {
    echo "❌ Health checks failed"
    exit 1
}

# Start the application
echo "🌟 Starting production server..."
npm start

#!/bin/bash
# Railway Deployment Script
# This will be executed by Railway automatically

echo "🚀 Starting Railway Deployment..."

echo "📦 Installing dependencies..."
npm ci --only=production

echo "🔧 Generating Prisma Client..."
npx prisma generate

echo "🗄️ Running database migrations..."
npx prisma migrate deploy

echo "✅ Build complete! Starting server..."
node src/server.js

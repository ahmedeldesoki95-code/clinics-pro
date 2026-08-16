const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

// Singleton Prisma client shared across the whole app to avoid exhausting
// the DB connection pool by instantiating a new client per request/module.
const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'warn' },
    { emit: 'event', level: 'error' },
  ],
});

prisma.$on('warn', (e) => logger.warn({ e }, 'Prisma warning'));
prisma.$on('error', (e) => logger.error({ e }, 'Prisma error'));

async function connectDb() {
  await prisma.$connect();
  logger.info('Database connected');
}

async function disconnectDb() {
  await prisma.$disconnect();
  logger.info('Database disconnected');
}

module.exports = { prisma, connectDb, disconnectDb };

require('dotenv').config();

function required(name, fallback = undefined) {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

module.exports = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: required('DATABASE_URL'),
  reminderCron: process.env.REMINDER_CRON || '*/10 * * * *',
  reminderWindowHours: parseInt(process.env.REMINDER_WINDOW_HOURS || '2', 10),
  minSendDelayMs: parseInt(process.env.MIN_SEND_DELAY_MS || '2000', 10),
  maxSendDelayMs: parseInt(process.env.MAX_SEND_DELAY_MS || '5000', 10),
  sessionsDir: process.env.SESSIONS_DIR || './sessions',
};

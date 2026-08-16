const cron = require('node-cron');
const env = require('../config/env');
const logger = require('../utils/logger');
const { runReminderSweep } = require('./reminderJob');

let task = null;
let isRunning = false;

function startScheduler() {
  if (task) {
    logger.warn('Scheduler already started, skipping duplicate start');
    return task;
  }

  if (!cron.validate(env.reminderCron)) {
    throw new Error(`Invalid REMINDER_CRON expression: ${env.reminderCron}`);
  }

  task = cron.schedule(env.reminderCron, async () => {
    if (isRunning) {
      logger.warn('Previous reminder sweep still running, skipping this tick');
      return;
    }
    isRunning = true;
    try {
      await runReminderSweep();
    } catch (err) {
      logger.error({ err }, 'Reminder sweep failed');
    } finally {
      isRunning = false;
    }
  });

  logger.info({ cron: env.reminderCron }, 'Reminder scheduler started');
  return task;
}

function stopScheduler() {
  if (task) {
    task.stop();
    task = null;
    logger.info('Reminder scheduler stopped');
  }
}

module.exports = { startScheduler, stopScheduler };

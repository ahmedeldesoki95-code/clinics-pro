const cron = require('node-cron');
const env = require('../config/env');
const logger = require('../utils/logger');
const { runReminderSweep } = require('./reminderJob');
const waitlistService = require('../services/waitlistService');

let task = null;
let waitlistTask = null;
let isRunning = false;
let isWaitlistRunning = false;

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

  // Waitlist claim windows are short (15 min), so this sweep runs every
  // minute regardless of the (usually longer) reminder cadence.
  waitlistTask = cron.schedule('* * * * *', async () => {
    if (isWaitlistRunning) return;
    isWaitlistRunning = true;
    try {
      await waitlistService.expireStaleNotifications();
    } catch (err) {
      logger.error({ err }, 'Waitlist expiry sweep failed');
    } finally {
      isWaitlistRunning = false;
    }
  });
  logger.info('Waitlist expiry scheduler started (every minute)');

  return task;
}

function stopScheduler() {
  if (task) {
    task.stop();
    task = null;
    logger.info('Reminder scheduler stopped');
  }
  if (waitlistTask) {
    waitlistTask.stop();
    waitlistTask = null;
    logger.info('Waitlist expiry scheduler stopped');
  }
}

module.exports = { startScheduler, stopScheduler };

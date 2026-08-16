const env = require('../config/env');

/**
 * Sleeps for a random duration between min and max milliseconds.
 * Used before every automated outbound message to mimic human typing
 * pace and reduce the risk of WhatsApp flagging the number for spam.
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function humanDelay(min = env.minSendDelayMs, max = env.maxSendDelayMs) {
  const low = Math.min(min, max);
  const high = Math.max(min, max);
  const ms = Math.floor(Math.random() * (high - low + 1)) + low;
  await sleep(ms);
  return ms;
}

module.exports = { sleep, humanDelay };

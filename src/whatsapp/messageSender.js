const logger = require('../utils/logger');
const { humanDelay } = require('../utils/delay');

/**
 * Sends a text message through a given Baileys socket, prefixed by a
 * randomized human-like delay (anti-ban protection) and simulated
 * "composing" presence for extra realism.
 *
 * @param {import('@whiskeysockets/baileys').WASocket} sock
 * @param {string} jid - full WhatsApp JID, e.g. "2010XXXXXXXX@s.whatsapp.net"
 * @param {string} text
 */
async function sendTextMessage(sock, jid, text) {
  if (!sock) throw new Error('WhatsApp socket is not available for this clinic');

  await humanDelay();

  try {
    await sock.presenceSubscribe(jid).catch(() => {});
    await sock.sendPresenceUpdate('composing', jid).catch(() => {});
    await new Promise((r) => setTimeout(r, 600 + Math.random() * 900));
    await sock.sendPresenceUpdate('paused', jid).catch(() => {});

    const result = await sock.sendMessage(jid, { text });
    return result;
  } catch (err) {
    logger.error({ err, jid }, 'Failed to send WhatsApp message');
    throw err;
  }
}

function phoneToJid(phone) {
  const digitsOnly = String(phone).replace(/[^\d]/g, '');
  return `${digitsOnly}@s.whatsapp.net`;
}

function jidToPhone(jid) {
  return String(jid).split('@')[0];
}

module.exports = { sendTextMessage, phoneToJid, jidToPhone };

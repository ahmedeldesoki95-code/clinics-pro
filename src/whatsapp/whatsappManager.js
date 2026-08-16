const { EventEmitter } = require('events');
const pino = require('pino');
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} = require('@whiskeysockets/baileys');

const logger = require('../utils/logger');
const { ensureSessionDir, removeSessionDir, persistStatus } = require('./sessionStore');

const MAX_RECONNECT_DELAY_MS = 60_000;
const BASE_RECONNECT_DELAY_MS = 1_000;

/**
 * WhatsAppManager owns every clinic's Baileys socket instance.
 * It is a process-wide singleton (one instance shared by the whole app)
 * so that controllers, the booking engine and the cron reminder job can
 * all reach the same live sockets.
 */
class WhatsAppManager extends EventEmitter {
  constructor() {
    super();
    // clinicId -> { sock, status, qr, reconnectAttempts, reconnectTimer, starting }
    this.sessions = new Map();
    // Injected lazily to avoid circular require (bookingEngine requires whatsappManager too)
    this.messageHandler = null;
  }

  /** Allows bookingEngine to register itself without a circular import at load time. */
  setMessageHandler(handlerFn) {
    this.messageHandler = handlerFn;
  }

  getSession(clinicId) {
    return this.sessions.get(clinicId);
  }

  getSocket(clinicId) {
    const session = this.sessions.get(clinicId);
    return session && session.status === 'CONNECTED' ? session.sock : null;
  }

  getStatus(clinicId) {
    const session = this.sessions.get(clinicId);
    return session ? session.status : 'DISCONNECTED';
  }

  getLatestQr(clinicId) {
    const session = this.sessions.get(clinicId);
    return session ? session.qr : null;
  }

  /**
   * Starts (or restarts) a WhatsApp session for a given clinic.
   * Safe to call repeatedly: if a session is already starting/connected it
   * will just return the current state instead of spawning duplicates.
   */
  async startSession(clinicId) {
    const existing = this.sessions.get(clinicId);
    if (existing && (existing.status === 'CONNECTED' || existing.starting)) {
      return existing;
    }

    const session = existing || {
      sock: null,
      status: 'DISCONNECTED',
      qr: null,
      reconnectAttempts: 0,
      reconnectTimer: null,
      starting: false,
    };
    session.starting = true;
    this.sessions.set(clinicId, session);

    const sessionDir = ensureSessionDir(clinicId);
    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
      version,
      auth: state,
      logger: pino({ level: 'silent' }),
      printQRInTerminal: false,
      browser: ['Clinic Assistant', 'Chrome', '1.0.0'],
      syncFullHistory: false,
      markOnlineOnConnect: false,
    });

    session.sock = sock;
    session.status = 'CONNECTING';
    session.starting = false;
    await persistStatus(clinicId, 'CONNECTING');

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      await this._handleConnectionUpdate(clinicId, update);
    });

    sock.ev.on('messages.upsert', async (payload) => {
      await this._handleIncomingMessages(clinicId, payload);
    });

    return session;
  }

  async _handleConnectionUpdate(clinicId, update) {
    const session = this.sessions.get(clinicId);
    if (!session) return;

    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      session.qr = qr;
      session.status = 'QR_PENDING';
      await persistStatus(clinicId, 'QR_PENDING');
      this.emit('qr', { clinicId, qr });
    }

    if (connection === 'open') {
      session.status = 'CONNECTED';
      session.qr = null;
      session.reconnectAttempts = 0;
      await persistStatus(clinicId, 'CONNECTED');
      this.emit('connected', { clinicId });
      logger.info({ clinicId }, 'WhatsApp session connected');
    }

    if (connection === 'close') {
      // Baileys surfaces disconnect errors as Boom-wrapped errors already,
      // so lastDisconnect.error.output.statusCode is the WA close code.
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const loggedOut = statusCode === DisconnectReason.loggedOut;

      session.status = loggedOut ? 'LOGGED_OUT' : 'DISCONNECTED';
      await persistStatus(clinicId, session.status);
      this.emit('disconnected', { clinicId, loggedOut, statusCode });
      logger.warn({ clinicId, statusCode, loggedOut }, 'WhatsApp session closed');

      // Always tear down listeners on the dead socket to prevent leaks.
      this._cleanupSocketListeners(session.sock);

      if (loggedOut) {
        // Session is permanently invalid; wipe creds so a fresh QR is required.
        removeSessionDir(clinicId);
        this.sessions.delete(clinicId);
        return;
      }

      this._scheduleReconnect(clinicId);
    }
  }

  _scheduleReconnect(clinicId) {
    const session = this.sessions.get(clinicId);
    if (!session) return;

    if (session.reconnectTimer) {
      clearTimeout(session.reconnectTimer);
    }

    const attempt = session.reconnectAttempts + 1;
    const delay = Math.min(BASE_RECONNECT_DELAY_MS * 2 ** attempt, MAX_RECONNECT_DELAY_MS);
    session.reconnectAttempts = attempt;

    logger.info({ clinicId, attempt, delayMs: delay }, 'Scheduling WhatsApp reconnect');

    session.reconnectTimer = setTimeout(() => {
      this.startSession(clinicId).catch((err) => {
        logger.error({ err, clinicId }, 'Reconnect attempt failed');
      });
    }, delay);
  }

  async _handleIncomingMessages(clinicId, { messages, type }) {
    if (type !== 'notify') return;
    const session = this.sessions.get(clinicId);
    if (!session || !session.sock) return;

    for (const msg of messages) {
      if (!msg.message || msg.key.fromMe) continue;
      // Ignore group/broadcast/status traffic — this bot only talks to patients 1:1.
      if (msg.key.remoteJid?.endsWith('@g.us') || msg.key.remoteJid === 'status@broadcast') continue;

      const text = this._extractText(msg);
      if (!text) continue;

      if (this.messageHandler) {
        try {
          await this.messageHandler({
            clinicId,
            sock: session.sock,
            remoteJid: msg.key.remoteJid,
            text: text.trim(),
          });
        } catch (err) {
          logger.error({ err, clinicId }, 'Error while handling incoming WhatsApp message');
        }
      }
    }
  }

  _extractText(msg) {
    const m = msg.message;
    return (
      m.conversation ||
      m.extendedTextMessage?.text ||
      m.buttonsResponseMessage?.selectedButtonId ||
      m.listResponseMessage?.singleSelectReply?.selectedRowId ||
      null
    );
  }

  _cleanupSocketListeners(sock) {
    if (!sock) return;
    try {
      sock.ev.removeAllListeners();
    } catch (err) {
      logger.warn({ err }, 'Failed to remove listeners cleanly');
    }
  }

  /**
   * Gracefully stops a session. `logout: true` also invalidates the WhatsApp
   * pairing (requires re-scanning QR next time); otherwise creds are kept so
   * the socket can silently reconnect later.
   */
  async stopSession(clinicId, { logout = false } = {}) {
    const session = this.sessions.get(clinicId);
    if (!session) return;

    if (session.reconnectTimer) {
      clearTimeout(session.reconnectTimer);
    }

    if (session.sock) {
      try {
        if (logout) {
          await session.sock.logout();
        } else {
          session.sock.end(undefined);
        }
      } catch (err) {
        logger.warn({ err, clinicId }, 'Error while closing socket');
      } finally {
        this._cleanupSocketListeners(session.sock);
      }
    }

    if (logout) {
      removeSessionDir(clinicId);
      this.sessions.delete(clinicId);
    } else {
      session.status = 'DISCONNECTED';
      session.sock = null;
    }

    await persistStatus(clinicId, logout ? 'LOGGED_OUT' : 'DISCONNECTED');
  }
}

// Process-wide singleton
const whatsappManager = new WhatsAppManager();

module.exports = whatsappManager;

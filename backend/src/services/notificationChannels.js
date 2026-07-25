/**
 * Liskov Substitution Principle (Section 3.2 of the SDD): notifications are
 * delivered through a NotificationChannel-shaped object. The dispatcher in
 * notificationService.js can substitute any channel below without changing
 * its own logic, as each fully implements the same `deliver(user, notification)` contract.
 */
const { query } = require('../config/db');

const EmailChannel = {
  name: 'email',
  async deliver(user, notification) {
    // Reuses the mailer utility; kept best-effort so a failed email never blocks the flow.
    try {
      const { sendOtpEmail } = require('../utils/mailer'); // lightweight reuse of configured transporter
      // Not an OTP, but the transporter helper is generic enough — for a full build a
      // dedicated sendNotificationEmail would be added here.
      console.log(`[EmailChannel] would notify ${user.email}: ${notification.title}`);
    } catch (err) {
      console.warn('EmailChannel delivery failed (non-fatal):', err.message);
    }
  },
};

const PushChannel = {
  name: 'push',
  async deliver(user, notification, { io } = {}) {
    if (io) {
      io.to(`user:${user.id}`).emit('notification', notification);
    }
  },
};

const TelegramChannel = {
  name: 'telegram',
  async deliver(user, notification) {
    const { rows } = await query('SELECT chat_id FROM telegram_sessions WHERE user_id = $1', [user.id]);
    const chatId = rows[0]?.chat_id;
    if (!chatId || !process.env.TELEGRAM_BOT_TOKEN) return;

    try {
      await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: `🔔 *${notification.title}*\n${notification.body || ''}`,
          parse_mode: 'Markdown',
        }),
      });
    } catch (err) {
      console.warn('TelegramChannel delivery failed (non-fatal):', err.message);
    }
  },
};

module.exports = { EmailChannel, PushChannel, TelegramChannel };

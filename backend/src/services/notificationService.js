const { query } = require('../config/db');
const { EmailChannel, PushChannel, TelegramChannel } = require('./notificationChannels');

const CHANNELS = [PushChannel, TelegramChannel, EmailChannel];

/**
 * Creates a notification row and fans it out across all channels.
 * Cross-module effects (e.g. an exchange request notifying its target user)
 * should always go through this function rather than direct calls between
 * modules, per the coupling guidance in Section 3.2 of the SDD.
 */
async function notify(userId, { type, title, body, metadata = {} }, { io } = {}) {
  const { rows } = await query(
    `INSERT INTO notifications (user_id, type, title, body, metadata)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [userId, type, title, body, metadata]
  );
  const notification = rows[0];

  const { rows: userRows } = await query('SELECT id, email FROM users WHERE id = $1', [userId]);
  const user = userRows[0];
  if (!user) return notification;

  await Promise.all(CHANNELS.map((channel) => channel.deliver(user, notification, { io }).catch(() => {})));

  return notification;
}

module.exports = { notify };

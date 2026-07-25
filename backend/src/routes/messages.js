const express = require('express');
const { query } = require('../config/db');
const { requireAuth, requireVerified } = require('../middleware/auth');
const { uploadDocument } = require('../config/cloudinary');
const { notify } = require('../services/notificationService');

module.exports = (io) => {
  const router = express.Router();

  // List conversation partners with the latest message preview
  router.get('/conversations', requireAuth, async (req, res) => {
    try {
      const { rows } = await query(
        `SELECT DISTINCT ON (partner_id) partner_id, u.full_name AS partner_name, u.avatar_url AS partner_avatar,
                content, created_at, is_read, sender_id
         FROM (
           SELECT
             CASE WHEN sender_id = $1 THEN receiver_id ELSE sender_id END AS partner_id,
             content, created_at, is_read, sender_id
           FROM messages
           WHERE sender_id = $1 OR receiver_id = $1
         ) m
         JOIN users u ON u.id = m.partner_id
         ORDER BY partner_id, created_at DESC`,
        [req.user.id]
      );
      res.json({ conversations: rows });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch conversations.' });
    }
  });

  router.get('/:userId', requireAuth, async (req, res) => {
    try {
      const { rows } = await query(
        `SELECT * FROM messages
         WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1)
         ORDER BY created_at ASC`,
        [req.user.id, req.params.userId]
      );

      await query(
        `UPDATE messages SET is_read = TRUE WHERE sender_id = $1 AND receiver_id = $2 AND is_read = FALSE`,
        [req.params.userId, req.user.id]
      );

      res.json({ messages: rows });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch messages.' });
    }
  });

  // FR9-FR10: send message with optional file attachment
  router.post('/', requireAuth, requireVerified, uploadDocument.single('attachment'), async (req, res) => {
    try {
      const { receiverId, content } = req.body;
      if (!receiverId || (!content && !req.file)) {
        return res.status(400).json({ error: 'receiverId and content or attachment are required.' });
      }

      const { rows } = await query(
        `INSERT INTO messages (sender_id, receiver_id, content, attachment_url) VALUES ($1,$2,$3,$4) RETURNING *`,
        [req.user.id, receiverId, content || null, req.file ? req.file.path : null]
      );
      const message = rows[0];

      io.to(`user:${receiverId}`).emit('message:new', message);

      await notify(receiverId, {
        type: 'message',
        title: `New message from ${req.user.full_name}`,
        body: content ? content.slice(0, 100) : 'Sent an attachment.',
        metadata: { senderId: req.user.id },
      }, { io });

      res.status(201).json({ message });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to send message.' });
    }
  });

  return router;
};

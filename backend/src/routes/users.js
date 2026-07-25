const express = require('express');
const crypto = require('crypto');
const { query } = require('../config/db');
const { requireAuth } = require('../middleware/auth');
const { uploadAvatar } = require('../config/cloudinary');

const router = express.Router();

router.get('/:id', async (req, res) => {
  try {
    const { rows } = await query(
      'SELECT id, full_name, email, department, avatar_url, created_at FROM users WHERE id = $1',
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'User not found.' });
    res.json({ user: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user.' });
  }
});

router.patch('/me', requireAuth, uploadAvatar.single('avatar'), async (req, res) => {
  try {
    const { fullName, department } = req.body;
    const updates = [];
    const params = [];
    let idx = 1;

    if (fullName) { updates.push(`full_name = $${idx}`); params.push(fullName); idx++; }
    if (department) { updates.push(`department = $${idx}`); params.push(department); idx++; }
    if (req.file) { updates.push(`avatar_url = $${idx}`); params.push(req.file.path); idx++; }

    if (!updates.length) return res.status(400).json({ error: 'No valid fields to update.' });

    params.push(req.user.id);
    const { rows } = await query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${idx} RETURNING id, full_name, email, department, avatar_url`,
      params
    );
    res.json({ user: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update profile.' });
  }
});

// FR18: generates a one-time link code the student sends to the Telegram bot via /link <code>
router.post('/me/telegram/link-code', requireAuth, async (req, res) => {
  try {
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    await query(
      `INSERT INTO telegram_sessions (user_id, link_code)
       VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE SET link_code = $2`,
      [req.user.id, code]
    );
    res.json({ linkCode: code, instructions: `Open the Telegram bot and send: /link ${code}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate link code.' });
  }
});

router.delete('/me/telegram', requireAuth, async (req, res) => {
  try {
    await query('DELETE FROM telegram_sessions WHERE user_id = $1', [req.user.id]);
    res.json({ message: 'Telegram account unlinked.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to unlink Telegram.' });
  }
});

module.exports = router;

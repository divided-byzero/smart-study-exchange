const express = require('express');
const { query } = require('../config/db');
const { requireAuth, requireVerified } = require('../middleware/auth');

const router = express.Router();

router.post('/', requireAuth, requireVerified, async (req, res) => {
  try {
    const { targetType, targetId, reason } = req.body;
    if (!['book', 'note', 'user', 'message'].includes(targetType)) {
      return res.status(400).json({ error: 'Invalid targetType.' });
    }
    if (!reason) return res.status(400).json({ error: 'reason is required.' });

    const { rows } = await query(
      `INSERT INTO reports (reporter_id, target_type, target_id, reason) VALUES ($1,$2,$3,$4) RETURNING *`,
      [req.user.id, targetType, targetId, reason]
    );
    res.status(201).json({ report: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to submit report.' });
  }
});

module.exports = router;

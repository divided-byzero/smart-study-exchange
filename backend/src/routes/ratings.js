const express = require('express');
const { query } = require('../config/db');
const { requireAuth, requireVerified } = require('../middleware/auth');
const { notify } = require('../services/notificationService');

module.exports = (io) => {
  const router = express.Router();

  // FR11: rate books/sellers
  router.post('/', requireAuth, requireVerified, async (req, res) => {
    try {
      const { targetType, targetId, score, comment } = req.body;
      if (!['book', 'user'].includes(targetType)) return res.status(400).json({ error: 'targetType must be "book" or "user".' });
      if (!score || score < 1 || score > 5) return res.status(400).json({ error: 'score must be between 1 and 5.' });

      const { rows } = await query(
        `INSERT INTO ratings (rater_id, target_type, target_id, score, comment) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [req.user.id, targetType, targetId, score, comment || null]
      );

      // Notify the rated user (directly for user ratings, or the seller for book ratings)
      let notifyUserId = targetType === 'user' ? targetId : null;
      if (targetType === 'book') {
        const { rows: bookRows } = await query('SELECT seller_id FROM books WHERE id = $1', [targetId]);
        notifyUserId = bookRows[0]?.seller_id;
      }
      if (notifyUserId) {
        await notify(notifyUserId, {
          type: 'rating',
          title: 'You received a new rating',
          body: `${req.user.full_name} rated you ${score}/5.`,
          metadata: { ratingId: rows[0].id },
        }, { io });
      }

      res.status(201).json({ rating: rows[0] });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to submit rating.' });
    }
  });

  router.get('/:targetType/:targetId', async (req, res) => {
    try {
      const { targetType, targetId } = req.params;
      const { rows } = await query(
        `SELECT r.*, u.full_name AS rater_name FROM ratings r JOIN users u ON u.id = r.rater_id
         WHERE target_type = $1 AND target_id = $2 ORDER BY created_at DESC`,
        [targetType, targetId]
      );
      const avg = rows.length ? rows.reduce((sum, r) => sum + r.score, 0) / rows.length : null;
      res.json({ ratings: rows, average: avg });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch ratings.' });
    }
  });

  return router;
};

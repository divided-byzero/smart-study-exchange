const express = require('express');
const { query } = require('../config/db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { notify } = require('../services/notificationService');

module.exports = (io) => {
  const router = express.Router();
  router.use(requireAuth, requireAdmin);

  router.get('/stats', async (req, res) => {
    try {
      const [users, books, notes, reports] = await Promise.all([
        query('SELECT count(*) FROM users'),
        query('SELECT count(*) FROM books'),
        query('SELECT count(*) FROM notes'),
        query(`SELECT count(*) FROM reports WHERE status = 'pending'`),
      ]);
      res.json({
        totalUsers: Number(users.rows[0].count),
        totalBooks: Number(books.rows[0].count),
        totalNotes: Number(notes.rows[0].count),
        pendingReports: Number(reports.rows[0].count),
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch stats.' });
    }
  });

  router.get('/reports', async (req, res) => {
    try {
      const { rows } = await query(
        `SELECT r.*, u.full_name AS reporter_name FROM reports r JOIN users u ON u.id = r.reporter_id
         ORDER BY created_at DESC`
      );
      res.json({ reports: rows });
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch reports.' });
    }
  });

  router.patch('/reports/:id', async (req, res) => {
    try {
      const { status } = req.body; // resolved | dismissed
      const { rows } = await query('UPDATE reports SET status = $1 WHERE id = $2 RETURNING *', [status, req.params.id]);
      if (!rows[0]) return res.status(404).json({ error: 'Report not found.' });
      res.json({ report: rows[0] });
    } catch (err) {
      res.status(500).json({ error: 'Failed to update report.' });
    }
  });

  // FR14: remove content (books/notes)
  router.delete('/books/:id', async (req, res) => {
    await query(`UPDATE books SET status = 'removed' WHERE id = $1`, [req.params.id]);
    res.json({ message: 'Book listing removed.' });
  });

  router.delete('/notes/:id', async (req, res) => {
    await query('DELETE FROM notes WHERE id = $1', [req.params.id]);
    res.json({ message: 'Note removed.' });
  });

  // FR14: ban users
  router.patch('/users/:id/ban', async (req, res) => {
    try {
      const { rows } = await query('UPDATE users SET is_banned = TRUE WHERE id = $1 RETURNING id, email, full_name', [req.params.id]);
      if (!rows[0]) return res.status(404).json({ error: 'User not found.' });

      await notify(req.params.id, {
        type: 'system',
        title: 'Your account has been suspended',
        body: 'Please contact support if you believe this is a mistake.',
      }, { io });

      res.json({ message: 'User banned.', user: rows[0] });
    } catch (err) {
      res.status(500).json({ error: 'Failed to ban user.' });
    }
  });

  router.patch('/users/:id/unban', async (req, res) => {
    try {
      const { rows } = await query('UPDATE users SET is_banned = FALSE WHERE id = $1 RETURNING id, email, full_name', [req.params.id]);
      if (!rows[0]) return res.status(404).json({ error: 'User not found.' });
      res.json({ message: 'User unbanned.', user: rows[0] });
    } catch (err) {
      res.status(500).json({ error: 'Failed to unban user.' });
    }
  });

  router.get('/users', async (req, res) => {
    try {
      const { rows } = await query(
        'SELECT id, full_name, email, role, department, is_verified, is_banned, created_at FROM users ORDER BY created_at DESC'
      );
      res.json({ users: rows });
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch users.' });
    }
  });

  return router;
};

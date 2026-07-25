const express = require('express');
const { query } = require('../config/db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { uploadBookImages } = require('../config/cloudinary');

const router = express.Router();

// FR13: display advertisements
router.get('/', async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM advertisements WHERE is_active = TRUE ORDER BY created_at DESC');
    res.json({ advertisements: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch advertisements.' });
  }
});

router.post('/:id/impression', async (req, res) => {
  try {
    await query('UPDATE advertisements SET impressions = impressions + 1 WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to record impression.' });
  }
});

router.post('/:id/click', async (req, res) => {
  try {
    await query('UPDATE advertisements SET clicks = clicks + 1 WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to record click.' });
  }
});

// FR14: administrator manages ads
router.post('/', requireAuth, requireAdmin, uploadBookImages.single('image'), async (req, res) => {
  try {
    const { title, linkUrl } = req.body;
    if (!title) return res.status(400).json({ error: 'title is required.' });

    const { rows } = await query(
      `INSERT INTO advertisements (title, image_url, link_url, created_by) VALUES ($1,$2,$3,$4) RETURNING *`,
      [title, req.file ? req.file.path : null, linkUrl || null, req.user.id]
    );
    res.status(201).json({ advertisement: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create advertisement.' });
  }
});

router.patch('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { isActive } = req.body;
    const { rows } = await query(
      'UPDATE advertisements SET is_active = COALESCE($1, is_active) WHERE id = $2 RETURNING *',
      [isActive, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Advertisement not found.' });
    res.json({ advertisement: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update advertisement.' });
  }
});

router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    await query('DELETE FROM advertisements WHERE id = $1', [req.params.id]);
    res.json({ message: 'Advertisement deleted.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete advertisement.' });
  }
});

module.exports = router;

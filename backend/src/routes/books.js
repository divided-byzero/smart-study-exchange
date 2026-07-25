const express = require('express');
const { query } = require('../config/db');
const { requireAuth, requireVerified } = require('../middleware/auth');
const { uploadBookImages } = require('../config/cloudinary');
const aiProvider = require('../services/aiProvider');

const router = express.Router();

// FR6: search by course code, semester, department, or title
router.get('/', async (req, res) => {
  try {
    const { q, department, semester, courseCode, status = 'available', page = 1, limit = 20 } = req.query;
    const conditions = [`status = $1`];
    const params = [status];
    let idx = 2;

    if (q) {
      conditions.push(`(title ILIKE $${idx} OR author ILIKE $${idx} OR course_code ILIKE $${idx})`);
      params.push(`%${q}%`);
      idx++;
    }
    if (department) {
      conditions.push(`department = $${idx}`);
      params.push(department);
      idx++;
    }
    if (semester) {
      conditions.push(`semester = $${idx}`);
      params.push(semester);
      idx++;
    }
    if (courseCode) {
      conditions.push(`course_code = $${idx}`);
      params.push(courseCode);
      idx++;
    }

    const offset = (Number(page) - 1) * Number(limit);
    params.push(Number(limit), offset);

    const { rows } = await query(
      `SELECT b.*, u.full_name AS seller_name, u.avatar_url AS seller_avatar
       FROM books b JOIN users u ON u.id = b.seller_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY b.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      params
    );

    res.json({ books: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch books.' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT b.*, u.full_name AS seller_name, u.avatar_url AS seller_avatar, u.id AS seller_id
       FROM books b JOIN users u ON u.id = b.seller_id WHERE b.id = $1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Book not found.' });
    res.json({ book: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch book.' });
  }
});

// FR4: upload books
router.post('/', requireAuth, requireVerified, uploadBookImages.array('images', 5), async (req, res) => {
  try {
    const { title, author, department, semester, courseCode, price, condition, description } = req.body;
    if (!title || !price || !condition) {
      return res.status(400).json({ error: 'title, price, and condition are required.' });
    }

    const images = (req.files || []).map((f) => f.path);

    const { rows } = await query(
      `INSERT INTO books (seller_id, title, author, department, semester, course_code, price, condition, description, images)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [req.user.id, title, author || null, department || null, semester || null, courseCode || null, price, condition, description || null, images]
    );

    res.status(201).json({ book: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create listing.' });
  }
});

router.patch('/:id', requireAuth, async (req, res) => {
  try {
    const { rows: existingRows } = await query('SELECT * FROM books WHERE id = $1', [req.params.id]);
    const book = existingRows[0];
    if (!book) return res.status(404).json({ error: 'Book not found.' });
    if (book.seller_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to edit this listing.' });
    }

    const allowed = ['title', 'author', 'department', 'semester', 'course_code', 'price', 'condition', 'description', 'status'];
    const updates = [];
    const params = [];
    let idx = 1;

    for (const key of allowed) {
      const camel = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
      if (req.body[camel] !== undefined) {
        updates.push(`${key} = $${idx}`);
        params.push(req.body[camel]);
        idx++;
      }
    }
    if (!updates.length) return res.status(400).json({ error: 'No valid fields to update.' });

    params.push(req.params.id);
    const { rows } = await query(`UPDATE books SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`, params);
    res.json({ book: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update listing.' });
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { rows: existingRows } = await query('SELECT seller_id FROM books WHERE id = $1', [req.params.id]);
    if (!existingRows[0]) return res.status(404).json({ error: 'Book not found.' });
    if (existingRows[0].seller_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to delete this listing.' });
    }
    await query('DELETE FROM books WHERE id = $1', [req.params.id]);
    res.json({ message: 'Listing deleted.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete listing.' });
  }
});

// AI Book Price Predictor ("WOW feature")
router.post('/predict-price', requireAuth, async (req, res) => {
  try {
    const { title, author, condition, department, originalPrice } = req.body;
    if (!title || !condition) {
      return res.status(400).json({ error: 'title and condition are required.' });
    }
    const result = await aiProvider.predictBookPrice({ title, author, condition, department, originalPrice });
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(err.statusCode || 500).json({ error: err.message || 'Price prediction failed.' });
  }
});

module.exports = router;

const express = require('express');
const { query } = require('../config/db');
const { requireAuth, requireVerified } = require('../middleware/auth');
const { uploadDocument } = require('../config/cloudinary');
const aiProvider = require('../services/aiProvider');
const youtubeClient = require('../services/youtubeClient');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { department, semester, courseCode, page = 1, limit = 20 } = req.query;
    const conditions = ['1=1'];
    const params = [];
    let idx = 1;

    if (department) { conditions.push(`department = $${idx}`); params.push(department); idx++; }
    if (semester) { conditions.push(`semester = $${idx}`); params.push(semester); idx++; }
    if (courseCode) { conditions.push(`course_code = $${idx}`); params.push(courseCode); idx++; }

    const offset = (Number(page) - 1) * Number(limit);
    params.push(Number(limit), offset);

    const { rows } = await query(
      `SELECT n.*, u.full_name AS uploader_name
       FROM notes n JOIN users u ON u.id = n.uploader_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY n.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      params
    );
    res.json({ notes: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch notes.' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT n.*, u.full_name AS uploader_name FROM notes n JOIN users u ON u.id = n.uploader_id WHERE n.id = $1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Note not found.' });
    res.json({ note: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch note.' });
  }
});

// FR5: upload notes (PDF/image)
router.post('/', requireAuth, requireVerified, uploadDocument.single('file'), async (req, res) => {
  try {
    const { title, courseCode, department, semester } = req.body;
    if (!title || !req.file) return res.status(400).json({ error: 'title and file are required.' });

    const { rows } = await query(
      `INSERT INTO notes (uploader_id, title, course_code, department, semester, file_url, source_type)
       VALUES ($1,$2,$3,$4,$5,$6,'upload') RETURNING *`,
      [req.user.id, title, courseCode || null, department || null, semester || null, req.file.path]
    );

    res.status(201).json({ note: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to upload note.' });
  }
});

// FR15 / "WOW feature": YouTube to Notes Generator
router.post('/from-youtube', requireAuth, requireVerified, async (req, res) => {
  try {
    const { videoUrl, courseCode, department, semester } = req.body;
    if (!videoUrl) return res.status(400).json({ error: 'videoUrl is required.' });

    const { title, transcript } = await youtubeClient.getTranscript(videoUrl);
    const summary = await aiProvider.summarizeText(transcript, { title });

    const { rows: noteRows } = await query(
      `INSERT INTO notes (uploader_id, title, course_code, department, semester, source_type, raw_text, summary)
       VALUES ($1,$2,$3,$4,$5,'youtube',$6,$7) RETURNING *`,
      [req.user.id, title, courseCode || null, department || null, semester || null, transcript, summary]
    );
    const note = noteRows[0];

    await query(
      `INSERT INTO youtube_notes (note_id, video_url, video_title, transcript) VALUES ($1,$2,$3,$4)`,
      [note.id, videoUrl, title, transcript]
    );

    // Best-effort embedding for smart search; failures here should not block note creation.
    try {
      const embedding = await aiProvider.generateEmbedding(`${title}\n${summary}`);
      await query('UPDATE notes SET embedding = $1 WHERE id = $2', [`[${embedding.join(',')}]`, note.id]);
    } catch (embErr) {
      console.warn('Embedding generation skipped:', embErr.message);
    }

    res.status(201).json({ note });
  } catch (err) {
    console.error(err);
    res.status(err.statusCode || 500).json({ error: err.message || 'Failed to generate notes from video.' });
  }
});

// FR15: AI Note Summarizer (for an already-uploaded note)
router.post('/:id/summarize', requireAuth, async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM notes WHERE id = $1', [req.params.id]);
    const note = rows[0];
    if (!note) return res.status(404).json({ error: 'Note not found.' });

    const sourceText = note.raw_text || req.body.text;
    if (!sourceText) {
      return res.status(400).json({
        error: 'No extractable text found for this note. Pass raw text in the "text" field (e.g. after OCR/PDF extraction on the client).',
      });
    }

    const summary = await aiProvider.summarizeText(sourceText, { title: note.title });
    await query('UPDATE notes SET summary = $1, raw_text = COALESCE(raw_text, $2) WHERE id = $3', [summary, sourceText, note.id]);

    try {
      const embedding = await aiProvider.generateEmbedding(`${note.title}\n${summary}`);
      await query('UPDATE notes SET embedding = $1 WHERE id = $2', [`[${embedding.join(',')}]`, note.id]);
    } catch (embErr) {
      console.warn('Embedding generation skipped:', embErr.message);
    }

    res.json({ summary });
  } catch (err) {
    console.error(err);
    res.status(err.statusCode || 500).json({ error: err.message || 'Summarization failed.' });
  }
});

module.exports = router;

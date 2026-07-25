const express = require('express');
const { query, pool } = require('../config/db');
const { requireAuth } = require('../middleware/auth');
const aiProvider = require('../services/aiProvider');

const router = express.Router();

// FR16: AI Quiz Generator - produces practice questions from a note
router.post('/generate', requireAuth, async (req, res) => {
  const client = await pool.connect();
  try {
    const { noteId, count = 5 } = req.body;
    const { rows: noteRows } = await query('SELECT * FROM notes WHERE id = $1', [noteId]);
    const note = noteRows[0];
    if (!note) return res.status(404).json({ error: 'Note not found.' });

    const sourceText = note.summary || note.raw_text;
    if (!sourceText) return res.status(400).json({ error: 'This note has no summary or text to generate a quiz from yet.' });

    const questions = await aiProvider.generateQuiz(sourceText, { count });
    if (!questions.length) return res.status(502).json({ error: 'AI did not return any questions. Try again.' });

    await client.query('BEGIN');
    const { rows: quizRows } = await client.query(
      `INSERT INTO quizzes (note_id, student_id, title, total_questions) VALUES ($1,$2,$3,$4) RETURNING *`,
      [noteId, req.user.id, `Quiz: ${note.title}`, questions.length]
    );
    const quiz = quizRows[0];

    const insertedQuestions = [];
    for (const q of questions) {
      const { rows } = await client.query(
        `INSERT INTO quiz_questions (quiz_id, question_text, options, correct_option)
         VALUES ($1,$2,$3,$4) RETURNING id, question_text, options`,
        [quiz.id, q.question_text, JSON.stringify(q.options), q.correct_option]
      );
      insertedQuestions.push(rows[0]); // correct_option withheld from the client response
    }
    await client.query('COMMIT');

    res.status(201).json({ quiz, questions: insertedQuestions });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(err.statusCode || 500).json({ error: err.message || 'Quiz generation failed.' });
  } finally {
    client.release();
  }
});

// FR16: evaluate the student's submitted answers
router.post('/:id/submit', requireAuth, async (req, res) => {
  try {
    const { answers } = req.body; // [{ questionId, selectedOption }]
    if (!Array.isArray(answers)) return res.status(400).json({ error: 'answers must be an array.' });

    const { rows: quizRows } = await query('SELECT * FROM quizzes WHERE id = $1', [req.params.id]);
    const quiz = quizRows[0];
    if (!quiz) return res.status(404).json({ error: 'Quiz not found.' });

    let correctCount = 0;
    const results = [];

    for (const answer of answers) {
      const { rows } = await query('SELECT * FROM quiz_questions WHERE id = $1 AND quiz_id = $2', [answer.questionId, req.params.id]);
      const question = rows[0];
      if (!question) continue;

      const isCorrect = question.correct_option === answer.selectedOption;
      if (isCorrect) correctCount++;

      await query(
        'UPDATE quiz_questions SET student_answer = $1, is_correct = $2 WHERE id = $3',
        [answer.selectedOption, isCorrect, question.id]
      );

      results.push({
        questionId: question.id,
        isCorrect,
        correctOption: question.correct_option,
      });
    }

    await query(
      `UPDATE quizzes SET score = $1, completed_at = now() WHERE id = $2`,
      [correctCount, req.params.id]
    );

    res.json({ score: correctCount, total: quiz.total_questions, results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to submit quiz.' });
  }
});

router.get('/my', requireAuth, async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT q.*, n.title AS note_title FROM quizzes q JOIN notes n ON n.id = q.note_id
       WHERE q.student_id = $1 ORDER BY q.created_at DESC`,
      [req.user.id]
    );
    res.json({ quizzes: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch quizzes.' });
  }
});

module.exports = router;

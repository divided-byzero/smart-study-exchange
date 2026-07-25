const express = require('express');
const { query } = require('../config/db');
const { requireAuth, requireVerified } = require('../middleware/auth');
const { notify } = require('../services/notificationService');

module.exports = (io) => {
  const router = express.Router();

  // FR7: send book exchange requests
  router.post('/', requireAuth, requireVerified, async (req, res) => {
    try {
      const { bookId, offeredBookId, cashAmount = 0, message } = req.body;
      const { rows: bookRows } = await query('SELECT * FROM books WHERE id = $1', [bookId]);
      const book = bookRows[0];
      if (!book) return res.status(404).json({ error: 'Book not found.' });
      if (book.seller_id === req.user.id) return res.status(400).json({ error: 'You cannot request your own listing.' });

      const { rows } = await query(
        `INSERT INTO exchange_requests (book_id, requester_id, offered_book_id, cash_amount, message)
         VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [bookId, req.user.id, offeredBookId || null, cashAmount, message || null]
      );

      await notify(book.seller_id, {
        type: 'exchange_request',
        title: 'New exchange request',
        body: `${req.user.full_name} sent a request for "${book.title}".`,
        metadata: { exchangeRequestId: rows[0].id, bookId },
      }, { io });

      res.status(201).json({ exchangeRequest: rows[0] });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to send exchange request.' });
    }
  });

  router.get('/my', requireAuth, async (req, res) => {
    try {
      const { rows } = await query(
        `SELECT er.*, b.title AS book_title, b.images AS book_images
         FROM exchange_requests er
         JOIN books b ON b.id = er.book_id
         WHERE er.requester_id = $1 OR b.seller_id = $1
         ORDER BY er.created_at DESC`,
        [req.user.id]
      );
      res.json({ exchangeRequests: rows });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch exchange requests.' });
    }
  });

  // FR8: negotiate an additional cash amount
  router.patch('/:id/negotiate', requireAuth, async (req, res) => {
    try {
      const { cashAmount, message } = req.body;
      const { rows } = await query(
        `UPDATE exchange_requests SET cash_amount = $1, message = $2, status = 'countered'
         WHERE id = $3 RETURNING *`,
        [cashAmount, message || null, req.params.id]
      );
      if (!rows[0]) return res.status(404).json({ error: 'Exchange request not found.' });
      res.json({ exchangeRequest: rows[0] });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to update negotiation.' });
    }
  });

  router.patch('/:id/status', requireAuth, async (req, res) => {
    try {
      const { status } = req.body; // accepted | rejected | cancelled
      if (!['accepted', 'rejected', 'cancelled'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status.' });
      }

      const { rows } = await query(
        `UPDATE exchange_requests SET status = $1 WHERE id = $2 RETURNING *`,
        [status, req.params.id]
      );
      const exchangeRequest = rows[0];
      if (!exchangeRequest) return res.status(404).json({ error: 'Exchange request not found.' });

      if (status === 'accepted') {
        await query(`UPDATE books SET status = 'reserved' WHERE id = $1`, [exchangeRequest.book_id]);
      }

      await notify(exchangeRequest.requester_id, {
        type: 'exchange_request',
        title: `Your exchange request was ${status}`,
        body: `Status updated to ${status}.`,
        metadata: { exchangeRequestId: exchangeRequest.id },
      }, { io });

      res.json({ exchangeRequest });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to update status.' });
    }
  });

  return router;
};

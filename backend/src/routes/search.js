const express = require('express');
const { KeywordSearchStrategy, SmartSearchStrategy } = require('../services/searchStrategies');

const router = express.Router();

// FR6 + FR17: keyword search, complemented by smart (semantic) search
router.get('/', async (req, res) => {
  try {
    const { q, mode = 'keyword', limit } = req.query;
    if (!q) return res.status(400).json({ error: 'Query parameter "q" is required.' });

    const strategy = mode === 'smart' ? SmartSearchStrategy : KeywordSearchStrategy;
    const results = await strategy.search(q, { limit: limit ? Number(limit) : 20 });

    res.json({ mode: strategy.name, results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Search failed.' });
  }
});

module.exports = router;

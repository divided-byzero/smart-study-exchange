/**
 * Open/Closed Principle (Section 3.2 of the SDD): ISearchService is implemented
 * behind a SearchStrategy abstraction. Adding a new strategy (e.g. image-based
 * search) means adding a new class here, not modifying SearchService.
 */
const { query } = require('../config/db');
const aiProvider = require('./aiProvider');

const KeywordSearchStrategy = {
  name: 'keyword',
  async search(q, { limit = 20 } = {}) {
    const { rows } = await query(
      `SELECT id, title, course_code, department, semester, summary, source_type, created_at
       FROM notes
       WHERE to_tsvector('english', coalesce(title,'') || ' ' || coalesce(course_code,'') || ' ' || coalesce(summary,''))
             @@ plainto_tsquery('english', $1)
       ORDER BY created_at DESC
       LIMIT $2`,
      [q, limit]
    );
    return rows;
  },
};

const SmartSearchStrategy = {
  name: 'smart',
  async search(q, { limit = 20 } = {}) {
    try {
      const embedding = await aiProvider.generateEmbedding(q);
      const vectorLiteral = `[${embedding.join(',')}]`;
      const { rows } = await query(
        `SELECT id, title, course_code, department, semester, summary, source_type, created_at,
                1 - (embedding <=> $1) AS similarity
         FROM notes
         WHERE embedding IS NOT NULL
         ORDER BY embedding <=> $1
         LIMIT $2`,
        [vectorLiteral, limit]
      );
      return rows;
    } catch (err) {
      // Graceful degradation: no embeddings configured/available -> fall back to keyword search.
      console.warn('Smart search fell back to keyword search:', err.message);
      return KeywordSearchStrategy.search(q, { limit });
    }
  },
};

module.exports = { KeywordSearchStrategy, SmartSearchStrategy };

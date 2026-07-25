require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('./db');

async function migrate() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  let sql = fs.readFileSync(schemaPath, 'utf8');

  console.log('Running migrations against', process.env.DATABASE_URL ? 'DATABASE_URL' : 'no DATABASE_URL set!');

  try {
    await pool.query(sql);
    console.log('✅ Migration complete: full schema (with pgvector) applied.');
  } catch (err) {
    if (/vector/i.test(err.message)) {
      console.warn('⚠️  pgvector extension unavailable on this Postgres instance.');
      console.warn('    Falling back to schema without vector embeddings (smart search will use keyword fallback).');
      sql = sql
        .replace(/CREATE EXTENSION IF NOT EXISTS vector;.*\n/i, '')
        .replace(/embedding\s+vector\(1536\),?\n?/i, '')
        .replace(/CREATE INDEX IF NOT EXISTS idx_notes_embedding[\s\S]*?;\n/i, '');
      await pool.query(sql);
      console.log('✅ Migration complete: schema applied without pgvector.');
    } else {
      throw err;
    }
  } finally {
    await pool.end();
  }
}

migrate().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});

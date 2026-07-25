require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool } = require('./db');

async function seed() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@ewu.edu.bd';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'ChangeMe123!';
  const hash = await bcrypt.hash(adminPassword, 10);

  await pool.query(
    `INSERT INTO users (full_name, email, password_hash, role, is_verified)
     VALUES ($1, $2, $3, 'admin', TRUE)
     ON CONFLICT (email) DO NOTHING`,
    ['Platform Admin', adminEmail, hash]
  );

  console.log(`✅ Seed complete. Admin login: ${adminEmail} / ${adminPassword}`);
  console.log('   Change this password after first login in production.');
  await pool.end();
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});

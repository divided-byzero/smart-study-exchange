const { verifyToken } = require('../utils/jwt');
const { query } = require('../config/db');

async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    const decoded = verifyToken(token);
    const { rows } = await query(
      'SELECT id, full_name, email, role, is_verified, is_banned, avatar_url FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (!rows[0]) {
      return res.status(401).json({ error: 'User no longer exists.' });
    }
    if (rows[0].is_banned) {
      return res.status(403).json({ error: 'This account has been suspended.' });
    }

    req.user = rows[0];
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

function requireVerified(req, res, next) {
  if (!req.user.is_verified) {
    return res.status(403).json({ error: 'Please verify your email first.' });
  }
  next();
}

function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required.' });
  }
  next();
}

module.exports = { requireAuth, requireVerified, requireAdmin };

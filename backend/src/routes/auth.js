const express = require('express');
const bcrypt = require('bcryptjs');
const { query } = require('../config/db');
const { signToken } = require('../utils/jwt');
const { generateOtp, sendOtpEmail } = require('../utils/mailer');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const EWU_EMAIL_SUFFIX = process.env.REQUIRE_EWU_EMAIL === 'true' ? '@ewubd.edu' : null;

// FR1: University email registration
router.post('/register', async (req, res) => {
  try {
    const { fullName, email, password, department, studentId } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({ error: 'fullName, email, and password are required.' });
    }
    if (EWU_EMAIL_SUFFIX && !email.endsWith(EWU_EMAIL_SUFFIX)) {
      return res.status(400).json({ error: `Please register with your university email (${EWU_EMAIL_SUFFIX}).` });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }

    const existing = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing.rows[0]) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const otp = generateOtp();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const { rows } = await query(
      `INSERT INTO users (full_name, email, password_hash, department, student_id, otp_code, otp_expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, full_name, email, role, is_verified`,
      [fullName, email.toLowerCase(), passwordHash, department || null, studentId || null, otp, otpExpiresAt]
    );

    await sendOtpEmail(email, otp);

    res.status(201).json({
      message: 'Registered. Please check your email for a verification code.',
      user: rows[0],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Registration failed.' });
  }
});

// FR3: mandatory email verification
router.post('/verify-email', async (req, res) => {
  try {
    const { email, otp } = req.body;
    const { rows } = await query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    const user = rows[0];

    if (!user) return res.status(404).json({ error: 'User not found.' });
    if (user.is_verified) return res.status(400).json({ error: 'Email already verified.' });
    if (user.otp_code !== otp || new Date(user.otp_expires_at) < new Date()) {
      return res.status(400).json({ error: 'Invalid or expired verification code.' });
    }

    await query(
      'UPDATE users SET is_verified = TRUE, otp_code = NULL, otp_expires_at = NULL WHERE id = $1',
      [user.id]
    );

    const token = signToken({ userId: user.id });
    res.json({
      message: 'Email verified successfully.',
      token,
      user: { id: user.id, fullName: user.full_name, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Verification failed.' });
  }
});

router.post('/resend-otp', async (req, res) => {
  try {
    const { email } = req.body;
    const { rows } = await query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    const user = rows[0];
    if (!user) return res.status(404).json({ error: 'User not found.' });
    if (user.is_verified) return res.status(400).json({ error: 'Email already verified.' });

    const otp = generateOtp();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await query('UPDATE users SET otp_code = $1, otp_expires_at = $2 WHERE id = $3', [otp, otpExpiresAt, user.id]);
    await sendOtpEmail(email, otp);

    res.json({ message: 'A new verification code has been sent.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not resend code.' });
  }
});

// FR2: secure login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const { rows } = await query('SELECT * FROM users WHERE email = $1', [(email || '').toLowerCase()]);
    const user = rows[0];

    if (!user) return res.status(401).json({ error: 'Invalid email or password.' });
    if (user.is_banned) return res.status(403).json({ error: 'This account has been suspended.' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid email or password.' });

    if (!user.is_verified) {
      return res.status(403).json({ error: 'Please verify your email before logging in.', needsVerification: true });
    }

    const token = signToken({ userId: user.id });
    res.json({
      token,
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        role: user.role,
        department: user.department,
        avatarUrl: user.avatar_url,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed.' });
  }
});

router.get('/me', requireAuth, async (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;

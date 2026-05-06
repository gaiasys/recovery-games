const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { authenticate } = require('../middleware/authenticate');

const router = express.Router();

// Pre-computed dummy hash — used when username is not found to prevent
// timing-based username enumeration (always run bcrypt.compare regardless).
const DUMMY_HASH = bcrypt.hashSync('00000000', 10);

function setCookie(res, token) {
  res.cookie(process.env.COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 12 * 60 * 60 * 1000,
    path: '/',
  });
}

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, pin } = req.body || {};

    if (
      typeof username !== 'string' ||
      !username.trim() ||
      typeof pin !== 'string' ||
      !/^\d{4}$/.test(pin)
    ) {
      return res.status(400).json({ error: 'Invalid request format.' });
    }

    const { rows } = await db.query(
      'SELECT id, username, pin_hash, role, is_active FROM users WHERE LOWER(username) = LOWER($1)',
      [username.trim()]
    );

    const user = rows[0] || null;
    const hashToCompare = user ? user.pin_hash : DUMMY_HASH;

    const match = await bcrypt.compare(pin, hashToCompare);

    if (!user || !match || !user.is_active) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    // Update last_login timestamp
    await db.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);

    const token = jwt.sign(
      { sub: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    setCookie(res, token);

    res.json({ id: user.id, username: user.username, role: user.role });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// GET /api/auth/me — verify current session
router.get('/me', authenticate, (req, res) => {
  res.json({
    id: req.user.sub,
    username: req.user.username,
    role: req.user.role,
  });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie(process.env.COOKIE_NAME, { path: '/' });
  res.json({ ok: true });
});

module.exports = router;

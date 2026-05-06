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

    // Create a session row; its UUID becomes the JWT jti claim
    const { rows: sessionRows } = await db.query(
      `INSERT INTO sessions (user_id) VALUES ($1) RETURNING id`,
      [user.id]
    );
    const sessionId = sessionRows[0].id;

    // Update last_login and backfill jwt_jti once we have the token
    const token = jwt.sign(
      { sub: user.id, username: user.username, role: user.role, jti: sessionId },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    await db.query(
      'UPDATE users SET last_login = NOW() WHERE id = $1',
      [user.id]
    );

    await db.query(
      'UPDATE sessions SET jwt_jti = $1 WHERE id = $2',
      [sessionId, sessionId]
    );

    setCookie(res, token);

    res.json({ id: user.id, username: user.username, role: user.role, sessionId });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// GET /api/auth/me — verify current session and check user is still active
router.get('/me', authenticate, async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT id, username, role, is_active FROM users WHERE id = $1',
      [req.user.sub]
    );

    const user = rows[0];
    if (!user || !user.is_active) {
      res.clearCookie(process.env.COOKIE_NAME, { path: '/' });
      return res.status(401).json({ error: 'Account inactive.' });
    }

    res.json({ id: user.id, username: user.username, role: user.role });
  } catch (err) {
    console.error('/me error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// POST /api/auth/logout
router.post('/logout', async (req, res) => {
  try {
    const token = req.cookies?.[process.env.COOKIE_NAME];
    if (token) {
      const decoded = jwt.decode(token);
      if (decoded?.jti) {
        await db.query(
          `UPDATE sessions
           SET session_end = NOW(), completion_status = 'abandoned', exit_type = 'logout'
           WHERE id = $1`,
          [decoded.jti]
        );
      }
    }
  } catch {
    // Non-fatal — always clear the cookie regardless
  }

  res.clearCookie(process.env.COOKIE_NAME, { path: '/' });
  res.json({ ok: true });
});

module.exports = router;

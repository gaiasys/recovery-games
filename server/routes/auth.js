const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { authenticate } = require('../middleware/authenticate');

const router = express.Router();

function setCookie(res, token) {
  res.cookie(process.env.COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 12 * 60 * 60 * 1000,
    path: '/',
  });
}

async function createSessionAndToken(userId, username, role) {
  const { rows } = await db.query(
    'INSERT INTO sessions (user_id) VALUES ($1) RETURNING id',
    [userId]
  );
  const sessionId = rows[0].id;

  const token = jwt.sign(
    { sub: userId, username, role, jti: sessionId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );

  await db.query('UPDATE sessions SET jwt_jti = $1 WHERE id = $2', [sessionId, sessionId]);

  return { token, sessionId };
}

// POST /api/auth/login
// Flow:
//   user not found   → register (create account) + auto-login
//   user found, PIN correct → login
//   user found, PIN wrong   → 401 "Invalid credentials / UserId already taken"
router.post('/login', async (req, res) => {
  try {
    const { userId, pin } = req.body || {};

    if (
      typeof userId !== 'string' ||
      !userId.trim() ||
      typeof pin !== 'string' ||
      !/^\d{4}$/.test(pin)
    ) {
      return res.status(400).json({ error: 'Invalid request format.' });
    }

    const cleanUserId = userId.trim();

    const { rows } = await db.query(
      'SELECT id, username, pin_hash, role, is_active FROM users WHERE LOWER(username) = LOWER($1)',
      [cleanUserId]
    );

    const existing = rows[0] || null;

    // ── New user: register + auto-login ──────────────────────────────────────
    if (!existing) {
      const pin_hash = await bcrypt.hash(pin, 12);

      const { rows: created } = await db.query(
        `INSERT INTO users (username, pin_hash, role)
         VALUES ($1, $2, 'player')
         RETURNING id, username, role`,
        [cleanUserId, pin_hash]
      );

      const user = created[0];
      const { token, sessionId } = await createSessionAndToken(user.id, user.username, user.role);

      setCookie(res, token);
      return res.status(201).json({ id: user.id, username: user.username, role: user.role, sessionId, created: true });
    }

    // ── Existing user: verify PIN ─────────────────────────────────────────────
    const match = await bcrypt.compare(pin, existing.pin_hash);

    if (!match || !existing.is_active) {
      return res.status(401).json({ error: 'Invalid credentials / UserId already taken.' });
    }

    await db.query('UPDATE users SET last_login = NOW() WHERE id = $1', [existing.id]);

    const { token, sessionId } = await createSessionAndToken(existing.id, existing.username, existing.role);

    setCookie(res, token);
    res.json({ id: existing.id, username: existing.username, role: existing.role, sessionId, created: false });

  } catch (err) {
    if (err.code === '23505') {
      // Unique constraint race — two registrations for the same username at the same instant
      return res.status(401).json({ error: 'Invalid credentials / UserId already taken.' });
    }
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

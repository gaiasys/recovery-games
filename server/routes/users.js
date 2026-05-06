const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../db');
const { authenticate, requireAdmin } = require('../middleware/authenticate');

const router = express.Router();

router.use(authenticate, requireAdmin);

// POST /api/users — create a user
router.post('/', async (req, res) => {
  try {
    const { username, pin, role = 'player' } = req.body || {};

    if (
      typeof username !== 'string' ||
      !/^[a-zA-Z0-9_]{1,64}$/.test(username.trim())
    ) {
      return res.status(400).json({ error: 'Username must be 1–64 alphanumeric/underscore characters.' });
    }

    if (typeof pin !== 'string' || !/^\d{4}$/.test(pin)) {
      return res.status(400).json({ error: 'PIN must be exactly 4 digits.' });
    }

    if (!['player', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Role must be "player" or "admin".' });
    }

    const pin_hash = await bcrypt.hash(pin, 12);

    const { rows } = await db.query(
      `INSERT INTO users (username, pin_hash, role)
       VALUES ($1, $2, $3)
       RETURNING id, username, role, is_active, created_at`,
      [username.trim(), pin_hash, role]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Username already taken.' });
    }
    console.error('Create user error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// GET /api/users — list all users
router.get('/', async (_req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT id, username, role, is_active, created_at, last_login FROM users ORDER BY created_at DESC'
    );
    res.json(rows);
  } catch (err) {
    console.error('List users error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// PATCH /api/users/:id — update role or active status
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active, role } = req.body || {};
    const updates = [];
    const params = [];

    if (typeof is_active === 'boolean') {
      params.push(is_active);
      updates.push(`is_active = $${params.length}`);
    }

    if (role !== undefined) {
      if (!['player', 'admin'].includes(role)) {
        return res.status(400).json({ error: 'Role must be "player" or "admin".' });
      }
      params.push(role);
      updates.push(`role = $${params.length}`);
    }

    if (!updates.length) {
      return res.status(400).json({ error: 'No valid fields to update.' });
    }

    params.push(id);
    const { rows } = await db.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${params.length}
       RETURNING id, username, role, is_active`,
      params
    );

    if (!rows.length) return res.status(404).json({ error: 'User not found.' });

    res.json(rows[0]);
  } catch (err) {
    console.error('Update user error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;

require('dotenv').config();
const bcrypt = require('bcrypt');
const db = require('./db');

async function seed() {
  const hash = await bcrypt.hash('1234', 12);
  const { rows } = await db.query(
    `INSERT INTO users (username, pin_hash, role)
     VALUES ($1, $2, 'admin')
     ON CONFLICT DO NOTHING
     RETURNING username, role`,
    ['admin', hash]
  );

  if (rows.length) {
    console.log(`Seeded: ${rows[0].username} (${rows[0].role}) — PIN: 1234`);
  } else {
    console.log('Admin user already exists, skipping.');
  }

  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});

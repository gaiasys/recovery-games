require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const { loginLimiter } = require('./middleware/rateLimit');

const app = express();

app.use(express.json({ limit: '16kb' }));
app.use(cookieParser());

// Rate limit only the login endpoint
app.use('/api/auth/login', loginLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

// Serve frontend from client/
app.use(express.static(path.join(__dirname, '../client')));

// Catch-all: serve login.html for any unmatched route
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '../client/login.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

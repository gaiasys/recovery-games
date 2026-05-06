require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const { loginLimiter } = require('./middleware/rateLimit');
const { requestLogger } = require('./middleware/logger');

const app = express();

// JSON body must be parsed before logger so req.body is available
app.use(express.json({ limit: '16kb' }));
app.use(cookieParser());

// Request logger — registered after body parsing, before routes
app.use(requestLogger);

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

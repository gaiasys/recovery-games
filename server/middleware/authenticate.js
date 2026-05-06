const jwt = require('jsonwebtoken');

function authenticate(req, res, next) {
  const token = req.cookies?.[process.env.COOKIE_NAME];

  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res
      .clearCookie(process.env.COOKIE_NAME)
      .status(401)
      .json({ error: 'Session expired' });
  }
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}

module.exports = { authenticate, requireAdmin };

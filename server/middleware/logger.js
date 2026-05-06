const SENSITIVE_KEYS = new Set(['pin', 'password', 'token', 'secret', 'authorization']);

function maskSensitive(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k] = SENSITIVE_KEYS.has(k.toLowerCase()) ? '****' : v;
  }
  return out;
}

function formatBody(body) {
  if (!body || !Object.keys(body).length) return null;
  return JSON.stringify(maskSensitive(body));
}

function formatQuery(query) {
  if (!query || !Object.keys(query).length) return null;
  return JSON.stringify(maskSensitive(query));
}

function pad(n, width) {
  return String(n).padStart(width, ' ');
}

function statusColor(status) {
  if (status >= 500) return '\x1b[31m'; // red
  if (status >= 400) return '\x1b[33m'; // yellow
  if (status >= 300) return '\x1b[36m'; // cyan
  return '\x1b[32m';                    // green
}

const RESET = '\x1b[0m';
const DIM   = '\x1b[2m';
const BOLD  = '\x1b[1m';

function requestLogger(req, res, next) {
  const startedAt = Date.now();
  const isApi = req.path.startsWith('/api');

  res.on('finish', () => {
    const ms     = Date.now() - startedAt;
    const status = res.statusCode;
    const color  = process.stdout.isTTY ? statusColor(status) : '';
    const reset  = process.stdout.isTTY ? RESET : '';
    const dim    = process.stdout.isTTY ? DIM   : '';
    const bold   = process.stdout.isTTY ? BOLD  : '';

    const ts     = new Date().toISOString();
    const method = req.method.padEnd(6);
    const url    = req.originalUrl;
    const ip     = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').replace('::ffff:', '').replace('::1', 'localhost');

    const parts = [
      `${dim}${ts}${reset}`,
      `${bold}${method}${reset}`,
      url,
      `${color}${pad(status, 3)}${reset}`,
      `${pad(ms, 5)}ms`,
      `${dim}[${ip}]${reset}`,
    ];

    if (isApi) {
      const body  = formatBody(req.body);
      const query = formatQuery(req.query);
      if (query) parts.push(`query:${query}`);
      if (body)  parts.push(`body:${body}`);
    }

    console.log(parts.join('  '));
  });

  next();
}

module.exports = { requestLogger };

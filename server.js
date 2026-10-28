const express = require('express');
const { Pool } = require('pg');
const crypto = require('crypto');
const path = require('path');

const PORT = parseInt(process.env.PORT, 10) || 3000;
const HOST = '0.0.0.0';

const STAFF_USERNAME = process.env.STAFF_USERNAME || 'staff';
const STAFF_PASSWORD = process.env.STAFF_PASSWORD || 'Staff@123';
const TOKEN_SECRET = process.env.TOKEN_SECRET || 'local-dev-secret-change-me';

const ALLOWED_CATEGORIES = [
  'Classroom / Equipment',
  'IT & Wi-Fi',
  'Library',
  'Hostel & Facilities',
  'Transport',
  'Administration',
  'Other'
];

const ALLOWED_STATUSES = ['Open', 'In Progress', 'Resolved', 'Closed'];

// Database pool configuration
let poolConfig;
if (process.env.DATABASE_URL) {
  poolConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
  };
} else {
  poolConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    user: process.env.DB_USER || 'campus',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'campuscare'
  };
}

const pool = new Pool(poolConfig);

// In-memory rate limiter
const rateLimitStores = {
  login: new Map(),
  complaint: new Map()
};

function rateLimiter(storeName, maxRequests, windowMs) {
  const store = rateLimitStores[storeName];
  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    const timestamps = (store.get(ip) || []).filter(t => now - t < windowMs);

    if (timestamps.length >= maxRequests) {
      return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }

    timestamps.push(now);
    store.set(ip, timestamps);
    next();
  };
}

// Clean up stale rate limit entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const store of Object.values(rateLimitStores)) {
    for (const [ip, timestamps] of store.entries()) {
      const active = timestamps.filter(t => now - t < 3600000);
      if (active.length === 0) {
        store.delete(ip);
      } else {
        store.set(ip, active);
      }
    }
  }
}, 10 * 60 * 1000).unref();

// Constant-time string comparison
function constantTimeCompare(a, b) {
  const hashA = crypto.createHash('sha256').update(String(a || '')).digest();
  const hashB = crypto.createHash('sha256').update(String(b || '')).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

// Token creation and verification
function createToken(username) {
  const payload = {
    u: username,
    exp: Date.now() + 8 * 60 * 60 * 1000
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', TOKEN_SECRET).update(payloadB64).digest('base64url');
  return `${payloadB64}.${signature}`;
}

function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payloadB64, signature] = parts;

  const expectedSignature = crypto.createHmac('sha256', TOKEN_SECRET).update(payloadB64).digest('base64url');
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expectedSignature);

  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    if (!payload.exp || Date.now() > payload.exp) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

// Staff authentication middleware
function staffOnly(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const [scheme, token] = authHeader.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  req.staff = payload;
  next();
}

const app = express();
app.set('trust proxy', 1);

// Security headers
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'"
  );
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Frame-Options', 'DENY');
  next();
});

app.use(express.json({ limit: '20kb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Health and readiness endpoints
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.get('/ready', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.status(200).json({ status: 'ready' });
  } catch {
    res.status(503).json({ status: 'not ready' });
  }
});

// POST /api/complaints
app.post(
  '/api/complaints',
  rateLimiter('complaint', 20, 60 * 60 * 1000),
  async (req, res, next) => {
    try {
      const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
      const email = typeof req.body.email === 'string' ? req.body.email.trim() : '';
      const department = typeof req.body.department === 'string' ? req.body.department.trim() : '';
      const category = typeof req.body.category === 'string' ? req.body.category.trim() : '';
      const title = typeof req.body.title === 'string' ? req.body.title.trim() : '';
      const description = typeof req.body.description === 'string' ? req.body.description.trim() : '';

      if (name.length < 2 || name.length > 80) {
        return res.status(400).json({ error: 'Name must be between 2 and 80 characters.' });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Please enter a valid email address.' });
      }

      if (department.length > 80) {
        return res.status(400).json({ error: 'Department cannot exceed 80 characters.' });
      }

      if (!ALLOWED_CATEGORIES.includes(category)) {
        return res.status(400).json({ error: 'Selected category is not recognized.' });
      }

      if (title.length < 5 || title.length > 120) {
        return res.status(400).json({ error: 'Title must be between 5 and 120 characters.' });
      }

      if (description.length < 10 || description.length > 2000) {
        return res.status(400).json({ error: 'Description must be between 10 and 2000 characters.' });
      }

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        const insertQuery = `
          INSERT INTO complaints (student_name, student_email, department, category, title, description, status, staff_note)
          VALUES ($1, $2, $3, $4, $5, $6, 'Open', '')
          RETURNING id
        `;
        const insertRes = await client.query(insertQuery, [name, email, department, category, title, description]);
        const id = insertRes.rows[0].id;
        const ref = `CH-${String(id).padStart(4, '0')}`;

        await client.query('UPDATE complaints SET ref = $1 WHERE id = $2', [ref, id]);
        await client.query('INSERT INTO status_history (complaint_id, status) VALUES ($1, $2)', [id, 'Open']);

        await client.query('COMMIT');
        return res.status(201).json({ ref, status: 'Open' });
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/complaints/:ref (public)
app.get('/api/complaints/:ref', async (req, res, next) => {
  try {
    const rawRef = req.params.ref;
    const refRegex = /^CH-\d{4,}$/i;
    if (!refRegex.test(rawRef)) {
      return res.status(400).json({ error: 'Invalid reference' });
    }

    const complaintQuery = `
      SELECT id, ref, title, category, status, created_at, updated_at
      FROM complaints
      WHERE UPPER(ref) = UPPER($1)
    `;
    const complaintRes = await pool.query(complaintQuery, [rawRef]);

    if (complaintRes.rows.length === 0) {
      return res.status(404).json({ error: 'Complaint not found' });
    }

    const complaint = complaintRes.rows[0];

    const historyQuery = `
      SELECT status, changed_at
      FROM status_history
      WHERE complaint_id = $1
      ORDER BY changed_at ASC, id ASC
    `;
    const historyRes = await pool.query(historyQuery, [complaint.id]);

    return res.status(200).json({
      ref: complaint.ref,
      title: complaint.title,
      category: complaint.category,
      status: complaint.status,
      created_at: complaint.created_at,
      updated_at: complaint.updated_at,
      history: historyRes.rows
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/staff/login
app.post(
  '/api/staff/login',
  rateLimiter('login', 10, 15 * 60 * 1000),
  (req, res) => {
    const username = typeof req.body.username === 'string' ? req.body.username : '';
    const password = typeof req.body.password === 'string' ? req.body.password : '';

    const userMatches = constantTimeCompare(username, STAFF_USERNAME);
    const passMatches = constantTimeCompare(password, STAFF_PASSWORD);

    if (!userMatches || !passMatches) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const token = createToken(username);
    return res.status(200).json({ token });
  }
);

// GET /api/staff/stats
app.get('/api/staff/stats', staffOnly, async (req, res, next) => {
  try {
    const query = `
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'Open')::int AS open,
        COUNT(*) FILTER (WHERE status = 'In Progress')::int AS in_progress,
        COUNT(*) FILTER (WHERE status = 'Resolved')::int AS resolved,
        COUNT(*) FILTER (WHERE status = 'Closed')::int AS closed
      FROM complaints
    `;
    const result = await pool.query(query);
    const stats = result.rows[0] || { total: 0, open: 0, in_progress: 0, resolved: 0, closed: 0 };
    return res.status(200).json(stats);
  } catch (err) {
    next(err);
  }
});

// GET /api/staff/complaints
app.get('/api/staff/complaints', staffOnly, async (req, res, next) => {
  try {
    const { q, status, category } = req.query;
    const conditions = [];
    const values = [];

    if (typeof q === 'string' && q.trim().length > 0) {
      values.push(`%${q.trim()}%`);
      const idx = values.length;
      conditions.push(`(ref ILIKE $${idx} OR title ILIKE $${idx} OR category ILIKE $${idx})`);
    }

    if (typeof status === 'string' && status.trim().length > 0 && ALLOWED_STATUSES.includes(status.trim())) {
      values.push(status.trim());
      conditions.push(`status = $${values.length}`);
    }

    if (typeof category === 'string' && category.trim().length > 0 && ALLOWED_CATEGORIES.includes(category.trim())) {
      values.push(category.trim());
      conditions.push(`category = $${values.length}`);
    }

    let query = 'SELECT * FROM complaints';
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }
    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, values);
    return res.status(200).json(result.rows);
  } catch (err) {
    next(err);
  }
});

// GET /api/staff/complaints/:ref
app.get('/api/staff/complaints/:ref', staffOnly, async (req, res, next) => {
  try {
    const rawRef = req.params.ref;
    const complaintQuery = 'SELECT * FROM complaints WHERE UPPER(ref) = UPPER($1)';
    const complaintRes = await pool.query(complaintQuery, [rawRef]);

    if (complaintRes.rows.length === 0) {
      return res.status(404).json({ error: 'Complaint not found' });
    }

    const complaint = complaintRes.rows[0];
    const historyQuery = `
      SELECT status, changed_at
      FROM status_history
      WHERE complaint_id = $1
      ORDER BY changed_at ASC, id ASC
    `;
    const historyRes = await pool.query(historyQuery, [complaint.id]);

    return res.status(200).json({
      ...complaint,
      history: historyRes.rows
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/staff/complaints/:ref
app.patch('/api/staff/complaints/:ref', staffOnly, async (req, res, next) => {
  try {
    const rawRef = req.params.ref;
    const { status, note } = req.body;

    if (status !== undefined && !ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const selectQuery = 'SELECT * FROM complaints WHERE UPPER(ref) = UPPER($1) FOR UPDATE';
      const selectRes = await client.query(selectQuery, [rawRef]);

      if (selectRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Complaint not found' });
      }

      const existing = selectRes.rows[0];
      const newStatus = status !== undefined ? status : existing.status;
      const newNote = note !== undefined ? String(note).trim() : existing.staff_note;
      const statusChanged = status !== undefined && status !== existing.status;

      const updateQuery = `
        UPDATE complaints
        SET status = $1, staff_note = $2, updated_at = now()
        WHERE id = $3
        RETURNING *
      `;
      const updateRes = await client.query(updateQuery, [newStatus, newNote, existing.id]);

      if (statusChanged) {
        await client.query('INSERT INTO status_history (complaint_id, status) VALUES ($1, $2)', [existing.id, newStatus]);
      }

      await client.query('COMMIT');
      return res.status(200).json(updateRes.rows[0]);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
});

// Unknown /api route 404 handler
app.all('/api/*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Global error handler (no stack trace leaks)
app.use((err, req, res, next) => {
  res.status(500).json({ error: 'Internal server error' });
});

// Automatic database initialization with retry
async function initDatabase() {
  const maxRetries = 30;
  const delayMs = 2000;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const client = await pool.connect();
      try {
        await client.query(`
          CREATE TABLE IF NOT EXISTS complaints (
            id SERIAL PRIMARY KEY,
            ref TEXT UNIQUE,
            student_name TEXT NOT NULL,
            student_email TEXT NOT NULL,
            department TEXT DEFAULT '',
            category TEXT NOT NULL,
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'Open',
            staff_note TEXT DEFAULT '',
            created_at TIMESTAMPTZ DEFAULT now(),
            updated_at TIMESTAMPTZ DEFAULT now()
          );

          CREATE TABLE IF NOT EXISTS status_history (
            id SERIAL PRIMARY KEY,
            complaint_id INTEGER REFERENCES complaints(id) ON DELETE CASCADE,
            status TEXT NOT NULL,
            changed_at TIMESTAMPTZ DEFAULT now()
          );
        `);
        client.release();
        return;
      } catch (err) {
        client.release();
        throw err;
      }
    } catch (err) {
      if (attempt === maxRetries) {
        throw err;
      }
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
}

let server;

initDatabase()
  .then(() => {
    server = app.listen(PORT, HOST, () => {
      // Running
    });
  })
  .catch((err) => {
    console.error('CampusCare startup failed:', err);
    process.exit(1);
  });

function gracefulShutdown() {
  if (server) {
    server.close(() => {
      pool.end(() => {
        process.exit(0);
      });
    });
  } else {
    pool.end(() => {
      process.exit(0);
    });
  }
}

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

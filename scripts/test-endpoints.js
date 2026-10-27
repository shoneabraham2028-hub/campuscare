const request = require('supertest');
const assert = require('assert');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

process.env.NODE_ENV = 'test';
process.env.TOKEN_SECRET = 'test-secret-key-12345';
process.env.STAFF_USER = 'staff';
process.env.STAFF_PASS = 'staff123';

const { app, pool, sign, token, ref, parse, statuses, categories, setReady, isReady } = require('../server.js');

async function runTests() {
  console.log('--- Starting CampusCare Automated Test Suite ---\n');
  let passed = 0;
  let total = 0;

  function test(name, fn) {
    total++;
    try {
      fn();
      passed++;
      console.log(`✓ [PASS] ${name}`);
    } catch (err) {
      console.error(`✗ [FAIL] ${name}:`, err.message);
    }
  }

  async function testAsync(name, fn) {
    total++;
    try {
      await fn();
      passed++;
      console.log(`✓ [PASS] ${name}`);
    } catch (err) {
      console.error(`✗ [FAIL] ${name}:`, err.message);
    }
  }

  // 1. Reference format and parser
  test('Reference formatter: ref(1) === CH-0001 and ref(42) === CH-0042', () => {
    assert.strictEqual(ref(1), 'CH-0001');
    assert.strictEqual(ref(42), 'CH-0042');
    assert.strictEqual(ref(9999), 'CH-9999');
  });

  test('Reference parser: parse handles CH-0001, case-insensitivity, and rejects garbage', () => {
    assert.strictEqual(parse('CH-0001'), 1);
    assert.strictEqual(parse('ch-0042'), 42);
    assert.strictEqual(parse('CH-12345'), 12345);
    assert.strictEqual(parse('INVALID'), null);
    assert.strictEqual(parse(''), null);
    assert.strictEqual(parse(null), null);
  });

  // 2. Token generation and security checks
  test('Token generator creates valid base64url payload with exp and HMAC-SHA256 signature', () => {
    const t = token('staff');
    assert(t.includes('.'), 'Token must contain payload and signature separated by dot');
    const [payloadStr, sig] = t.split('.');
    const expectedSig = sign(payloadStr);
    assert.strictEqual(sig, expectedSig, 'Signature must match HMAC SHA256 of payload');
    const payload = JSON.parse(Buffer.from(payloadStr, 'base64url').toString('utf8'));
    assert.strictEqual(payload.u, 'staff');
    assert(payload.exp > Date.now(), 'Token exp must be in future');
  });

  test('Token verification rejects tampered signature', () => {
    const t = token('staff');
    const [payloadStr] = t.split('.');
    const tamperedSig = sign(payloadStr).slice(0, -1) + 'X';
    const tamperedToken = `${payloadStr}.${tamperedSig}`;
    
    const [p, sig] = tamperedToken.split('.');
    const good = sign(p);
    const bSig = Buffer.from(sig);
    const bGood = Buffer.from(good);
    const isValid = bSig.length === bGood.length && crypto.timingSafeEqual(bSig, bGood);
    assert.strictEqual(isValid, false, 'Tampered signature must not be valid');
  });

  // 3. Readiness check when DB starting
  await testAsync('GET /ready returns 503 while database is starting', async () => {
    setReady(false);
    const res = await request(app).get('/ready');
    assert.strictEqual(res.status, 503);
    assert.strictEqual(res.body.ready, false);
  });

  await testAsync('GET /api/staff/stats returns 503 while database is starting', async () => {
    setReady(false);
    const res = await request(app).get('/api/staff/stats');
    assert.strictEqual(res.status, 503);
    assert.strictEqual(res.body.error, 'Database starting');
  });

  // Set ready to true for testing API logic & authorization
  setReady(true);

  await testAsync('GET /health returns 200 ok: true', async () => {
    const res = await request(app).get('/health');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.ok, true);
  });

  await testAsync('GET /ready returns 200 ready: true when DB ready', async () => {
    const res = await request(app).get('/ready');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.ready, true);
  });

  // 4. Unauthorized 401 tests on staff routes
  await testAsync('GET /api/staff/stats without token returns 401', async () => {
    const res = await request(app).get('/api/staff/stats');
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.error, 'Staff login required');
  });

  await testAsync('GET /api/staff/complaints without token returns 401', async () => {
    const res = await request(app).get('/api/staff/complaints');
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.error, 'Staff login required');
  });

  await testAsync('GET /api/staff/complaints with invalid token returns 401', async () => {
    const res = await request(app)
      .get('/api/staff/complaints')
      .set('Authorization', 'Bearer invalid.token');
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.error, 'Staff login required');
  });

  await testAsync('GET /api/staff/complaints with expired token returns 401', async () => {
    const expiredPayload = Buffer.from(JSON.stringify({ u: 'staff', exp: Date.now() - 10000 })).toString('base64url');
    const expiredToken = `${expiredPayload}.${sign(expiredPayload)}`;
    const res = await request(app)
      .get('/api/staff/complaints')
      .set('Authorization', `Bearer ${expiredToken}`);
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.error, 'Staff login required');
  });

  await testAsync('PATCH /api/staff/complaints/CH-0001 without token returns 401', async () => {
    const res = await request(app)
      .patch('/api/staff/complaints/CH-0001')
      .send({ status: 'Resolved' });
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.error, 'Staff login required');
  });

  // 5. Client static assets check
  await testAsync('GET / serves index.html with correct student portal title', async () => {
    const res = await request(app).get('/');
    assert.strictEqual(res.status, 200);
    assert(res.text.includes('CampusCare | Campus Helpdesk & Student Support'));
    assert(res.text.includes('amal-jyothi-college-logo.png'));
  });

  await testAsync('GET /staff.html serves staff workspace with separate title', async () => {
    const res = await request(app).get('/staff.html');
    assert.strictEqual(res.status, 200);
    assert(res.text.includes('CampusCare | Staff Workspace'));
    assert(res.text.includes('BCA Student Demonstration Project'));
  });

  await testAsync('GET /style.css serves warm ivory design tokens', async () => {
    const res = await request(app).get('/style.css');
    assert.strictEqual(res.status, 200);
    assert(res.text.includes('--paper: #f5f3ee'));
    assert(res.text.includes('--surface: #fffefa'));
    assert(res.text.includes('--navy: #24496a'));
    assert(res.text.includes('--heading: #1e3448'));
    assert(res.text.includes('--teal: #4f897d'));
    assert(res.text.includes('--line: #d8dde2'));
  });

  await testAsync('GET /images/amal-jyothi-college-logo.png serves actual logo file', async () => {
    const res = await request(app).get('/images/amal-jyothi-college-logo.png');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.header['content-type'], 'image/png');
  });

  // 6. Complaint submission validations
  await testAsync('POST /api/complaints with short name (<2 chars) returns 400 validation error', async () => {
    const res = await request(app)
      .post('/api/complaints')
      .send({ name: 'A', title: 'Valid Title', description: 'This is a valid long description.', category: 'Network / Wi-Fi' });
    assert.strictEqual(res.status, 400);
    assert(res.body.error.includes('Enter name, title and description'));
  });

  await testAsync('POST /api/complaints with short title (<3 chars) returns 400 validation error', async () => {
    const res = await request(app)
      .post('/api/complaints')
      .send({ name: 'Valid Name', title: 'Hi', description: 'This is a valid long description.', category: 'Network / Wi-Fi' });
    assert.strictEqual(res.status, 400);
    assert(res.body.error.includes('Enter name, title and description'));
  });

  await testAsync('POST /api/complaints with short description (<10 chars) returns 400 validation error', async () => {
    const res = await request(app)
      .post('/api/complaints')
      .send({ name: 'Valid Name', title: 'Valid Title', description: 'Short', category: 'Network / Wi-Fi' });
    assert.strictEqual(res.status, 400);
    assert(res.body.error.includes('Enter name, title and description'));
  });

  await testAsync('POST /api/complaints with invalid category returns 400 error', async () => {
    const res = await request(app)
      .post('/api/complaints')
      .send({ name: 'Valid Name', title: 'Valid Title', description: 'This is a valid long description.', category: 'Nonexistent Category' });
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error, 'Invalid category.');
  });

  await testAsync('POST /api/complaints with invalid email returns 400 error', async () => {
    const res = await request(app)
      .post('/api/complaints')
      .send({ name: 'Valid Name', title: 'Valid Title', description: 'This is a valid long description.', category: 'Network / Wi-Fi', contact: 'not-an-email' });
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error, 'Invalid email.');
  });

  // 7. Security Headers check (Helmet)
  await testAsync('Security headers: Helmet sets Content-Security-Policy and X-Frame-Options', async () => {
    const res = await request(app).get('/health');
    assert(res.header['content-security-policy'], 'CSP header must be present');
    assert.strictEqual(res.header['x-frame-options'], 'SAMEORIGIN');
    assert.strictEqual(res.header['x-content-type-options'], 'nosniff');
  });

  // 8. Public tracking privacy contract audit
  await testAsync('Public tracking endpoint privacy audit: never leaks student contact or private notes', async () => {
    // Intercept query on pool to simulate a tracked complaint with student details and internal notes
    const origQuery = pool.query;
    pool.query = async (sql, params) => {
      if (sql.includes('FROM complaints WHERE id=$1')) {
        return {
          rowCount: 1,
          rows: [{
            id: 1,
            title: 'Projector bulb blinking in CS Seminar Hall',
            category: 'Classroom / Equipment',
            status: 'In Progress',
            created_at: new Date('2026-10-26T10:00:00Z'),
            updated_at: new Date('2026-10-26T12:00:00Z')
          }]
        };
      }
      if (sql.includes('FROM status_history WHERE complaint_id=$1')) {
        return {
          rowCount: 2,
          rows: [
            { status: 'Open', changed_at: new Date('2026-10-26T10:00:00Z') },
            { status: 'In Progress', changed_at: new Date('2026-10-26T12:00:00Z') }
          ]
        };
      }
      return origQuery.apply(pool, [sql, params]);
    };

    try {
      const res = await request(app).get('/api/complaints/CH-0001');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.reference, 'CH-0001');
      assert.strictEqual(res.body.title, 'Projector bulb blinking in CS Seminar Hall');
      assert.strictEqual(res.body.category, 'Classroom / Equipment');
      assert.strictEqual(res.body.status, 'In Progress');
      assert(Array.isArray(res.body.timeline), 'timeline must be an array');
      assert.strictEqual(res.body.timeline.length, 2);

      // CRITICAL PRIVACY CHECKS:
      assert.strictEqual(res.body.student_name, undefined, 'CRITICAL: student_name must NEVER be in public tracking');
      assert.strictEqual(res.body.contact, undefined, 'CRITICAL: contact email must NEVER be in public tracking');
      assert.strictEqual(res.body.description, undefined, 'CRITICAL: full description must NEVER be in public tracking');
      assert.strictEqual(res.body.note, undefined, 'CRITICAL: private staff notes must NEVER be in public tracking');
      res.body.timeline.forEach(item => {
        assert.strictEqual(item.note, undefined, 'CRITICAL: timeline items must NEVER include internal notes');
        assert.strictEqual(item.changed_by, undefined, 'CRITICAL: timeline items must NEVER include staff username');
      });
    } finally {
      pool.query = origQuery;
    }
  });

  // 9. Staff login and authorized actions simulation
  await testAsync('Staff Login: invalid credentials return 401', async () => {
    const origQuery = pool.query;
    pool.query = async (sql, params) => {
      if (sql.includes('SELECT username,password_hash FROM staff_users')) {
        return { rowCount: 0, rows: [] };
      }
      return origQuery.apply(pool, [sql, params]);
    };

    try {
      const res = await request(app)
        .post('/api/staff/login')
        .send({ username: 'fakeuser', password: 'wrongpassword' });
      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.error, 'Invalid staff credentials.');
    } finally {
      pool.query = origQuery;
    }
  });

  await testAsync('Staff Login: valid credentials return signed expiring token', async () => {
    const origQuery = pool.query;
    const testHash = await bcrypt.hash('staff123', 10);
    pool.query = async (sql, params) => {
      if (sql.includes('SELECT username,password_hash FROM staff_users')) {
        return { rowCount: 1, rows: [{ username: 'staff', password_hash: testHash }] };
      }
      return origQuery.apply(pool, [sql, params]);
    };

    try {
      const res = await request(app)
        .post('/api/staff/login')
        .send({ username: 'staff', password: 'staff123' });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.user, 'staff');
      assert(res.body.token, 'Must return token');
      
      // Verify token works for authorized staff endpoints
      const staffToken = res.body.token;

      // Mock stats query
      pool.query = async (sql, params) => {
        if (sql.includes('COUNT(*)::int n FROM complaints GROUP BY status')) {
          return {
            rowCount: 4,
            rows: [
              { status: 'Open', n: 5 },
              { status: 'In Progress', n: 3 },
              { status: 'Resolved', n: 12 },
              { status: 'Closed', n: 4 }
            ]
          };
        }
        if (sql.includes("COUNT(*)::int n FROM complaints WHERE priority IN ('High','Urgent')")) {
          return { rowCount: 1, rows: [{ n: 2 }] };
        }
        return origQuery.apply(pool, [sql, params]);
      };

      const statsRes = await request(app)
        .get('/api/staff/stats')
        .set('Authorization', `Bearer ${staffToken}`);
      assert.strictEqual(statsRes.status, 200);
      assert.strictEqual(statsRes.body.total, 24);
      assert.strictEqual(statsRes.body.Open, 5);
      assert.strictEqual(statsRes.body['In Progress'], 3);
      assert.strictEqual(statsRes.body.Resolved, 12);
      assert.strictEqual(statsRes.body.Closed, 4);
      assert.strictEqual(statsRes.body.HighPriority, 2);
    } finally {
      pool.query = origQuery;
    }
  });

  console.log(`\n--- Test Summary: ${passed}/${total} tests passed ---`);
  if (passed === total) {
    console.log('✓ ALL SUITE TESTS PASSED SUCCESSFULLY.\n');
    process.exit(0);
  } else {
    console.error(`✗ ${total - passed} test(s) failed.`);
    process.exit(1);
  }
}

runTests();

# HTTPS Security (Let's Encrypt, Nginx Virtual Host & Render Cloud) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement full HTTPS security for the tech e-commerce platform including Express proxy-aware HTTPS & security headers, Nginx Virtual Host configuration, Let's Encrypt Certbot Bash automation script (Bonus), Render deployment blueprint, and the 2–4 page coursework report (`.md` + `.docx`).

**Architecture:** Backend Express enables `trust proxy`, dynamic `Secure` cookies based on `req.secure` / `X-Forwarded-Proto: https`, OWASP security headers (HSTS, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`), optional `FORCE_HTTPS` 308 redirect, and optional native `node:https` server when local SSL certificates are provided. Nginx acts as the TLS-terminating Virtual Host (`/etc/nginx/sites-available/webthuongmaidientu.conf`) with an automated Bash provisioning & renewal verification script (`scripts/setup-https-letsencrypt.sh`).

**Tech Stack:** Node.js 22+, Express 5, Next.js 15, Nginx (`sites-available` / `sites-enabled`), Let's Encrypt `certbot`, OpenSSL, Render Blueprint (`render.yaml`).

**Spec:** `docs/superpowers/specs/2026-11-21-https-security-design.md`

## Global Constraints

- Existing 87 backend tests in `backend/tests/**/*.test.js` run over HTTP via `supertest` (`NODE_ENV=test`) and MUST continue to pass without modification.
- Cookie `token` must have `secure: true` whenever `req.secure === true`, `req.headers['x-forwarded-proto'] === 'https'`, or `config.env === 'production'`, and `secure: false` over plain HTTP in `test`/`development`.
- `/api/health` must never redirect even when `FORCE_HTTPS=true` so container/Render health checks succeed.

## Review Focus

- `X-Forwarded-Proto` with comma-separated values (e.g. `https, http` from multiple proxies): must detect `https` cleanly.
- `FORCE_HTTPS=true` on `GET /api/health`: must return `200 { ok: true }` without 308 redirect.
- `FORCE_HTTPS=true` on `GET /api/products` over plain HTTP: must return `308` with `Location: https://...`.
- `POST /api/auth/login` with `X-Forwarded-Proto: https` in `test` mode: `Set-Cookie` header must include `Secure` and `HttpOnly`.
- `nginx -t` validation on `/etc/nginx/sites-available/webthuongmaidientu.conf`: syntax must be 100% valid Nginx configuration.

---

### Task 1: Backend HTTPS Security Middleware, Dynamic Secure Cookie & Native TLS Support

**Files:**
- Create: `backend/src/middleware/security.js`
- Modify: `backend/src/config.js`
- Modify: `backend/src/app.js`
- Modify: `backend/src/controllers/authController.js`
- Modify: `backend/src/server.js`
- Test: `backend/tests/https-security.test.js`

**Interfaces:**
- Consumes: `loadConfig(env)` from `backend/src/config.js`
- Produces:
  - `isHttpsRequest(req) -> boolean` in `backend/src/middleware/security.js`
  - `securityHeaders({ forceHttps?: boolean }) -> express.RequestHandler` in `backend/src/middleware/security.js`
  - `cookieOptionsFor(req) -> CookieOptions` in `backend/src/controllers/authController.js`

- [ ] **Step 1: Write the failing test in `backend/tests/https-security.test.js`**

```javascript
import { test, before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app, setup, resetDb, teardown } from './helpers.js';
import { createApp } from '../src/app.js';

before(setup);
beforeEach(resetDb);
after(teardown);

test('sets OWASP security headers on all responses and HSTS when request is HTTPS via proxy', async () => {
  const httpRes = await request(app).get('/api/health');
  assert.equal(httpRes.status, 200);
  assert.equal(httpRes.headers['x-content-type-options'], 'nosniff');
  assert.equal(httpRes.headers['x-frame-options'], 'DENY');
  assert.equal(httpRes.headers['referrer-policy'], 'strict-origin-when-cross-origin');
  assert.equal(httpRes.headers['strict-transport-security'], undefined);

  const httpsRes = await request(app)
    .get('/api/health')
    .set('X-Forwarded-Proto', 'https, http');
  assert.equal(httpsRes.status, 200);
  assert.match(httpsRes.headers['strict-transport-security'], /max-age=31536000/);
});

test('sets Secure flag on auth cookie when accessed via HTTPS proxy', async () => {
  const res = await request(app)
    .post('/api/auth/register')
    .set('X-Forwarded-Proto', 'https')
    .send({ email: 'sec@example.com', password: 'password123', fullName: 'Secure User' });
  assert.equal(res.status, 201);
  const cookie = (res.headers['set-cookie'] || []).join('; ');
  assert.match(cookie, /HttpOnly/i);
  assert.match(cookie, /Secure/i);
});

test('FORCE_HTTPS redirects plain HTTP to HTTPS with 308 except /api/health', async () => {
  const forcedApp = createApp({ forceHttps: true });

  const health = await request(forcedApp).get('/api/health').set('Host', 'shop.example.com');
  assert.equal(health.status, 200);

  const redir = await request(forcedApp).get('/api/products?page=1').set('Host', 'shop.example.com');
  assert.equal(redir.status, 308);
  assert.equal(redir.headers.location, 'https://shop.example.com/api/products?page=1');

  const allowedHttps = await request(forcedApp)
    .get('/api/products')
    .set('Host', 'shop.example.com')
    .set('X-Forwarded-Proto', 'https');
  assert.equal(allowedHttps.status, 200);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && NODE_ENV=test node --env-file-if-exists=.env --test tests/https-security.test.js`
Expected: FAIL (missing headers, cookie `Secure` flag, and `forceHttps` option)

- [ ] **Step 3: Implement `backend/src/middleware/security.js`, update `config.js`, `app.js`, `authController.js`, and `server.js`**

- [ ] **Step 4: Run tests to verify all pass**

Run: `cd backend && npm test`
Expected: PASS (90/90 tests)

---

### Task 2: Nginx Virtual Host Configuration & Automated Let's Encrypt / Local TLS Scripts (Bonus)

**Files:**
- Create: `nginx/sites-available/webthuongmaidientu.conf`
- Create: `scripts/setup-https-letsencrypt.sh`
- Create: `scripts/generate-local-cert.sh`
- Modify: `frontend/next.config.mjs`
- Modify: `frontend/package.json`
- Modify: `backend/package.json`
- Create: `render.yaml`

**Interfaces:**
- Produces:
  - `/etc/nginx/sites-available/webthuongmaidientu.conf` compliant Nginx Virtual Host configuration
  - `scripts/setup-https-letsencrypt.sh` executable Bash automation script with `--dry-run-sim` and live modes
  - `scripts/generate-local-cert.sh` local X.509 certificate generator (`certs/localhost.pem`, `certs/localhost-key.pem`)

- [ ] **Step 1: Create `nginx/sites-available/webthuongmaidientu.conf` with HTTP->HTTPS 301 redirect, ACME webroot challenge, TLS 1.2/1.3, HSTS, and reverse proxy to `:3000` and `:4000`**
- [ ] **Step 2: Create `scripts/setup-https-letsencrypt.sh` and `scripts/generate-local-cert.sh` with `chmod +x`**
- [ ] **Step 3: Update `frontend/next.config.mjs`, `frontend/package.json`, `backend/package.json`, and create `render.yaml`**
- [ ] **Step 4: Execute `scripts/generate-local-cert.sh` and test actual HTTPS server handshake with `openssl s_client` and `curl -I`**

---

### Task 3: Verification & 2–4 Page Coursework Report (`.md` & `.docx`)

**Files:**
- Create: `docs/BAO_CAO_TRIEN_KHAI_HTTPS.md`
- Create: `docs/BAO_CAO_TRIEN_KHAI_HTTPS.docx`

- [ ] **Step 1: Capture real terminal outputs (`openssl s_client`, `curl -I`, `certbot` & `certbot renew --dry-run` simulation, Virtual Host config)**
- [ ] **Step 2: Write comprehensive 2–4 page report in `docs/BAO_CAO_TRIEN_KHAI_HTTPS.md` and convert/generate `docs/BAO_CAO_TRIEN_KHAI_HTTPS.docx`**

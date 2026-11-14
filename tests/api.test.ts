import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';
import bcrypt from 'bcryptjs';
import { createApiApp } from '../server/app.ts';
import { connectDatabase } from '../server/config/db.ts';
import { ensureSampleDataSeeded } from '../server/seed/sampleData.ts';
import { repository } from '../server/services/repository.ts';

async function withServer(
  fn: (baseUrl: string) => Promise<void>
): Promise<void> {
  const app = createApiApp();
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const addr = server.address() as { port: number };
  try {
    await fn(`http://127.0.0.1:${addr.port}`);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve()))
    );
  }
}

async function apiFetch(
  baseUrl: string,
  route: string,
  options: { method?: string; token?: string; body?: unknown; origin?: string } = {}
) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (options.token) headers.Authorization = `Bearer ${options.token}`;
  if (options.origin) headers.Origin = options.origin;

  const res = await fetch(`${baseUrl}${route}`, {
    method: options.method || 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return {
    status: res.status,
    headers: res.headers,
    data: data as Record<string, any>,
  };
}

describe('Production Security & Fail-Fast Guards', () => {
  it('fails fast in production when MONGODB_URI is missing', async () => {
    const prevNodeEnv = process.env.NODE_ENV;
    const prevUri = process.env.MONGODB_URI;
    process.env.NODE_ENV = 'production';
    delete process.env.MONGODB_URI;

    try {
      await assert.rejects(
        () => connectDatabase(),
        /MONGODB_URI is required in production/i
      );
    } finally {
      process.env.NODE_ENV = prevNodeEnv;
      if (prevUri !== undefined) process.env.MONGODB_URI = prevUri;
    }
  });

  it('fails fast in production when MongoDB is unreachable (never falls back to disk)', async () => {
    const prevNodeEnv = process.env.NODE_ENV;
    const prevUri = process.env.MONGODB_URI;
    process.env.NODE_ENV = 'production';
    process.env.MONGODB_URI = 'mongodb://127.0.0.1:27999/unreachable_test_db';

    try {
      await assert.rejects(() => connectDatabase({ serverSelectionTimeoutMS: 400 }));
    } finally {
      process.env.NODE_ENV = prevNodeEnv;
      if (prevUri === undefined) delete process.env.MONGODB_URI;
      else process.env.MONGODB_URI = prevUri;
    }
  });

  it('forbids local disk fallback repository access in production', async () => {
    const prevNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    try {
      await assert.rejects(
        () => repository.countUsers(),
        /Local disk fallback storage is forbidden in production/i
      );
    } finally {
      process.env.NODE_ENV = prevNodeEnv;
    }
  });

  it('disables automatic demo seeding in production', async () => {
    const prevNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    try {
      await ensureSampleDataSeeded();
    } finally {
      process.env.NODE_ENV = prevNodeEnv;
    }
  });

  it('fails closed on CORS when CLIENT_URL is missing in production and enforces allowlist when set', async () => {
    const prevNodeEnv = process.env.NODE_ENV;
    const prevClientUrl = process.env.CLIENT_URL;
    const prevAppUrl = process.env.APP_URL;

    process.env.NODE_ENV = 'production';
    delete process.env.CLIENT_URL;
    delete process.env.APP_URL;

    try {
      await withServer(async (baseUrl) => {
        const externalRes = await apiFetch(baseUrl, '/api/health', {
          origin: 'https://evil.example.com',
        });
        assert.equal(externalRes.status, 200);
        assert.equal(externalRes.headers.get('access-control-allow-origin'), null);

        const localRes = await apiFetch(baseUrl, '/api/health', {
          origin: 'http://localhost:3000',
        });
        assert.equal(localRes.headers.get('access-control-allow-origin'), null);
      });

      process.env.CLIENT_URL = 'https://opentrack-prod.vercel.app';
      await withServer(async (baseUrl) => {
        const allowed = await apiFetch(baseUrl, '/api/health', {
          origin: 'https://opentrack-prod.vercel.app',
        });
        assert.equal(
          allowed.headers.get('access-control-allow-origin'),
          'https://opentrack-prod.vercel.app'
        );

        const denied = await apiFetch(baseUrl, '/api/health', {
          origin: 'https://untrusted.example.com',
        });
        assert.equal(denied.headers.get('access-control-allow-origin'), null);
      });
    } finally {
      process.env.NODE_ENV = prevNodeEnv;
      if (prevClientUrl === undefined) delete process.env.CLIENT_URL;
      else process.env.CLIENT_URL = prevClientUrl;
      if (prevAppUrl === undefined) delete process.env.APP_URL;
      else process.env.APP_URL = prevAppUrl;
    }
  });
});

describe('REST API End-to-End Persistence & RBAC (Isolated Store)', () => {
  const tempStorePath = path.join(os.tmpdir(), `opentrack-test-${Date.now()}.json`);
  const prevNodeEnv = process.env.NODE_ENV;
  const prevUri = process.env.MONGODB_URI;
  const prevLocalStore = process.env.LOCAL_STORE_PATH;

  let adminEmail = 'test-admin@domain.org';
  let adminPassword = 'StrongAdmin!Password99';

  before(async () => {
    process.env.NODE_ENV = 'development';
    delete process.env.MONGODB_URI;
    process.env.LOCAL_STORE_PATH = tempStorePath;
    await connectDatabase();

    const hash = await bcrypt.hash(adminPassword, 10);
    await repository.createUser({
      name: 'Test Admin',
      email: adminEmail,
      passwordHash: hash,
      role: 'admin',
      skills: ['Moderation'],
    });
  });

  after(() => {
    process.env.NODE_ENV = prevNodeEnv;
    if (prevUri !== undefined) process.env.MONGODB_URI = prevUri;
    if (prevLocalStore === undefined) delete process.env.LOCAL_STORE_PATH;
    else process.env.LOCAL_STORE_PATH = prevLocalStore;
    if (fs.existsSync(tempStorePath)) {
      fs.unlinkSync(tempStorePath);
    }
  });

  it('supports auth, blocks role escalation and admin routes for regular users, and completes full CRUD workflows', async () => {
    await withServer(async (baseUrl) => {
      // 1. Register user (attempting role: admin must be ignored)
      const reg = await apiFetch(baseUrl, '/api/auth/register', {
        method: 'POST',
        body: {
          name: 'Asha Verma',
          email: 'asha@example.com',
          password: 'UserPassword!123',
          role: 'admin',
          skills: ['TypeScript', 'C++'],
        },
      });
      assert.equal(reg.status, 201);
      assert.equal(reg.data.user.role, 'user');
      const userToken = reg.data.token as string;

      // 2. Regular user blocked from admin dashboard
      const forbidden = await apiFetch(baseUrl, '/api/admin/dashboard', { token: userToken });
      assert.equal(forbidden.status, 403);

      // 3. Admin login & create opportunity
      const adminLogin = await apiFetch(baseUrl, '/api/auth/login', {
        method: 'POST',
        body: { email: adminEmail, password: adminPassword },
      });
      assert.equal(adminLogin.status, 200);
      const adminToken = adminLogin.data.token as string;

      const createdOpp = await apiFetch(baseUrl, '/api/admin/opportunities', {
        method: 'POST',
        token: adminToken,
        body: {
          title: 'Systems Intern (C++ & Rust)',
          company: 'CoreKernel Labs',
          description: 'Work on low-latency telemetry collectors and C++ systems tooling.',
          skills: ['C++', 'Linux', 'Git'],
          type: 'Internship',
          workMode: 'Remote',
          location: 'Remote (India)',
          stipend: '₹40,000 / month',
          isPaid: true,
          applicationUrl: 'https://example.org/jobs/cpp-intern',
        },
      });
      assert.equal(createdOpp.status, 201);
      const oppId = createdOpp.data.opportunity._id as string;

      // 4. Search with regex characters (C++) & filters
      const searchRes = await apiFetch(
        baseUrl,
        '/api/opportunities?search=C%2B%2B&type=Internship&workMode=Remote&paid=paid'
      );
      assert.equal(searchRes.status, 200);
      assert.equal(searchRes.data.pagination.total, 1);

      // 5. Bookmarks + duplicate check
      const bmCreate = await apiFetch(baseUrl, '/api/bookmarks', {
        method: 'POST',
        token: userToken,
        body: { opportunityId: oppId },
      });
      assert.equal(bmCreate.status, 201);

      const bmDup = await apiFetch(baseUrl, '/api/bookmarks', {
        method: 'POST',
        token: userToken,
        body: { opportunityId: oppId },
      });
      assert.equal(bmDup.status, 409);

      // 6. Application tracker + status history + fallback metadata
      const appCreate = await apiFetch(baseUrl, '/api/applications', {
        method: 'POST',
        token: userToken,
        body: {
          opportunityId: oppId,
          status: 'Applied',
          appliedAt: new Date().toISOString(),
          notes: 'Submitted portfolio',
        },
      });
      assert.equal(appCreate.status, 201);
      assert.equal(appCreate.data.application.customTitle, 'Systems Intern (C++ & Rust)');
      const appId = appCreate.data.application._id as string;

      const appPatch = await apiFetch(baseUrl, `/api/applications/${appId}`, {
        method: 'PATCH',
        token: userToken,
        body: { status: 'Interview', notes: 'Technical interview scheduled' },
      });
      assert.equal(appPatch.status, 200);
      assert.equal(appPatch.data.application.history.length, 2);

      // 7. Community submission -> private while pending -> public after admin approval
      const subRes = await apiFetch(baseUrl, '/api/opportunities/submit', {
        method: 'POST',
        token: userToken,
        body: {
          title: 'Open-Source Frontend Contributor',
          company: 'PixelForge',
          description: 'Contribute accessible React components and documentation improvements.',
          skills: ['React', 'Tailwind CSS'],
          type: 'Internship',
          workMode: 'Remote',
          location: 'Remote',
          stipend: '$1,200 / month',
          isPaid: true,
          applicationUrl: 'https://example.org/jobs/pixelforge-oss',
        },
      });
      assert.equal(subRes.status, 201);
      assert.equal(subRes.data.opportunity.status, 'pending');
      const subId = subRes.data.opportunity._id as string;

      const beforeApprove = await apiFetch(baseUrl, `/api/opportunities/${subId}`);
      assert.equal(beforeApprove.status, 404);

      const approve = await apiFetch(baseUrl, `/api/admin/submissions/${subId}`, {
        method: 'PATCH',
        token: adminToken,
        body: { status: 'approved', reviewNote: 'Verified posting' },
      });
      assert.equal(approve.status, 200);

      const afterApprove = await apiFetch(baseUrl, `/api/opportunities/${subId}`);
      assert.equal(afterApprove.status, 200);

      // 8. Admin dashboard real metrics check
      const dash = await apiFetch(baseUrl, '/api/admin/dashboard', { token: adminToken });
      assert.equal(dash.status, 200);
      assert.equal(dash.data.stats.totalUsers, 2);
      assert.equal(dash.data.stats.approvedOpportunities, 2);
      assert.equal(dash.data.stats.totalApplications, 1);
      assert.equal(dash.data.stats.totalBookmarks, 1);
    });
  });
});

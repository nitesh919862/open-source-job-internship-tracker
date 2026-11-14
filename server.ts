import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { createApiApp } from './server/app.ts';
import { connectDatabase } from './server/config/db.ts';
import { ensureSampleDataSeeded } from './server/seed/sampleData.ts';

function resolveServerPort(): number {
  const envPort = process.env.PORT ? Number(process.env.PORT) : 3000;
  const nginxPort = process.env.NGINX_PORT ? Number(process.env.NGINX_PORT) : null;
  if (nginxPort && envPort === nginxPort) {
    return Number(process.env.DEFAULT_APP_PORT) || 3000;
  }
  return Number.isFinite(envPort) && envPort > 0 ? envPort : 3000;
}

async function startServer() {
  await connectDatabase();

  const isProd = process.env.NODE_ENV === 'production';
  if (isProd) {
    console.log('[Seed] Production mode detected — automatic demo seeding is disabled.');
  } else if (process.env.NODE_ENV === 'development' || process.env.ENABLE_DEMO_SEED === 'true') {
    await ensureSampleDataSeeded();
  } else {
    console.log('[Seed] Automatic demo seeding skipped (NODE_ENV is not "development").');
  }

  const app = createApiApp();
  const port = resolveServerPort();

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    if (fs.existsSync(distDir)) {
      app.use(express.static(distDir));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distDir, 'index.html'));
      });
    }
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Open-Source Job & Internship Tracker running on http://localhost:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

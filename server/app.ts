import cors from 'cors';
import express from 'express';
import { getDatabaseStatus } from './config/db.ts';
import { errorHandler } from './middleware/errorHandler.ts';
import adminRoutes from './routes/adminRoutes.ts';
import applicationRoutes from './routes/applicationRoutes.ts';
import authRoutes from './routes/authRoutes.ts';
import bookmarkRoutes from './routes/bookmarkRoutes.ts';
import notificationRoutes from './routes/notificationRoutes.ts';
import opportunityRoutes from './routes/opportunityRoutes.ts';

function parseAllowedOrigins(): Set<string> {
  const raw = [process.env.CLIENT_URL, process.env.APP_URL]
    .filter((v): v is string => Boolean(v && v.trim() && v.trim() !== 'MY_APP_URL'))
    .join(',');

  const origins = new Set<string>();
  for (const entry of raw.split(',')) {
    const clean = entry.trim().replace(/\/+$/, '');
    if (clean) {
      origins.add(clean);
    }
  }
  return origins;
}

export function createApiApp() {
  const app = express();

  const isProd = process.env.NODE_ENV === 'production';
  const allowedOrigins = parseAllowedOrigins();

  if (!isProd) {
    allowedOrigins.add('http://localhost:3000');
    allowedOrigins.add('http://127.0.0.1:3000');
    allowedOrigins.add('http://localhost:5173');
  } else if (allowedOrigins.size === 0) {
    console.warn(
      '[CORS] CLIENT_URL is not configured in production. Cross-origin requests will be rejected (fail-closed).'
    );
  }

  app.use(
    cors({
      origin(origin, callback) {
        // Allow requests with no Origin header (e.g. same-origin navigation, curl, health checks)
        if (!origin) {
          return callback(null, true);
        }
        const normalized = origin.trim().replace(/\/+$/, '');
        if (allowedOrigins.has(normalized)) {
          return callback(null, true);
        }
        return callback(null, false);
      },
      credentials: true,
    })
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  app.get('/api/health', (_req, res) => {
    const db = getDatabaseStatus();
    res.json({
      success: true,
      status: 'ok',
      database: db,
      timestamp: new Date().toISOString(),
    });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/opportunities', opportunityRoutes);
  app.use('/api/applications', applicationRoutes);
  app.use('/api/bookmarks', bookmarkRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/notifications', notificationRoutes);

  app.use('/api/*', (_req, res) => {
    res.status(404).json({
      success: false,
      message: 'API route not found.',
    });
  });

  app.use(errorHandler);
  return app;
}

import mongoose from 'mongoose';

export type DatabaseMode = 'mongodb' | 'local-fallback';

let currentMode: DatabaseMode = 'local-fallback';
let connectionErrorReason: string | null = null;

export function getDatabaseStatus(): {
  mode: DatabaseMode;
  connected: boolean;
  reason: string | null;
} {
  return {
    mode: currentMode,
    connected: currentMode === 'mongodb' && mongoose.connection.readyState === 1,
    reason: connectionErrorReason,
  };
}

export function isMongoActive(): boolean {
  return currentMode === 'mongodb' && mongoose.connection.readyState === 1;
}

export async function connectDatabase(options?: {
  serverSelectionTimeoutMS?: number;
}): Promise<DatabaseMode> {
  const isProd = process.env.NODE_ENV === 'production';
  const uri = process.env.MONGODB_URI?.trim();

  if (!uri) {
    if (isProd) {
      currentMode = 'mongodb';
      connectionErrorReason = 'MONGODB_URI is required in production.';
      console.error(`[DB] Fatal: ${connectionErrorReason}`);
      throw new Error(connectionErrorReason);
    }
    currentMode = 'local-fallback';
    connectionErrorReason =
      'MONGODB_URI is not set in environment variables. Using local disk-backed store (.data/store.json) for preview.';
    console.warn(`[DB] ${connectionErrorReason}`);
    return currentMode;
  }

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: options?.serverSelectionTimeoutMS ?? 6000,
    });
    currentMode = 'mongodb';
    connectionErrorReason = null;
    console.log(`[DB] Connected to MongoDB Atlas (${mongoose.connection.name})`);
    return currentMode;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown connection error';
    if (isProd) {
      currentMode = 'mongodb';
      connectionErrorReason = `Fatal MongoDB connection error in production: ${message}`;
      console.error(`[DB] ${connectionErrorReason}`);
      throw err;
    }
    currentMode = 'local-fallback';
    connectionErrorReason = `Could not reach MongoDB (${message}). Running with local disk-backed store (.data/store.json).`;
    console.warn(`[DB] ${connectionErrorReason}`);
    return currentMode;
  }
}

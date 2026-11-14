import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';
import type { UserRole } from '../models/User.ts';

export interface JwtPayload {
  userId: string;
  role: UserRole;
  email: string;
}

let cachedDevSecret: string | null = null;

function getJwtSecret(): string {
  const envSecret = process.env.JWT_SECRET?.trim();
  if (envSecret && envSecret.length >= 16) {
    return envSecret;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET environment variable must be configured in production.');
  }

  if (cachedDevSecret) {
    return cachedDevSecret;
  }

  const dataDir = path.resolve(process.cwd(), '.data');
  const secretPath = path.join(dataDir, '.jwt-secret');
  try {
    if (fs.existsSync(secretPath)) {
      const existing = fs.readFileSync(secretPath, 'utf8').trim();
      if (existing.length >= 32) {
        cachedDevSecret = existing;
        return existing;
      }
    }
    fs.mkdirSync(dataDir, { recursive: true });
    const generated = crypto.randomBytes(48).toString('hex');
    fs.writeFileSync(secretPath, generated, { mode: 0o600 });
    cachedDevSecret = generated;
    console.warn('[Auth] JWT_SECRET not set. Generated persistent development secret in .data/.jwt-secret');
    return generated;
  } catch {
    cachedDevSecret = crypto.randomBytes(48).toString('hex');
    return cachedDevSecret;
  }
}

export function signToken(payload: JwtPayload): string {
  const expiresIn = process.env.JWT_EXPIRES_IN?.trim() || '7d';
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: expiresIn as jwt.SignOptions['expiresIn'],
  });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, getJwtSecret()) as JwtPayload;
}

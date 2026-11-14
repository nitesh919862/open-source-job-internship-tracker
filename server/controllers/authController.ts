import bcrypt from 'bcryptjs';
import type { Request, Response } from 'express';
import { ApiError, asyncHandler } from '../middleware/errorHandler.ts';
import { repository, sanitizeUser } from '../services/repository.ts';
import { signToken } from '../utils/jwt.ts';
import { isValidEmail, normalizeSkills } from '../utils/validators.ts';

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, password, skills, headline, location } = req.body as Record<string, unknown>;

  const cleanName = typeof name === 'string' ? name.trim() : '';
  const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  const rawPassword = typeof password === 'string' ? password : '';

  if (cleanName.length < 2 || cleanName.length > 80) {
    throw new ApiError(400, 'Full name must be between 2 and 80 characters.');
  }
  if (!isValidEmail(cleanEmail)) {
    throw new ApiError(400, 'Please enter a valid email address.');
  }
  if (rawPassword.length < 8) {
    throw new ApiError(400, 'Password must be at least 8 characters long.');
  }

  const existing = await repository.findUserByEmail(cleanEmail);
  if (existing) {
    throw new ApiError(409, 'An account with this email already exists.');
  }

  const passwordHash = await bcrypt.hash(rawPassword, 10);

  // Never allow client payloads to self-assign admin role
  const created = await repository.createUser({
    name: cleanName,
    email: cleanEmail,
    passwordHash,
    role: 'user',
    skills: normalizeSkills(skills),
    headline: typeof headline === 'string' ? headline.trim().slice(0, 120) : '',
    location: typeof location === 'string' ? location.trim().slice(0, 80) : '',
  });

  await repository.createNotification({
    userId: created._id,
    type: 'system',
    message: 'Welcome to Open-Source Job & Internship Tracker. Explore roles or start tracking applications.',
    link: '/opportunities',
  });

  const token = signToken({
    userId: created._id,
    role: created.role,
    email: created.email,
  });

  res.status(201).json({
    success: true,
    token,
    user: sanitizeUser(created),
  });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body as Record<string, unknown>;
  const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  const rawPassword = typeof password === 'string' ? password : '';

  if (!isValidEmail(cleanEmail) || !rawPassword) {
    throw new ApiError(400, 'Valid email and password are required.');
  }

  const user = await repository.findUserByEmail(cleanEmail);
  if (!user) {
    throw new ApiError(401, 'Invalid email or password.');
  }

  const isMatch = await bcrypt.compare(rawPassword, user.passwordHash);
  if (!isMatch) {
    throw new ApiError(401, 'Invalid email or password.');
  }

  const token = signToken({
    userId: user._id,
    role: user.role,
    email: user.email,
  });

  res.json({
    success: true,
    token,
    user: sanitizeUser(user),
  });
});

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  res.json({
    success: true,
    user: req.user,
  });
});

export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  const { name, skills, headline, location, bio } = req.body as Record<string, unknown>;

  const updates: {
    name?: string;
    skills?: string[];
    headline?: string;
    location?: string;
    bio?: string;
  } = {};

  if (typeof name === 'string') {
    const clean = name.trim();
    if (clean.length < 2 || clean.length > 80) {
      throw new ApiError(400, 'Name must be between 2 and 80 characters.');
    }
    updates.name = clean;
  }
  if (skills !== undefined) {
    updates.skills = normalizeSkills(skills);
  }
  if (typeof headline === 'string') {
    updates.headline = headline.trim().slice(0, 120);
  }
  if (typeof location === 'string') {
    updates.location = location.trim().slice(0, 80);
  }
  if (typeof bio === 'string') {
    updates.bio = bio.trim().slice(0, 500);
  }

  const updated = await repository.updateUserProfile(req.user!._id, updates);
  if (!updated) {
    throw new ApiError(404, 'User not found.');
  }

  res.json({
    success: true,
    user: sanitizeUser(updated),
  });
});

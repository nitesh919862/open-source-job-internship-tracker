import type { Request, Response } from 'express';
import { ApiError, asyncHandler } from '../middleware/errorHandler.ts';
import { repository } from '../services/repository.ts';

export const createBookmark = asyncHandler(async (req: Request, res: Response) => {
  const { opportunityId } = req.body as Record<string, unknown>;
  if (typeof opportunityId !== 'string' || !opportunityId.trim()) {
    throw new ApiError(400, 'opportunityId is required.');
  }

  const opp = await repository.findOpportunityById(opportunityId.trim());
  if (!opp || opp.status !== 'approved') {
    throw new ApiError(404, 'Opportunity not found.');
  }

  const existing = await repository.findBookmark(req.user!._id, opp._id);
  if (existing) {
    throw new ApiError(409, 'This opportunity is already saved to your bookmarks.');
  }

  const bookmark = await repository.createBookmark(req.user!._id, opp._id);
  res.status(201).json({
    success: true,
    bookmark,
  });
});

export const getMyBookmarks = asyncHandler(async (req: Request, res: Response) => {
  const bookmarks = await repository.listBookmarksByUser(req.user!._id);
  res.json({
    success: true,
    bookmarks,
  });
});

export const deleteBookmark = asyncHandler(async (req: Request, res: Response) => {
  const deleted = await repository.deleteBookmarkForUser(req.user!._id, req.params.id);
  if (!deleted) {
    throw new ApiError(404, 'Saved bookmark not found.');
  }
  res.json({
    success: true,
    message: 'Bookmark removed.',
  });
});

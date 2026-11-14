import type { Request, Response } from 'express';
import { ApiError, asyncHandler } from '../middleware/errorHandler.ts';
import { repository } from '../services/repository.ts';

export const getNotifications = asyncHandler(async (req: Request, res: Response) => {
  const notifications = await repository.listNotifications(req.user!._id);
  const unreadCount = notifications.filter((n) => !n.read).length;
  res.json({
    success: true,
    notifications,
    unreadCount,
  });
});

export const markNotificationRead = asyncHandler(async (req: Request, res: Response) => {
  const ok = await repository.markNotificationRead(req.user!._id, req.params.id);
  if (!ok) {
    throw new ApiError(404, 'Notification not found.');
  }
  res.json({ success: true });
});

export const markAllNotificationsRead = asyncHandler(async (req: Request, res: Response) => {
  await repository.markAllNotificationsRead(req.user!._id);
  res.json({ success: true });
});

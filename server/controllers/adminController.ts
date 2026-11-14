import type { Request, Response } from 'express';
import { ApiError, asyncHandler } from '../middleware/errorHandler.ts';
import { repository, sanitizeUser } from '../services/repository.ts';
import { normalizeSkills, validateOpportunityPayload } from '../utils/validators.ts';
import type { OpportunityStatus, OpportunityType, WorkMode } from '../models/Opportunity.ts';
import type { UserRole } from '../models/User.ts';

export const getAdminDashboard = asyncHandler(async (req: Request, res: Response) => {
  const excludeSample = req.query.excludeSample === 'true';
  const stats = await repository.getAdminStats(excludeSample);
  res.json({
    success: true,
    stats,
  });
});

export const listAdminSubmissions = asyncHandler(async (req: Request, res: Response) => {
  const statusParam = typeof req.query.status === 'string' ? req.query.status : 'all';
  const search = typeof req.query.search === 'string' ? req.query.search : '';
  const type = typeof req.query.type === 'string' ? req.query.type : 'all';
  const excludeSample = req.query.excludeSample === 'true';
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;

  const validStatuses = ['all', 'pending', 'approved', 'rejected'];
  const status = validStatuses.includes(statusParam)
    ? (statusParam as OpportunityStatus | 'all')
    : 'all';

  const result = await repository.queryOpportunities({
    status,
    search,
    type,
    excludeSample,
    page,
    limit,
    sort: 'newest',
  });

  res.json({
    success: true,
    items: result.items,
    pagination: {
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    },
  });
});

export const moderateSubmission = asyncHandler(async (req: Request, res: Response) => {
  const { status, reviewNote } = req.body as Record<string, unknown>;
  if (status !== 'approved' && status !== 'rejected') {
    throw new ApiError(400, 'Moderation status must be either "approved" or "rejected".');
  }

  const existing = await repository.findOpportunityById(req.params.id);
  if (!existing) {
    throw new ApiError(404, 'Submission not found.');
  }

  const cleanNote = typeof reviewNote === 'string' ? reviewNote.trim().slice(0, 500) : '';
  const updated = await repository.updateOpportunity(req.params.id, {
    status,
    reviewedBy: req.user!._id,
    reviewNote: cleanNote,
  });

  if (existing.submittedBy) {
    await repository.createNotification({
      userId: existing.submittedBy,
      type: 'submission',
      message:
        status === 'approved'
          ? `Your submitted opportunity "${existing.title}" at ${existing.company} was approved and published.`
          : `Your submitted opportunity "${existing.title}" at ${existing.company} was not approved.${cleanNote ? ` Note: ${cleanNote}` : ''}`,
      link: status === 'approved' ? `/opportunities/${existing._id}` : '/dashboard',
    });
  }

  res.json({
    success: true,
    opportunity: updated,
  });
});

export const adminCreateOpportunity = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as Record<string, unknown>;
  const validation = validateOpportunityPayload(body);

  if (!validation.valid) {
    throw new ApiError(400, validation.errors[0], validation.errors);
  }

  const stipendText = typeof body.stipend === 'string' ? body.stipend.trim() : '';
  const isPaid =
    typeof body.isPaid === 'boolean'
      ? body.isPaid
      : !stipendText.toLowerCase().includes('unpaid');

  const created = await repository.createOpportunity({
    title: String(body.title).trim(),
    company: String(body.company).trim(),
    companyLogo: typeof body.companyLogo === 'string' ? body.companyLogo.trim() : '',
    description: String(body.description).trim(),
    skills: normalizeSkills(body.skills),
    type: body.type as OpportunityType,
    workMode: body.workMode as WorkMode,
    location: String(body.location).trim(),
    stipend: stipendText || (isPaid ? 'Competitive' : 'Unpaid'),
    isPaid,
    applicationUrl: String(body.applicationUrl).trim(),
    deadline: body.deadline ? new Date(String(body.deadline)) : null,
    status: 'approved',
    isSample: Boolean(body.isSample),
    submittedBy: req.user!._id,
  });

  res.status(201).json({
    success: true,
    opportunity: created,
  });
});

export const adminUpdateOpportunity = asyncHandler(async (req: Request, res: Response) => {
  const existing = await repository.findOpportunityById(req.params.id);
  if (!existing) {
    throw new ApiError(404, 'Opportunity not found.');
  }

  const body = req.body as Record<string, unknown>;
  const merged = {
    title: body.title ?? existing.title,
    company: body.company ?? existing.company,
    description: body.description ?? existing.description,
    type: body.type ?? existing.type,
    workMode: body.workMode ?? existing.workMode,
    location: body.location ?? existing.location,
    applicationUrl: body.applicationUrl ?? existing.applicationUrl,
    deadline: body.deadline !== undefined ? body.deadline : existing.deadline,
  };

  const validation = validateOpportunityPayload(merged);
  if (!validation.valid) {
    throw new ApiError(400, validation.errors[0], validation.errors);
  }

  const stipendText =
    typeof body.stipend === 'string' ? body.stipend.trim() : existing.stipend;
  const isPaid =
    typeof body.isPaid === 'boolean'
      ? body.isPaid
      : body.stipend !== undefined
        ? !stipendText.toLowerCase().includes('unpaid')
        : existing.isPaid;

  const updated = await repository.updateOpportunity(req.params.id, {
    title: String(merged.title).trim(),
    company: String(merged.company).trim(),
    companyLogo:
      typeof body.companyLogo === 'string' ? body.companyLogo.trim() : existing.companyLogo,
    description: String(merged.description).trim(),
    skills: body.skills !== undefined ? normalizeSkills(body.skills) : existing.skills,
    type: merged.type as OpportunityType,
    workMode: merged.workMode as WorkMode,
    location: String(merged.location).trim(),
    stipend: stipendText,
    isPaid,
    applicationUrl: String(merged.applicationUrl).trim(),
    deadline: merged.deadline ? new Date(String(merged.deadline)) : null,
    ...(body.status === 'pending' || body.status === 'approved' || body.status === 'rejected'
      ? { status: body.status as OpportunityStatus }
      : {}),
  });

  res.json({
    success: true,
    opportunity: updated,
  });
});

export const adminDeleteOpportunity = asyncHandler(async (req: Request, res: Response) => {
  const deleted = await repository.deleteOpportunity(req.params.id);
  if (!deleted) {
    throw new ApiError(404, 'Opportunity not found.');
  }
  res.json({
    success: true,
    message: 'Opportunity deleted permanently.',
  });
});

export const adminPurgeSampleData = asyncHandler(async (_req: Request, res: Response) => {
  const deletedCount = await repository.purgeSampleOpportunities();
  res.json({
    success: true,
    deletedCount,
    message:
      deletedCount > 0
        ? `Removed ${deletedCount} sample opportunity records.`
        : 'No sample opportunity records found to remove.',
  });
});

export const adminListUsers = asyncHandler(async (req: Request, res: Response) => {
  const search = typeof req.query.search === 'string' ? req.query.search.trim().toLowerCase() : '';
  const users = await repository.listUsersWithActivity();
  const filtered = search
    ? users.filter(
        (u) =>
          u.name.toLowerCase().includes(search) ||
          u.email.toLowerCase().includes(search) ||
          u.role.toLowerCase().includes(search)
      )
    : users;

  res.json({
    success: true,
    users: filtered.map(sanitizeUser),
  });
});

export const adminUpdateUserRole = asyncHandler(async (req: Request, res: Response) => {
  const { role } = req.body as Record<string, unknown>;
  if (role !== 'user' && role !== 'admin') {
    throw new ApiError(400, 'Role must be "user" or "admin".');
  }

  const targetUser = await repository.findUserById(req.params.id);
  if (!targetUser) {
    throw new ApiError(404, 'User not found.');
  }

  if (targetUser._id === req.user!._id && role !== 'admin') {
    const allUsers = await repository.listUsers();
    const adminCount = allUsers.filter((u) => u.role === 'admin').length;
    if (adminCount <= 1) {
      throw new ApiError(400, 'Cannot demote the last remaining administrator.');
    }
  }

  const updated = await repository.updateUserRole(req.params.id, role as UserRole);
  if (!updated) {
    throw new ApiError(404, 'User not found.');
  }

  await repository.createNotification({
    userId: updated._id,
    type: 'system',
    message: `Your account role was updated to "${role}" by an administrator.`,
    link: role === 'admin' ? '/admin' : '/dashboard',
  });

  res.json({
    success: true,
    user: sanitizeUser(updated),
  });
});

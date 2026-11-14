import type { Request, Response } from 'express';
import { ApiError, asyncHandler } from '../middleware/errorHandler.ts';
import { repository } from '../services/repository.ts';
import { normalizeSkills, validateOpportunityPayload } from '../utils/validators.ts';
import type { OpportunityType, WorkMode } from '../models/Opportunity.ts';

export const listPublicOpportunities = asyncHandler(async (req: Request, res: Response) => {
  const search = typeof req.query.search === 'string' ? req.query.search : '';
  const type = typeof req.query.type === 'string' ? req.query.type : 'all';
  const workMode = typeof req.query.workMode === 'string' ? req.query.workMode : 'all';
  const location = typeof req.query.location === 'string' ? req.query.location : '';
  const paid = typeof req.query.paid === 'string' ? req.query.paid : 'all';
  const sort = typeof req.query.sort === 'string' ? req.query.sort : 'newest';
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 9;

  const result = await repository.queryOpportunities({
    search,
    type,
    workMode,
    location,
    paid,
    sort,
    status: 'approved',
    page,
    limit,
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

export const getPublicStats = asyncHandler(async (_req: Request, res: Response) => {
  const stats = await repository.getPublicStats();
  res.json({
    success: true,
    stats,
  });
});

export const getOpportunityById = asyncHandler(async (req: Request, res: Response) => {
  const opp = await repository.findOpportunityById(req.params.id);
  if (!opp) {
    throw new ApiError(404, 'Opportunity not found.');
  }

  const isOwner = req.user && opp.submittedBy && req.user._id === opp.submittedBy;
  const isAdmin = req.user?.role === 'admin';

  if (opp.status !== 'approved' && !isOwner && !isAdmin) {
    throw new ApiError(404, 'Opportunity not found or not publicly available.');
  }

  res.json({
    success: true,
    opportunity: opp,
  });
});

export const submitOpportunity = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as Record<string, unknown>;
  const validation = validateOpportunityPayload(body);

  if (!validation.valid) {
    throw new ApiError(400, validation.errors[0], validation.errors);
  }

  const title = String(body.title).trim();
  const company = String(body.company).trim();
  const applicationUrl = String(body.applicationUrl).trim();

  const duplicate = await repository.findDuplicateOpportunity(title, company, applicationUrl);
  if (duplicate) {
    throw new ApiError(
      409,
      `A matching opportunity ("${duplicate.title}" at ${duplicate.company}) already exists with status "${duplicate.status}".`
    );
  }

  const stipendText = typeof body.stipend === 'string' ? body.stipend.trim() : '';
  const isPaid =
    typeof body.isPaid === 'boolean'
      ? body.isPaid
      : !stipendText.toLowerCase().includes('unpaid');

  const created = await repository.createOpportunity({
    title,
    company,
    companyLogo: typeof body.companyLogo === 'string' ? body.companyLogo.trim() : '',
    description: String(body.description).trim(),
    skills: normalizeSkills(body.skills),
    type: body.type as OpportunityType,
    workMode: body.workMode as WorkMode,
    location: String(body.location).trim(),
    stipend: stipendText || (isPaid ? 'Competitive' : 'Unpaid'),
    isPaid,
    applicationUrl,
    deadline: body.deadline ? new Date(String(body.deadline)) : null,
    status: 'pending',
    isSample: false,
    submittedBy: req.user!._id,
  });

  await repository.createNotification({
    userId: req.user!._id,
    type: 'submission',
    message: `Your submission "${created.title}" at ${created.company} was received and is pending review.`,
    link: '/dashboard',
  });

  res.status(201).json({
    success: true,
    message: 'Opportunity submitted for admin review.',
    opportunity: created,
  });
});

export const listMySubmissions = asyncHandler(async (req: Request, res: Response) => {
  const result = await repository.queryOpportunities({
    submittedBy: req.user!._id,
    status: 'all',
    limit: 50,
    page: 1,
  });

  res.json({
    success: true,
    items: result.items,
  });
});

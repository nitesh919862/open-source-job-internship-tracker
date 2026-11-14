import type { Request, Response } from 'express';
import { ApiError, asyncHandler } from '../middleware/errorHandler.ts';
import { repository } from '../services/repository.ts';
import { APPLICATION_STATUSES, isValidHttpUrl } from '../utils/validators.ts';
import type { ApplicationStatus } from '../models/Application.ts';

export const createApplication = asyncHandler(async (req: Request, res: Response) => {
  const { opportunityId, customTitle, customCompany, customUrl, status, appliedAt, notes } =
    req.body as Record<string, unknown>;

  const nextStatus: ApplicationStatus = APPLICATION_STATUSES.includes(status as ApplicationStatus)
    ? (status as ApplicationStatus)
    : 'Applied';

  const parsedDate = appliedAt ? new Date(String(appliedAt)) : new Date();
  if (Number.isNaN(parsedDate.getTime())) {
    throw new ApiError(400, 'Invalid application date.');
  }

  let resolvedOppId: string | null = null;
  let resolvedTitle = '';
  let resolvedCompany = '';
  let resolvedUrl = '';

  if (typeof opportunityId === 'string' && opportunityId.trim()) {
    const opp = await repository.findOpportunityById(opportunityId.trim());
    if (!opp || opp.status !== 'approved') {
      throw new ApiError(404, 'Referenced opportunity was not found.');
    }
    const duplicate = await repository.findApplicationByUserAndOpp(req.user!._id, opp._id);
    if (duplicate) {
      throw new ApiError(409, 'You are already tracking an application for this opportunity.');
    }
    resolvedOppId = opp._id;
    resolvedTitle = opp.title;
    resolvedCompany = opp.company;
    resolvedUrl = opp.applicationUrl;
  } else {
    resolvedTitle = typeof customTitle === 'string' ? customTitle.trim() : '';
    resolvedCompany = typeof customCompany === 'string' ? customCompany.trim() : '';
    resolvedUrl = typeof customUrl === 'string' ? customUrl.trim() : '';

    if (resolvedTitle.length < 2) {
      throw new ApiError(400, 'Role title is required when adding a custom application.');
    }
    if (resolvedCompany.length < 2) {
      throw new ApiError(400, 'Company name is required when adding a custom application.');
    }
    if (resolvedUrl && !isValidHttpUrl(resolvedUrl)) {
      throw new ApiError(400, 'External link must start with http:// or https://.');
    }
  }

  const created = await repository.createApplication({
    userId: req.user!._id,
    opportunityId: resolvedOppId,
    customTitle: resolvedTitle,
    customCompany: resolvedCompany,
    customUrl: resolvedUrl,
    status: nextStatus,
    appliedAt: parsedDate,
    notes: typeof notes === 'string' ? notes.trim().slice(0, 2000) : '',
  });

  res.status(201).json({
    success: true,
    application: created,
  });
});

export const getMyApplications = asyncHandler(async (req: Request, res: Response) => {
  const applications = await repository.listApplicationsByUser(req.user!._id);

  const summary = {
    total: applications.length,
    Applied: 0,
    Interview: 0,
    Shortlisted: 0,
    Selected: 0,
    Rejected: 0,
  };

  for (const app of applications) {
    if (app.status in summary) {
      summary[app.status] += 1;
    }
  }

  res.json({
    success: true,
    applications,
    summary,
  });
});

export const updateApplication = asyncHandler(async (req: Request, res: Response) => {
  const existing = await repository.findApplicationById(req.params.id);
  if (!existing) {
    throw new ApiError(404, 'Application record not found.');
  }
  if (existing.userId !== req.user!._id) {
    throw new ApiError(403, 'You do not have permission to update this application.');
  }

  const { status, notes, appliedAt, historyNote } = req.body as Record<string, unknown>;

  let nextStatus: ApplicationStatus | undefined;
  if (status !== undefined) {
    if (!APPLICATION_STATUSES.includes(status as ApplicationStatus)) {
      throw new ApiError(400, `Status must be one of: ${APPLICATION_STATUSES.join(', ')}.`);
    }
    nextStatus = status as ApplicationStatus;
  }

  let nextAppliedAt: Date | undefined;
  if (appliedAt !== undefined) {
    const parsed = new Date(String(appliedAt));
    if (Number.isNaN(parsed.getTime())) {
      throw new ApiError(400, 'Invalid application date.');
    }
    nextAppliedAt = parsed;
  }

  const updated = await repository.updateApplication(req.params.id, {
    status: nextStatus,
    notes: typeof notes === 'string' ? notes.trim().slice(0, 2000) : undefined,
    appliedAt: nextAppliedAt,
    historyNote: typeof historyNote === 'string' ? historyNote.trim().slice(0, 300) : undefined,
  });

  res.json({
    success: true,
    application: updated,
  });
});

export const deleteApplication = asyncHandler(async (req: Request, res: Response) => {
  const existing = await repository.findApplicationById(req.params.id);
  if (!existing) {
    throw new ApiError(404, 'Application record not found.');
  }
  if (existing.userId !== req.user!._id) {
    throw new ApiError(403, 'You do not have permission to delete this application.');
  }

  await repository.deleteApplication(req.params.id);
  res.json({
    success: true,
    message: 'Application removed from your tracker.',
  });
});

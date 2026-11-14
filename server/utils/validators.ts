import type { OpportunityType, WorkMode } from '../models/Opportunity.ts';
import type { ApplicationStatus } from '../models/Application.ts';

export const OPPORTUNITY_TYPES: OpportunityType[] = [
  'Full-time job',
  'Part-time job',
  'Internship',
  'Freelance',
];

export const WORK_MODES: WorkMode[] = ['Remote', 'On-site', 'Hybrid'];

export const APPLICATION_STATUSES: ApplicationStatus[] = [
  'Applied',
  'Interview',
  'Shortlisted',
  'Selected',
  'Rejected',
];

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function isValidHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value.trim());
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function normalizeSkills(input: unknown): string[] {
  if (Array.isArray(input)) {
    return Array.from(
      new Set(
        input
          .map((item) => String(item).trim())
          .filter((item) => item.length > 0 && item.length <= 40)
      )
    ).slice(0, 20);
  }
  if (typeof input === 'string') {
    return Array.from(
      new Set(
        input
          .split(',')
          .map((item) => item.trim())
          .filter((item) => item.length > 0 && item.length <= 40)
      )
    ).slice(0, 20);
  }
  return [];
}

export function validateOpportunityPayload(body: Record<string, unknown>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const company = typeof body.company === 'string' ? body.company.trim() : '';
  const description = typeof body.description === 'string' ? body.description.trim() : '';
  const type = typeof body.type === 'string' ? body.type : '';
  const workMode = typeof body.workMode === 'string' ? body.workMode : '';
  const location = typeof body.location === 'string' ? body.location.trim() : '';
  const applicationUrl = typeof body.applicationUrl === 'string' ? body.applicationUrl.trim() : '';

  if (title.length < 3 || title.length > 140) {
    errors.push('Opportunity title must be between 3 and 140 characters.');
  }
  if (company.length < 2 || company.length > 100) {
    errors.push('Company name must be between 2 and 100 characters.');
  }
  if (description.length < 20 || description.length > 5000) {
    errors.push('Description must be between 20 and 5000 characters.');
  }
  if (!OPPORTUNITY_TYPES.includes(type as OpportunityType)) {
    errors.push(`Opportunity type must be one of: ${OPPORTUNITY_TYPES.join(', ')}.`);
  }
  if (!WORK_MODES.includes(workMode as WorkMode)) {
    errors.push(`Work mode must be one of: ${WORK_MODES.join(', ')}.`);
  }
  if (location.length < 2 || location.length > 100) {
    errors.push('Location must be between 2 and 100 characters.');
  }
  if (!isValidHttpUrl(applicationUrl)) {
    errors.push('Application URL must be a valid http:// or https:// URL.');
  }
  if (body.deadline) {
    const parsedDate = new Date(String(body.deadline));
    if (Number.isNaN(parsedDate.getTime())) {
      errors.push('Application deadline must be a valid date.');
    }
  }

  return { valid: errors.length === 0, errors };
}

export type UserRole = 'user' | 'admin';

export interface UserActivityCounts {
  submissionsCount: number;
  applicationsCount: number;
  bookmarksCount: number;
}

export interface User {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  skills: string[];
  headline: string;
  location: string;
  bio: string;
  createdAt: string;
  updatedAt: string;
  activity?: UserActivityCounts;
}

export type OpportunityType = 'Full-time job' | 'Part-time job' | 'Internship' | 'Freelance';
export type WorkMode = 'Remote' | 'On-site' | 'Hybrid';
export type OpportunityStatus = 'pending' | 'approved' | 'rejected';

export interface Opportunity {
  _id: string;
  title: string;
  company: string;
  companyLogo: string;
  description: string;
  skills: string[];
  type: OpportunityType;
  workMode: WorkMode;
  location: string;
  stipend: string;
  isPaid: boolean;
  applicationUrl: string;
  deadline: string | null;
  status: OpportunityStatus;
  isSample: boolean;
  submittedBy: string | null;
  submittedByUser?: { _id: string; name: string; email: string } | null;
  reviewNote: string;
  createdAt: string;
  updatedAt: string;
}

export type ApplicationStatus = 'Applied' | 'Interview' | 'Shortlisted' | 'Selected' | 'Rejected';

export interface ApplicationHistoryEntry {
  status: ApplicationStatus;
  note: string;
  changedAt: string;
}

export interface Application {
  _id: string;
  userId: string;
  opportunityId: string | null;
  opportunity?: Opportunity | null;
  customTitle: string;
  customCompany: string;
  customUrl: string;
  status: ApplicationStatus;
  appliedAt: string;
  notes: string;
  history: ApplicationHistoryEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface ApplicationSummary {
  total: number;
  Applied: number;
  Interview: number;
  Shortlisted: number;
  Selected: number;
  Rejected: number;
}

export interface Bookmark {
  _id: string;
  userId: string;
  opportunityId: string;
  opportunity?: Opportunity | null;
  savedAt: string;
}

export interface NotificationItem {
  _id: string;
  userId: string;
  message: string;
  type: 'submission' | 'system' | 'application';
  link: string;
  read: boolean;
  createdAt: string;
}

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PublicStats {
  approvedOpportunities: number;
  activeInternships: number;
  contributors: number;
  trackedApplications: number;
  applicationsByStage: Array<{ stage: string; count: number }>;
}

export interface AdminRecentApplication {
  _id: string;
  status: ApplicationStatus;
  appliedAt: string;
  applicantName: string;
  roleTitle: string;
  companyName: string;
}

export interface AdminRecentUser {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
}

export interface AdminStats {
  totalUsers: number;
  adminCount: number;
  totalOpportunities: number;
  allOpportunities: number;
  realOpportunities: number;
  sampleOpportunities: number;
  pendingSubmissions: number;
  approvedOpportunities: number;
  rejectedSubmissions: number;
  totalApplications: number;
  totalBookmarks: number;
  byType: Array<{ name: string; count: number }>;
  byWorkMode: Array<{ name: string; count: number }>;
  byModerationStatus: Array<{ name: string; count: number }>;
  applicationsByStatus: Array<{ name: string; count: number }>;
  recentUsers: AdminRecentUser[];
  recentSubmissions: Opportunity[];
  recentApplications: AdminRecentApplication[];
}

export interface DatabaseStatusInfo {
  mode: 'mongodb' | 'local-fallback';
  connected: boolean;
  reason: string | null;
}

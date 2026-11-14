import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { isMongoActive } from '../config/db.ts';
import { UserModel, type UserRole } from '../models/User.ts';
import {
  OpportunityModel,
  type OpportunityStatus,
  type OpportunityType,
  type WorkMode,
} from '../models/Opportunity.ts';
import {
  ApplicationModel,
  type ApplicationStatus,
  type IApplicationHistoryEntry,
} from '../models/Application.ts';
import { BookmarkModel } from '../models/Bookmark.ts';
import { NotificationModel } from '../models/Notification.ts';

export interface UserRecord {
  _id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  skills: string[];
  headline: string;
  location: string;
  bio: string;
  createdAt: string;
  updatedAt: string;
}

export interface OpportunityRecord {
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
  reviewedBy: string | null;
  reviewNote: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApplicationRecord {
  _id: string;
  userId: string;
  opportunityId: string | null;
  opportunity?: OpportunityRecord | null;
  customTitle: string;
  customCompany: string;
  customUrl: string;
  status: ApplicationStatus;
  appliedAt: string;
  notes: string;
  history: Array<{ status: ApplicationStatus; note: string; changedAt: string }>;
  createdAt: string;
  updatedAt: string;
}

export interface BookmarkRecord {
  _id: string;
  userId: string;
  opportunityId: string;
  opportunity?: OpportunityRecord | null;
  savedAt: string;
}

export interface NotificationRecord {
  _id: string;
  userId: string;
  message: string;
  type: 'submission' | 'system' | 'application';
  link: string;
  read: boolean;
  createdAt: string;
}

interface LocalStoreSchema {
  users: UserRecord[];
  opportunities: OpportunityRecord[];
  applications: ApplicationRecord[];
  bookmarks: BookmarkRecord[];
  notifications: NotificationRecord[];
}

function getStorePath(): string {
  const override = process.env.LOCAL_STORE_PATH?.trim();
  if (override && process.env.NODE_ENV !== 'production') {
    return path.resolve(override);
  }
  return path.join(path.resolve(process.cwd(), '.data'), 'store.json');
}

function assertLocalFallbackAllowed(): void {
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'Local disk fallback storage is forbidden in production. Configure a live MongoDB connection.'
    );
  }
}

function genObjectId(): string {
  return crypto.randomBytes(12).toString('hex');
}

function readLocalStore(): LocalStoreSchema {
  assertLocalFallbackAllowed();
  const storePath = getStorePath();
  try {
    if (!fs.existsSync(storePath)) {
      fs.mkdirSync(path.dirname(storePath), { recursive: true });
      const empty: LocalStoreSchema = {
        users: [],
        opportunities: [],
        applications: [],
        bookmarks: [],
        notifications: [],
      };
      fs.writeFileSync(storePath, JSON.stringify(empty, null, 2));
      return empty;
    }
    const raw = fs.readFileSync(storePath, 'utf8');
    const parsed = JSON.parse(raw) as Partial<LocalStoreSchema>;
    return {
      users: parsed.users || [],
      opportunities: parsed.opportunities || [],
      applications: parsed.applications || [],
      bookmarks: parsed.bookmarks || [],
      notifications: parsed.notifications || [],
    };
  } catch {
    return {
      users: [],
      opportunities: [],
      applications: [],
      bookmarks: [],
      notifications: [],
    };
  }
}

function writeLocalStore(store: LocalStoreSchema): void {
  assertLocalFallbackAllowed();
  const storePath = getStorePath();
  fs.mkdirSync(path.dirname(storePath), { recursive: true });
  fs.writeFileSync(storePath, JSON.stringify(store, null, 2));
}

function toPlainId(val: unknown): string {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'object' && '_id' in (val as Record<string, unknown>)) {
    return String((val as Record<string, unknown>)._id);
  }
  return String(val);
}

function normalizeOppDoc(doc: Record<string, unknown>): OpportunityRecord {
  const sub = doc.submittedBy as Record<string, unknown> | string | null | undefined;
  let submittedByUser: { _id: string; name: string; email: string } | null = null;
  let submittedBy: string | null = null;
  if (sub && typeof sub === 'object' && '_id' in sub) {
    submittedBy = String(sub._id);
    submittedByUser = {
      _id: String(sub._id),
      name: String(sub.name || ''),
      email: String(sub.email || ''),
    };
  } else if (sub) {
    submittedBy = String(sub);
  }

  return {
    _id: String(doc._id),
    title: String(doc.title || ''),
    company: String(doc.company || ''),
    companyLogo: String(doc.companyLogo || ''),
    description: String(doc.description || ''),
    skills: Array.isArray(doc.skills) ? doc.skills.map(String) : [],
    type: doc.type as OpportunityType,
    workMode: doc.workMode as WorkMode,
    location: String(doc.location || ''),
    stipend: String(doc.stipend || 'Unpaid'),
    isPaid: Boolean(doc.isPaid),
    applicationUrl: String(doc.applicationUrl || ''),
    deadline: doc.deadline ? new Date(String(doc.deadline)).toISOString() : null,
    status: doc.status as OpportunityStatus,
    isSample: Boolean(doc.isSample),
    submittedBy,
    ...(submittedByUser ? { submittedByUser } : {}),
    reviewedBy: doc.reviewedBy ? toPlainId(doc.reviewedBy) : null,
    reviewNote: String(doc.reviewNote || ''),
    createdAt: doc.createdAt ? new Date(String(doc.createdAt)).toISOString() : new Date().toISOString(),
    updatedAt: doc.updatedAt ? new Date(String(doc.updatedAt)).toISOString() : new Date().toISOString(),
  };
}

function normalizeUserDoc(doc: Record<string, unknown>): UserRecord {
  return {
    _id: String(doc._id),
    name: String(doc.name || ''),
    email: String(doc.email || ''),
    passwordHash: String(doc.passwordHash || ''),
    role: (doc.role as UserRole) || 'user',
    skills: Array.isArray(doc.skills) ? doc.skills.map(String) : [],
    headline: String(doc.headline || ''),
    location: String(doc.location || ''),
    bio: String(doc.bio || ''),
    createdAt: doc.createdAt ? new Date(String(doc.createdAt)).toISOString() : new Date().toISOString(),
    updatedAt: doc.updatedAt ? new Date(String(doc.updatedAt)).toISOString() : new Date().toISOString(),
  };
}

export function sanitizeUser(user: UserRecord) {
  const { passwordHash: _ignored, ...safe } = user;
  return safe;
}

export const repository = {
  // ---------- USERS ----------
  async findUserByEmail(email: string): Promise<UserRecord | null> {
    const cleanEmail = email.toLowerCase().trim();
    if (isMongoActive()) {
      const doc = await UserModel.findOne({ email: cleanEmail }).lean();
      return doc ? normalizeUserDoc(doc as unknown as Record<string, unknown>) : null;
    }
    const store = readLocalStore();
    return store.users.find((u) => u.email === cleanEmail) || null;
  },

  async findUserById(id: string): Promise<UserRecord | null> {
    if (isMongoActive()) {
      if (!mongoose.isValidObjectId(id)) return null;
      const doc = await UserModel.findById(id).lean();
      return doc ? normalizeUserDoc(doc as unknown as Record<string, unknown>) : null;
    }
    const store = readLocalStore();
    return store.users.find((u) => u._id === id) || null;
  },

  async createUser(data: {
    name: string;
    email: string;
    passwordHash: string;
    role: UserRole;
    skills?: string[];
    headline?: string;
    location?: string;
    bio?: string;
  }): Promise<UserRecord> {
    if (isMongoActive()) {
      const created = await UserModel.create(data);
      return normalizeUserDoc(created.toObject() as unknown as Record<string, unknown>);
    }
    const store = readLocalStore();
    const now = new Date().toISOString();
    const record: UserRecord = {
      _id: genObjectId(),
      name: data.name.trim(),
      email: data.email.toLowerCase().trim(),
      passwordHash: data.passwordHash,
      role: data.role,
      skills: data.skills || [],
      headline: data.headline || '',
      location: data.location || '',
      bio: data.bio || '',
      createdAt: now,
      updatedAt: now,
    };
    store.users.push(record);
    writeLocalStore(store);
    return record;
  },

  async updateUserProfile(
    userId: string,
    updates: Partial<Pick<UserRecord, 'name' | 'skills' | 'headline' | 'location' | 'bio'>>
  ): Promise<UserRecord | null> {
    if (isMongoActive()) {
      const doc = await UserModel.findByIdAndUpdate(userId, { $set: updates }, { new: true }).lean();
      return doc ? normalizeUserDoc(doc as unknown as Record<string, unknown>) : null;
    }
    const store = readLocalStore();
    const idx = store.users.findIndex((u) => u._id === userId);
    if (idx === -1) return null;
    store.users[idx] = {
      ...store.users[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    writeLocalStore(store);
    return store.users[idx];
  },

  async listUsers(): Promise<UserRecord[]> {
    if (isMongoActive()) {
      const docs = await UserModel.find().sort({ createdAt: -1 }).lean();
      return docs.map((d) => normalizeUserDoc(d as unknown as Record<string, unknown>));
    }
    const store = readLocalStore();
    return [...store.users].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async listUsersWithActivity(): Promise<
    Array<
      UserRecord & {
        activity: { submissionsCount: number; applicationsCount: number; bookmarksCount: number };
      }
    >
  > {
    const users = await this.listUsers();
    if (isMongoActive()) {
      const [oppAgg, appAgg, bmAgg] = await Promise.all([
        OpportunityModel.aggregate([
          { $match: { submittedBy: { $ne: null } } },
          { $group: { _id: '$submittedBy', count: { $sum: 1 } } },
        ]),
        ApplicationModel.aggregate([{ $group: { _id: '$userId', count: { $sum: 1 } } }]),
        BookmarkModel.aggregate([{ $group: { _id: '$userId', count: { $sum: 1 } } }]),
      ]);
      const oppMap = new Map(oppAgg.map((r) => [String(r._id), Number(r.count)]));
      const appMap = new Map(appAgg.map((r) => [String(r._id), Number(r.count)]));
      const bmMap = new Map(bmAgg.map((r) => [String(r._id), Number(r.count)]));

      return users.map((u) => ({
        ...u,
        activity: {
          submissionsCount: oppMap.get(u._id) || 0,
          applicationsCount: appMap.get(u._id) || 0,
          bookmarksCount: bmMap.get(u._id) || 0,
        },
      }));
    }

    const store = readLocalStore();
    return users.map((u) => ({
      ...u,
      activity: {
        submissionsCount: store.opportunities.filter((o) => o.submittedBy === u._id).length,
        applicationsCount: store.applications.filter((a) => a.userId === u._id).length,
        bookmarksCount: store.bookmarks.filter((b) => b.userId === u._id).length,
      },
    }));
  },

  async updateUserRole(userId: string, role: UserRole): Promise<UserRecord | null> {
    if (isMongoActive()) {
      const doc = await UserModel.findByIdAndUpdate(userId, { $set: { role } }, { new: true }).lean();
      return doc ? normalizeUserDoc(doc as unknown as Record<string, unknown>) : null;
    }
    const store = readLocalStore();
    const idx = store.users.findIndex((u) => u._id === userId);
    if (idx === -1) return null;
    store.users[idx] = {
      ...store.users[idx],
      role,
      updatedAt: new Date().toISOString(),
    };
    writeLocalStore(store);
    return store.users[idx];
  },

  async updateUserPassword(userId: string, passwordHash: string): Promise<boolean> {
    if (isMongoActive()) {
      const res = await UserModel.findByIdAndUpdate(userId, { $set: { passwordHash } });
      return Boolean(res);
    }
    const store = readLocalStore();
    const idx = store.users.findIndex((u) => u._id === userId);
    if (idx === -1) return false;
    store.users[idx] = {
      ...store.users[idx],
      passwordHash,
      updatedAt: new Date().toISOString(),
    };
    writeLocalStore(store);
    return true;
  },

  async countUsers(): Promise<number> {
    if (isMongoActive()) {
      return UserModel.countDocuments();
    }
    return readLocalStore().users.length;
  },

  // ---------- OPPORTUNITIES ----------
  async queryOpportunities(params: {
    search?: string;
    type?: string;
    workMode?: string;
    location?: string;
    paid?: string;
    sort?: string;
    status?: OpportunityStatus | 'all';
    submittedBy?: string;
    excludeSample?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{
    items: OpportunityRecord[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(50, Math.max(1, params.limit || 9));

    if (isMongoActive()) {
      const filter: Record<string, unknown> = {};
      if (params.status && params.status !== 'all') {
        filter.status = params.status;
      }
      if (params.submittedBy) {
        filter.submittedBy = params.submittedBy;
      }
      if (params.excludeSample) {
        filter.isSample = { $ne: true };
      }
      if (params.type && params.type !== 'all') {
        filter.type = params.type;
      }
      if (params.workMode && params.workMode !== 'all') {
        filter.workMode = params.workMode;
      }
      if (params.location && params.location.trim()) {
        const escapedLoc = params.location.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        filter.location = { $regex: escapedLoc, $options: 'i' };
      }
      if (params.paid === 'paid') {
        filter.isPaid = true;
      } else if (params.paid === 'unpaid') {
        filter.isPaid = false;
      }
      if (params.search && params.search.trim()) {
        const escapedSearch = params.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const rx = { $regex: escapedSearch, $options: 'i' };
        filter.$or = [{ title: rx }, { company: rx }, { skills: rx }, { location: rx }];
      }

      const sortObj: Record<string, 1 | -1> =
        params.sort === 'deadline' ? { deadline: 1, createdAt: -1 } : { createdAt: -1 };

      const [docs, total] = await Promise.all([
        OpportunityModel.find(filter)
          .populate('submittedBy', 'name email')
          .sort(sortObj)
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
        OpportunityModel.countDocuments(filter),
      ]);

      return {
        items: docs.map((d) => normalizeOppDoc(d as unknown as Record<string, unknown>)),
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      };
    }

    const store = readLocalStore();
    const userMap = new Map(store.users.map((u) => [u._id, u]));

    let items = store.opportunities.filter((item) => {
      if (params.status && params.status !== 'all' && item.status !== params.status) return false;
      if (params.submittedBy && item.submittedBy !== params.submittedBy) return false;
      if (params.excludeSample && item.isSample) return false;
      if (params.type && params.type !== 'all' && item.type !== params.type) return false;
      if (params.workMode && params.workMode !== 'all' && item.workMode !== params.workMode) return false;
      if (
        params.location &&
        params.location.trim() &&
        !item.location.toLowerCase().includes(params.location.trim().toLowerCase())
      ) {
        return false;
      }
      if (params.paid === 'paid' && !item.isPaid) return false;
      if (params.paid === 'unpaid' && item.isPaid) return false;
      if (params.search && params.search.trim()) {
        const q = params.search.trim().toLowerCase();
        const matches =
          item.title.toLowerCase().includes(q) ||
          item.company.toLowerCase().includes(q) ||
          item.location.toLowerCase().includes(q) ||
          item.skills.some((s) => s.toLowerCase().includes(q));
        if (!matches) return false;
      }
      return true;
    });

    items = [...items].sort((a, b) => {
      if (params.sort === 'deadline') {
        const da = a.deadline ? new Date(a.deadline).getTime() : Number.MAX_SAFE_INTEGER;
        const db = b.deadline ? new Date(b.deadline).getTime() : Number.MAX_SAFE_INTEGER;
        if (da !== db) return da - db;
      }
      return b.createdAt.localeCompare(a.createdAt);
    });

    const total = items.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const sliced = items.slice((page - 1) * limit, page * limit).map((item) => {
      const subUser = item.submittedBy ? userMap.get(item.submittedBy) : null;
      return {
        ...item,
        submittedByUser: subUser
          ? { _id: subUser._id, name: subUser.name, email: subUser.email }
          : null,
      };
    });

    return { items: sliced, total, page, limit, totalPages };
  },

  async findOpportunityById(id: string): Promise<OpportunityRecord | null> {
    if (isMongoActive()) {
      if (!mongoose.isValidObjectId(id)) return null;
      const doc = await OpportunityModel.findById(id).populate('submittedBy', 'name email').lean();
      return doc ? normalizeOppDoc(doc as unknown as Record<string, unknown>) : null;
    }
    const store = readLocalStore();
    const opp = store.opportunities.find((o) => o._id === id);
    if (!opp) return null;
    const subUser = opp.submittedBy ? store.users.find((u) => u._id === opp.submittedBy) : null;
    return {
      ...opp,
      submittedByUser: subUser
        ? { _id: subUser._id, name: subUser.name, email: subUser.email }
        : null,
    };
  },

  async findDuplicateOpportunity(
    title: string,
    company: string,
    applicationUrl: string
  ): Promise<OpportunityRecord | null> {
    const cleanTitle = title.trim().toLowerCase();
    const cleanCompany = company.trim().toLowerCase();
    const cleanUrl = applicationUrl.trim().toLowerCase().replace(/\/+$/, '');

    if (isMongoActive()) {
      const candidates = await OpportunityModel.find({
        status: { $in: ['pending', 'approved'] },
      }).lean();
      const hit = candidates.find((c) => {
        const samePair =
          String(c.title).trim().toLowerCase() === cleanTitle &&
          String(c.company).trim().toLowerCase() === cleanCompany;
        const sameUrl =
          String(c.applicationUrl).trim().toLowerCase().replace(/\/+$/, '') === cleanUrl;
        return samePair || sameUrl;
      });
      return hit ? normalizeOppDoc(hit as unknown as Record<string, unknown>) : null;
    }

    const store = readLocalStore();
    return (
      store.opportunities.find((c) => {
        if (c.status === 'rejected') return false;
        const samePair =
          c.title.trim().toLowerCase() === cleanTitle &&
          c.company.trim().toLowerCase() === cleanCompany;
        const sameUrl = c.applicationUrl.trim().toLowerCase().replace(/\/+$/, '') === cleanUrl;
        return samePair || sameUrl;
      }) || null
    );
  },

  async createOpportunity(data: {
    title: string;
    company: string;
    companyLogo?: string;
    description: string;
    skills: string[];
    type: OpportunityType;
    workMode: WorkMode;
    location: string;
    stipend: string;
    isPaid: boolean;
    applicationUrl: string;
    deadline: Date | null;
    status: OpportunityStatus;
    isSample?: boolean;
    submittedBy: string | null;
  }): Promise<OpportunityRecord> {
    if (isMongoActive()) {
      const created = await OpportunityModel.create(data);
      return normalizeOppDoc(created.toObject() as unknown as Record<string, unknown>);
    }
    const store = readLocalStore();
    const now = new Date().toISOString();
    const record: OpportunityRecord = {
      _id: genObjectId(),
      title: data.title.trim(),
      company: data.company.trim(),
      companyLogo: data.companyLogo || '',
      description: data.description.trim(),
      skills: data.skills,
      type: data.type,
      workMode: data.workMode,
      location: data.location.trim(),
      stipend: data.stipend.trim() || (data.isPaid ? 'Competitive' : 'Unpaid'),
      isPaid: data.isPaid,
      applicationUrl: data.applicationUrl.trim(),
      deadline: data.deadline ? data.deadline.toISOString() : null,
      status: data.status,
      isSample: Boolean(data.isSample),
      submittedBy: data.submittedBy,
      reviewedBy: null,
      reviewNote: '',
      createdAt: now,
      updatedAt: now,
    };
    store.opportunities.push(record);
    writeLocalStore(store);
    return record;
  },

  async updateOpportunity(
    id: string,
    updates: Partial<{
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
      deadline: Date | null;
      status: OpportunityStatus;
      reviewedBy: string | null;
      reviewNote: string;
    }>
  ): Promise<OpportunityRecord | null> {
    if (isMongoActive()) {
      if (!mongoose.isValidObjectId(id)) return null;
      const doc = await OpportunityModel.findByIdAndUpdate(id, { $set: updates }, { new: true })
        .populate('submittedBy', 'name email')
        .lean();
      return doc ? normalizeOppDoc(doc as unknown as Record<string, unknown>) : null;
    }
    const store = readLocalStore();
    const idx = store.opportunities.findIndex((o) => o._id === id);
    if (idx === -1) return null;
    const { deadline, ...rest } = updates;
    store.opportunities[idx] = {
      ...store.opportunities[idx],
      ...rest,
      ...(deadline !== undefined ? { deadline: deadline ? deadline.toISOString() : null } : {}),
      updatedAt: new Date().toISOString(),
    };
    writeLocalStore(store);
    return store.opportunities[idx];
  },

  async deleteOpportunity(id: string): Promise<boolean> {
    if (isMongoActive()) {
      if (!mongoose.isValidObjectId(id)) return false;
      const deleted = await OpportunityModel.findByIdAndDelete(id);
      if (!deleted) return false;
      await BookmarkModel.deleteMany({ opportunityId: id });
      return true;
    }
    const store = readLocalStore();
    const before = store.opportunities.length;
    store.opportunities = store.opportunities.filter((o) => o._id !== id);
    if (store.opportunities.length === before) return false;
    store.bookmarks = store.bookmarks.filter((b) => b.opportunityId !== id);
    writeLocalStore(store);
    return true;
  },

  async purgeSampleOpportunities(): Promise<number> {
    if (isMongoActive()) {
      const sampleDocs = await OpportunityModel.find({ isSample: true }).select('_id').lean();
      const ids = sampleDocs.map((d) => d._id);
      if (ids.length === 0) return 0;
      await BookmarkModel.deleteMany({ opportunityId: { $in: ids } });
      const res = await OpportunityModel.deleteMany({ isSample: true });
      return res.deletedCount || 0;
    }
    const store = readLocalStore();
    const sampleIds = new Set(store.opportunities.filter((o) => o.isSample).map((o) => o._id));
    if (sampleIds.size === 0) return 0;
    store.opportunities = store.opportunities.filter((o) => !o.isSample);
    store.bookmarks = store.bookmarks.filter((b) => !sampleIds.has(b.opportunityId));
    writeLocalStore(store);
    return sampleIds.size;
  },

  async getPublicStats(): Promise<{
    approvedOpportunities: number;
    activeInternships: number;
    contributors: number;
    trackedApplications: number;
    applicationsByStage: Array<{ stage: string; count: number }>;
  }> {
    const stages: ApplicationStatus[] = ['Applied', 'Shortlisted', 'Interview', 'Selected'];
    if (isMongoActive()) {
      const [approvedOpportunities, activeInternships, contributors, trackedApplications, appDocs] =
        await Promise.all([
          OpportunityModel.countDocuments({ status: 'approved' }),
          OpportunityModel.countDocuments({ status: 'approved', type: 'Internship' }),
          UserModel.countDocuments(),
          ApplicationModel.countDocuments(),
          ApplicationModel.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
        ]);
      const stageMap = new Map(appDocs.map((r) => [String(r._id), Number(r.count)]));
      return {
        approvedOpportunities,
        activeInternships,
        contributors,
        trackedApplications,
        applicationsByStage: stages.map((stage) => ({
          stage,
          count: stageMap.get(stage) || 0,
        })),
      };
    }
    const store = readLocalStore();
    const approved = store.opportunities.filter((o) => o.status === 'approved');
    const stageCounts = new Map<string, number>();
    for (const app of store.applications) {
      stageCounts.set(app.status, (stageCounts.get(app.status) || 0) + 1);
    }
    return {
      approvedOpportunities: approved.length,
      activeInternships: approved.filter((o) => o.type === 'Internship').length,
      contributors: store.users.length,
      trackedApplications: store.applications.length,
      applicationsByStage: stages.map((stage) => ({
        stage,
        count: stageCounts.get(stage) || 0,
      })),
    };
  },

  // ---------- APPLICATIONS ----------
  async listApplicationsByUser(userId: string): Promise<ApplicationRecord[]> {
    if (isMongoActive()) {
      const docs = await ApplicationModel.find({ userId })
        .populate('opportunityId')
        .sort({ appliedAt: -1, createdAt: -1 })
        .lean();

      return docs.map((d) => {
        const opp = d.opportunityId as unknown as Record<string, unknown> | null;
        return {
          _id: String(d._id),
          userId: String(d.userId),
          opportunityId: opp ? String(opp._id) : null,
          opportunity: opp ? normalizeOppDoc(opp) : null,
          customTitle: String(d.customTitle || ''),
          customCompany: String(d.customCompany || ''),
          customUrl: String(d.customUrl || ''),
          status: d.status as ApplicationStatus,
          appliedAt: d.appliedAt ? new Date(d.appliedAt).toISOString() : new Date().toISOString(),
          notes: String(d.notes || ''),
          history: (d.history || []).map((h: IApplicationHistoryEntry) => ({
            status: h.status,
            note: h.note || '',
            changedAt: h.changedAt ? new Date(h.changedAt).toISOString() : new Date().toISOString(),
          })),
          createdAt: d.createdAt ? new Date(d.createdAt).toISOString() : new Date().toISOString(),
          updatedAt: d.updatedAt ? new Date(d.updatedAt).toISOString() : new Date().toISOString(),
        };
      });
    }

    const store = readLocalStore();
    const oppMap = new Map(store.opportunities.map((o) => [o._id, o]));
    return store.applications
      .filter((a) => a.userId === userId)
      .sort((a, b) => b.appliedAt.localeCompare(a.appliedAt))
      .map((a) => ({
        ...a,
        opportunity: a.opportunityId ? oppMap.get(a.opportunityId) || null : null,
      }));
  },

  async findApplicationByUserAndOpp(
    userId: string,
    opportunityId: string
  ): Promise<ApplicationRecord | null> {
    if (isMongoActive()) {
      if (!mongoose.isValidObjectId(opportunityId)) return null;
      const doc = await ApplicationModel.findOne({ userId, opportunityId }).lean();
      if (!doc) return null;
      return {
        _id: String(doc._id),
        userId: String(doc.userId),
        opportunityId: String(doc.opportunityId),
        customTitle: String(doc.customTitle || ''),
        customCompany: String(doc.customCompany || ''),
        customUrl: String(doc.customUrl || ''),
        status: doc.status as ApplicationStatus,
        appliedAt: new Date(doc.appliedAt).toISOString(),
        notes: String(doc.notes || ''),
        history: (doc.history || []).map((h: IApplicationHistoryEntry) => ({
          status: h.status,
          note: h.note || '',
          changedAt: new Date(h.changedAt).toISOString(),
        })),
        createdAt: new Date(doc.createdAt).toISOString(),
        updatedAt: new Date(doc.updatedAt).toISOString(),
      };
    }
    const store = readLocalStore();
    return (
      store.applications.find((a) => a.userId === userId && a.opportunityId === opportunityId) ||
      null
    );
  },

  async createApplication(data: {
    userId: string;
    opportunityId: string | null;
    customTitle?: string;
    customCompany?: string;
    customUrl?: string;
    status: ApplicationStatus;
    appliedAt: Date;
    notes: string;
  }): Promise<ApplicationRecord> {
    const initialHistory = [
      {
        status: data.status,
        note: data.notes || `Added with status ${data.status}`,
        changedAt: data.appliedAt,
      },
    ];

    if (isMongoActive()) {
      const created = await ApplicationModel.create({
        ...data,
        history: initialHistory,
      });
      const populated = await ApplicationModel.findById(created._id).populate('opportunityId').lean();
      const d = populated!;
      const opp = d.opportunityId as unknown as Record<string, unknown> | null;
      return {
        _id: String(d._id),
        userId: String(d.userId),
        opportunityId: opp ? String(opp._id) : null,
        opportunity: opp ? normalizeOppDoc(opp) : null,
        customTitle: String(d.customTitle || ''),
        customCompany: String(d.customCompany || ''),
        customUrl: String(d.customUrl || ''),
        status: d.status as ApplicationStatus,
        appliedAt: new Date(d.appliedAt).toISOString(),
        notes: String(d.notes || ''),
        history: (d.history || []).map((h: IApplicationHistoryEntry) => ({
          status: h.status,
          note: h.note || '',
          changedAt: new Date(h.changedAt).toISOString(),
        })),
        createdAt: new Date(d.createdAt).toISOString(),
        updatedAt: new Date(d.updatedAt).toISOString(),
      };
    }

    const store = readLocalStore();
    const now = new Date().toISOString();
    const opp = data.opportunityId
      ? store.opportunities.find((o) => o._id === data.opportunityId) || null
      : null;

    const record: ApplicationRecord = {
      _id: genObjectId(),
      userId: data.userId,
      opportunityId: data.opportunityId,
      customTitle: data.customTitle || '',
      customCompany: data.customCompany || '',
      customUrl: data.customUrl || '',
      status: data.status,
      appliedAt: data.appliedAt.toISOString(),
      notes: data.notes,
      history: initialHistory.map((h) => ({ ...h, changedAt: h.changedAt.toISOString() })),
      createdAt: now,
      updatedAt: now,
    };
    store.applications.push(record);
    writeLocalStore(store);
    return { ...record, opportunity: opp };
  },

  async findApplicationById(id: string): Promise<ApplicationRecord | null> {
    if (isMongoActive()) {
      if (!mongoose.isValidObjectId(id)) return null;
      const d = await ApplicationModel.findById(id).populate('opportunityId').lean();
      if (!d) return null;
      const opp = d.opportunityId as unknown as Record<string, unknown> | null;
      return {
        _id: String(d._id),
        userId: String(d.userId),
        opportunityId: opp ? String(opp._id) : null,
        opportunity: opp ? normalizeOppDoc(opp) : null,
        customTitle: String(d.customTitle || ''),
        customCompany: String(d.customCompany || ''),
        customUrl: String(d.customUrl || ''),
        status: d.status as ApplicationStatus,
        appliedAt: new Date(d.appliedAt).toISOString(),
        notes: String(d.notes || ''),
        history: (d.history || []).map((h: IApplicationHistoryEntry) => ({
          status: h.status,
          note: h.note || '',
          changedAt: new Date(h.changedAt).toISOString(),
        })),
        createdAt: new Date(d.createdAt).toISOString(),
        updatedAt: new Date(d.updatedAt).toISOString(),
      };
    }
    const store = readLocalStore();
    const found = store.applications.find((a) => a._id === id);
    if (!found) return null;
    const opp = found.opportunityId
      ? store.opportunities.find((o) => o._id === found.opportunityId) || null
      : null;
    return { ...found, opportunity: opp };
  },

  async updateApplication(
    id: string,
    updates: {
      status?: ApplicationStatus;
      notes?: string;
      appliedAt?: Date;
      historyNote?: string;
    }
  ): Promise<ApplicationRecord | null> {
    if (isMongoActive()) {
      if (!mongoose.isValidObjectId(id)) return null;
      const doc = await ApplicationModel.findById(id);
      if (!doc) return null;

      const prevStatus = doc.status;
      if (updates.status && updates.status !== prevStatus) {
        doc.status = updates.status;
        doc.history.push({
          status: updates.status,
          note: updates.historyNote || `Moved from ${prevStatus} to ${updates.status}`,
          changedAt: new Date(),
        });
      }
      if (updates.notes !== undefined) {
        doc.notes = updates.notes;
      }
      if (updates.appliedAt !== undefined) {
        doc.appliedAt = updates.appliedAt;
      }
      await doc.save();
      return this.findApplicationById(id);
    }

    const store = readLocalStore();
    const idx = store.applications.findIndex((a) => a._id === id);
    if (idx === -1) return null;
    const current = store.applications[idx];
    const nextHistory = [...current.history];
    if (updates.status && updates.status !== current.status) {
      nextHistory.push({
        status: updates.status,
        note: updates.historyNote || `Moved from ${current.status} to ${updates.status}`,
        changedAt: new Date().toISOString(),
      });
    }
    store.applications[idx] = {
      ...current,
      status: updates.status ?? current.status,
      notes: updates.notes !== undefined ? updates.notes : current.notes,
      appliedAt: updates.appliedAt ? updates.appliedAt.toISOString() : current.appliedAt,
      history: nextHistory,
      updatedAt: new Date().toISOString(),
    };
    writeLocalStore(store);
    return this.findApplicationById(id);
  },

  async deleteApplication(id: string): Promise<boolean> {
    if (isMongoActive()) {
      if (!mongoose.isValidObjectId(id)) return false;
      const deleted = await ApplicationModel.findByIdAndDelete(id);
      return Boolean(deleted);
    }
    const store = readLocalStore();
    const before = store.applications.length;
    store.applications = store.applications.filter((a) => a._id !== id);
    if (store.applications.length === before) return false;
    writeLocalStore(store);
    return true;
  },

  // ---------- BOOKMARKS ----------
  async listBookmarksByUser(userId: string): Promise<BookmarkRecord[]> {
    if (isMongoActive()) {
      const docs = await BookmarkModel.find({ userId })
        .populate('opportunityId')
        .sort({ savedAt: -1 })
        .lean();
      return docs
        .filter((d) => Boolean(d.opportunityId))
        .map((d) => {
          const opp = d.opportunityId as unknown as Record<string, unknown>;
          return {
            _id: String(d._id),
            userId: String(d.userId),
            opportunityId: String(opp._id),
            opportunity: normalizeOppDoc(opp),
            savedAt: new Date(d.savedAt).toISOString(),
          };
        });
    }
    const store = readLocalStore();
    const oppMap = new Map(store.opportunities.map((o) => [o._id, o]));
    return store.bookmarks
      .filter((b) => b.userId === userId && oppMap.has(b.opportunityId))
      .sort((a, b) => b.savedAt.localeCompare(a.savedAt))
      .map((b) => ({
        ...b,
        opportunity: oppMap.get(b.opportunityId) || null,
      }));
  },

  async findBookmark(userId: string, opportunityId: string): Promise<BookmarkRecord | null> {
    if (isMongoActive()) {
      if (!mongoose.isValidObjectId(opportunityId)) return null;
      const d = await BookmarkModel.findOne({ userId, opportunityId }).lean();
      if (!d) return null;
      return {
        _id: String(d._id),
        userId: String(d.userId),
        opportunityId: String(d.opportunityId),
        savedAt: new Date(d.savedAt).toISOString(),
      };
    }
    const store = readLocalStore();
    return store.bookmarks.find((b) => b.userId === userId && b.opportunityId === opportunityId) || null;
  },

  async createBookmark(userId: string, opportunityId: string): Promise<BookmarkRecord> {
    if (isMongoActive()) {
      const created = await BookmarkModel.create({ userId, opportunityId, savedAt: new Date() });
      const opp = await this.findOpportunityById(opportunityId);
      return {
        _id: String(created._id),
        userId,
        opportunityId,
        opportunity: opp,
        savedAt: created.savedAt.toISOString(),
      };
    }
    const store = readLocalStore();
    const record: BookmarkRecord = {
      _id: genObjectId(),
      userId,
      opportunityId,
      savedAt: new Date().toISOString(),
    };
    store.bookmarks.push(record);
    writeLocalStore(store);
    const opp = store.opportunities.find((o) => o._id === opportunityId) || null;
    return { ...record, opportunity: opp };
  },

  async deleteBookmarkForUser(userId: string, idOrOpportunityId: string): Promise<boolean> {
    if (isMongoActive()) {
      if (!mongoose.isValidObjectId(idOrOpportunityId)) return false;
      const res = await BookmarkModel.findOneAndDelete({
        userId,
        $or: [{ _id: idOrOpportunityId }, { opportunityId: idOrOpportunityId }],
      });
      return Boolean(res);
    }
    const store = readLocalStore();
    const before = store.bookmarks.length;
    store.bookmarks = store.bookmarks.filter(
      (b) =>
        !(
          b.userId === userId &&
          (b._id === idOrOpportunityId || b.opportunityId === idOrOpportunityId)
        )
    );
    if (store.bookmarks.length === before) return false;
    writeLocalStore(store);
    return true;
  },

  // ---------- NOTIFICATIONS ----------
  async createNotification(data: {
    userId: string;
    message: string;
    type?: 'submission' | 'system' | 'application';
    link?: string;
  }): Promise<NotificationRecord> {
    if (isMongoActive()) {
      const created = await NotificationModel.create({
        userId: data.userId,
        message: data.message,
        type: data.type || 'system',
        link: data.link || '/dashboard',
        read: false,
      });
      return {
        _id: String(created._id),
        userId: String(created.userId),
        message: created.message,
        type: created.type,
        link: created.link,
        read: created.read,
        createdAt: created.createdAt.toISOString(),
      };
    }
    const store = readLocalStore();
    const record: NotificationRecord = {
      _id: genObjectId(),
      userId: data.userId,
      message: data.message,
      type: data.type || 'system',
      link: data.link || '/dashboard',
      read: false,
      createdAt: new Date().toISOString(),
    };
    store.notifications.push(record);
    writeLocalStore(store);
    return record;
  },

  async listNotifications(userId: string): Promise<NotificationRecord[]> {
    if (isMongoActive()) {
      const docs = await NotificationModel.find({ userId })
        .sort({ createdAt: -1 })
        .limit(30)
        .lean();
      return docs.map((d) => ({
        _id: String(d._id),
        userId: String(d.userId),
        message: d.message,
        type: d.type,
        link: d.link,
        read: d.read,
        createdAt: new Date(d.createdAt).toISOString(),
      }));
    }
    return readLocalStore()
      .notifications.filter((n) => n.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 30);
  },

  async markNotificationRead(userId: string, id: string): Promise<boolean> {
    if (isMongoActive()) {
      if (!mongoose.isValidObjectId(id)) return false;
      const res = await NotificationModel.findOneAndUpdate(
        { _id: id, userId },
        { $set: { read: true } }
      );
      return Boolean(res);
    }
    const store = readLocalStore();
    const item = store.notifications.find((n) => n._id === id && n.userId === userId);
    if (!item) return false;
    item.read = true;
    writeLocalStore(store);
    return true;
  },

  async markAllNotificationsRead(userId: string): Promise<void> {
    if (isMongoActive()) {
      await NotificationModel.updateMany({ userId, read: false }, { $set: { read: true } });
      return;
    }
    const store = readLocalStore();
    store.notifications = store.notifications.map((n) =>
      n.userId === userId ? { ...n, read: true } : n
    );
    writeLocalStore(store);
  },

  // ---------- ADMIN DASHBOARD ANALYTICS ----------
  async getAdminStats(excludeSample = false) {
    const oppTypes: OpportunityType[] = ['Full-time job', 'Part-time job', 'Internship', 'Freelance'];
    const workModes: WorkMode[] = ['Remote', 'Hybrid', 'On-site'];
    const appStatuses: ApplicationStatus[] = [
      'Applied',
      'Interview',
      'Shortlisted',
      'Selected',
      'Rejected',
    ];

    if (isMongoActive()) {
      const oppFilter = excludeSample ? { isSample: { $ne: true } } : {};
      const [
        totalUsers,
        adminCount,
        allOppsCount,
        realOpportunities,
        sampleOpportunities,
        totalApplications,
        totalBookmarks,
        filteredOpps,
        appDocs,
        recentUserDocs,
        recentSubDocs,
        recentAppDocs,
      ] = await Promise.all([
        UserModel.countDocuments(),
        UserModel.countDocuments({ role: 'admin' }),
        OpportunityModel.countDocuments(),
        OpportunityModel.countDocuments({ isSample: { $ne: true } }),
        OpportunityModel.countDocuments({ isSample: true }),
        ApplicationModel.countDocuments(),
        BookmarkModel.countDocuments(),
        OpportunityModel.find(oppFilter).select('type workMode status').lean(),
        ApplicationModel.find().select('status').lean(),
        UserModel.find().sort({ createdAt: -1 }).limit(5).lean(),
        OpportunityModel.find(oppFilter)
          .populate('submittedBy', 'name email')
          .sort({ createdAt: -1 })
          .limit(5)
          .lean(),
        ApplicationModel.find()
          .populate('userId', 'name email')
          .populate('opportunityId', 'title company')
          .sort({ createdAt: -1 })
          .limit(5)
          .lean(),
      ]);

      const byTypeMap = new Map<string, number>();
      const byWorkModeMap = new Map<string, number>();
      let pendingSubmissions = 0;
      let approvedOpportunities = 0;
      let rejectedSubmissions = 0;

      for (const o of filteredOpps) {
        byTypeMap.set(o.type, (byTypeMap.get(o.type) || 0) + 1);
        byWorkModeMap.set(o.workMode, (byWorkModeMap.get(o.workMode) || 0) + 1);
        if (o.status === 'pending') pendingSubmissions += 1;
        else if (o.status === 'approved') approvedOpportunities += 1;
        else if (o.status === 'rejected') rejectedSubmissions += 1;
      }

      const appMap = new Map<string, number>();
      for (const a of appDocs) {
        appMap.set(a.status, (appMap.get(a.status) || 0) + 1);
      }

      return {
        totalUsers,
        adminCount,
        totalOpportunities: filteredOpps.length,
        allOpportunities: allOppsCount,
        realOpportunities,
        sampleOpportunities,
        pendingSubmissions,
        approvedOpportunities,
        rejectedSubmissions,
        totalApplications,
        totalBookmarks,
        byType: oppTypes.map((name) => ({ name, count: byTypeMap.get(name) || 0 })),
        byWorkMode: workModes.map((name) => ({ name, count: byWorkModeMap.get(name) || 0 })),
        byModerationStatus: [
          { name: 'Pending', count: pendingSubmissions },
          { name: 'Approved', count: approvedOpportunities },
          { name: 'Rejected', count: rejectedSubmissions },
        ],
        applicationsByStatus: appStatuses.map((name) => ({ name, count: appMap.get(name) || 0 })),
        recentUsers: recentUserDocs.map((u) => ({
          _id: String(u._id),
          name: u.name,
          email: u.email,
          role: u.role,
          createdAt: new Date(u.createdAt).toISOString(),
        })),
        recentSubmissions: recentSubDocs.map((d) =>
          normalizeOppDoc(d as unknown as Record<string, unknown>)
        ),
        recentApplications: recentAppDocs.map((a) => {
          const applicant = a.userId as unknown as { name?: string; email?: string } | null;
          const opp = a.opportunityId as unknown as { title?: string; company?: string } | null;
          return {
            _id: String(a._id),
            status: a.status as ApplicationStatus,
            appliedAt: new Date(a.appliedAt).toISOString(),
            applicantName: applicant?.name || 'Member',
            roleTitle: opp?.title || a.customTitle || 'Role',
            companyName: opp?.company || a.customCompany || 'Company',
          };
        }),
      };
    }

    const store = readLocalStore();
    const userMap = new Map(store.users.map((u) => [u._id, u]));
    const oppMap = new Map(store.opportunities.map((o) => [o._id, o]));

    const allOpps = store.opportunities;
    const filteredOpps = excludeSample ? allOpps.filter((o) => !o.isSample) : allOpps;

    const byTypeMap = new Map<string, number>();
    const byWorkModeMap = new Map<string, number>();
    let pendingSubmissions = 0;
    let approvedOpportunities = 0;
    let rejectedSubmissions = 0;

    for (const o of filteredOpps) {
      byTypeMap.set(o.type, (byTypeMap.get(o.type) || 0) + 1);
      byWorkModeMap.set(o.workMode, (byWorkModeMap.get(o.workMode) || 0) + 1);
      if (o.status === 'pending') pendingSubmissions += 1;
      else if (o.status === 'approved') approvedOpportunities += 1;
      else if (o.status === 'rejected') rejectedSubmissions += 1;
    }

    const appMap = new Map<string, number>();
    for (const a of store.applications) {
      appMap.set(a.status, (appMap.get(a.status) || 0) + 1);
    }

    const recentUsers = [...store.users]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 5)
      .map((u) => ({
        _id: u._id,
        name: u.name,
        email: u.email,
        role: u.role,
        createdAt: u.createdAt,
      }));

    const recentSubmissions = [...filteredOpps]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 5)
      .map((o) => {
        const sub = o.submittedBy ? userMap.get(o.submittedBy) : null;
        return {
          ...o,
          submittedByUser: sub ? { _id: sub._id, name: sub.name, email: sub.email } : null,
        };
      });

    const recentApplications = [...store.applications]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 5)
      .map((a) => {
        const applicant = userMap.get(a.userId);
        const opp = a.opportunityId ? oppMap.get(a.opportunityId) : null;
        return {
          _id: a._id,
          status: a.status,
          appliedAt: a.appliedAt,
          applicantName: applicant?.name || 'Member',
          roleTitle: opp?.title || a.customTitle || 'Role',
          companyName: opp?.company || a.customCompany || 'Company',
        };
      });

    return {
      totalUsers: store.users.length,
      adminCount: store.users.filter((u) => u.role === 'admin').length,
      totalOpportunities: filteredOpps.length,
      allOpportunities: allOpps.length,
      realOpportunities: allOpps.filter((o) => !o.isSample).length,
      sampleOpportunities: allOpps.filter((o) => o.isSample).length,
      pendingSubmissions,
      approvedOpportunities,
      rejectedSubmissions,
      totalApplications: store.applications.length,
      totalBookmarks: store.bookmarks.length,
      byType: oppTypes.map((name) => ({ name, count: byTypeMap.get(name) || 0 })),
      byWorkMode: workModes.map((name) => ({ name, count: byWorkModeMap.get(name) || 0 })),
      byModerationStatus: [
        { name: 'Pending', count: pendingSubmissions },
        { name: 'Approved', count: approvedOpportunities },
        { name: 'Rejected', count: rejectedSubmissions },
      ],
      applicationsByStatus: appStatuses.map((name) => ({ name, count: appMap.get(name) || 0 })),
      recentUsers,
      recentSubmissions,
      recentApplications,
    };
  },
};

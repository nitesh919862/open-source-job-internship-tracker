import axios from 'axios';
import type {
  AdminStats,
  Application,
  ApplicationStatus,
  ApplicationSummary,
  Bookmark,
  DatabaseStatusInfo,
  NotificationItem,
  Opportunity,
  Pagination,
  PublicStats,
  User,
  UserRole,
} from '../types';

const TOKEN_KEY = 'opentrack_jwt_token';

const baseURL = import.meta.env.VITE_API_URL
  ? `${String(import.meta.env.VITE_API_URL).replace(/\/$/, '')}/api`
  : '/api';

export const apiClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null): void {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export function extractApiError(err: unknown, fallback = 'Something went wrong.'): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { message?: string; errors?: string[] } | undefined;
    if (data?.message) return data.message;
    if (data?.errors && data.errors.length > 0) return data.errors[0];
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

export const healthApi = {
  async getHealth(): Promise<{ status: string; database: DatabaseStatusInfo }> {
    const { data } = await apiClient.get('/health');
    return data;
  },
};

export const authApi = {
  async register(payload: {
    name: string;
    email: string;
    password: string;
    skills?: string[];
    headline?: string;
    location?: string;
  }): Promise<{ token: string; user: User }> {
    const { data } = await apiClient.post('/auth/register', payload);
    return data;
  },

  async login(payload: { email: string; password: string }): Promise<{ token: string; user: User }> {
    const { data } = await apiClient.post('/auth/login', payload);
    return data;
  },

  async getMe(): Promise<{ user: User }> {
    const { data } = await apiClient.get('/auth/me');
    return data;
  },

  async updateProfile(payload: {
    name?: string;
    skills?: string[];
    headline?: string;
    location?: string;
    bio?: string;
  }): Promise<{ user: User }> {
    const { data } = await apiClient.patch('/auth/profile', payload);
    return data;
  },
};

export const opportunitiesApi = {
  async list(params?: {
    search?: string;
    type?: string;
    workMode?: string;
    location?: string;
    paid?: string;
    sort?: string;
    page?: number;
    limit?: number;
  }): Promise<{ items: Opportunity[]; pagination: Pagination }> {
    const { data } = await apiClient.get('/opportunities', { params });
    return data;
  },

  async getStats(): Promise<{ stats: PublicStats }> {
    const { data } = await apiClient.get('/opportunities/stats');
    return data;
  },

  async getById(id: string): Promise<{ opportunity: Opportunity }> {
    const { data } = await apiClient.get(`/opportunities/${id}`);
    return data;
  },

  async submit(payload: {
    title: string;
    company: string;
    description: string;
    skills: string[] | string;
    type: string;
    workMode: string;
    location: string;
    stipend: string;
    isPaid: boolean;
    applicationUrl: string;
    deadline?: string;
  }): Promise<{ message: string; opportunity: Opportunity }> {
    const { data } = await apiClient.post('/opportunities/submit', payload);
    return data;
  },

  async getMySubmissions(): Promise<{ items: Opportunity[] }> {
    const { data } = await apiClient.get('/opportunities/my-submissions');
    return data;
  },
};

export const applicationsApi = {
  async listMy(): Promise<{ applications: Application[]; summary: ApplicationSummary }> {
    const { data } = await apiClient.get('/applications/my');
    return data;
  },

  async create(payload: {
    opportunityId?: string;
    customTitle?: string;
    customCompany?: string;
    customUrl?: string;
    status?: ApplicationStatus;
    appliedAt?: string;
    notes?: string;
  }): Promise<{ application: Application }> {
    const { data } = await apiClient.post('/applications', payload);
    return data;
  },

  async update(
    id: string,
    payload: {
      status?: ApplicationStatus;
      notes?: string;
      appliedAt?: string;
      historyNote?: string;
    }
  ): Promise<{ application: Application }> {
    const { data } = await apiClient.patch(`/applications/${id}`, payload);
    return data;
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`/applications/${id}`);
  },
};

export const bookmarksApi = {
  async list(): Promise<{ bookmarks: Bookmark[] }> {
    const { data } = await apiClient.get('/bookmarks');
    return data;
  },

  async create(opportunityId: string): Promise<{ bookmark: Bookmark }> {
    const { data } = await apiClient.post('/bookmarks', { opportunityId });
    return data;
  },

  async remove(idOrOpportunityId: string): Promise<void> {
    await apiClient.delete(`/bookmarks/${idOrOpportunityId}`);
  },
};

export const notificationsApi = {
  async list(): Promise<{ notifications: NotificationItem[]; unreadCount: number }> {
    const { data } = await apiClient.get('/notifications');
    return data;
  },

  async markRead(id: string): Promise<void> {
    await apiClient.patch(`/notifications/${id}/read`);
  },

  async markAllRead(): Promise<void> {
    await apiClient.patch('/notifications/read-all');
  },
};

export const adminApi = {
  async getDashboard(params?: { excludeSample?: boolean }): Promise<{ stats: AdminStats }> {
    const { data } = await apiClient.get('/admin/dashboard', { params });
    return data;
  },

  async listSubmissions(params?: {
    status?: string;
    search?: string;
    type?: string;
    excludeSample?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{ items: Opportunity[]; pagination: Pagination }> {
    const { data } = await apiClient.get('/admin/submissions', { params });
    return data;
  },

  async moderateSubmission(
    id: string,
    payload: { status: 'approved' | 'rejected'; reviewNote?: string }
  ): Promise<{ opportunity: Opportunity }> {
    const { data } = await apiClient.patch(`/admin/submissions/${id}`, payload);
    return data;
  },

  async createOpportunity(payload: Record<string, unknown>): Promise<{ opportunity: Opportunity }> {
    const { data } = await apiClient.post('/admin/opportunities', payload);
    return data;
  },

  async updateOpportunity(
    id: string,
    payload: Record<string, unknown>
  ): Promise<{ opportunity: Opportunity }> {
    const { data } = await apiClient.put(`/admin/opportunities/${id}`, payload);
    return data;
  },

  async deleteOpportunity(id: string): Promise<void> {
    await apiClient.delete(`/admin/opportunities/${id}`);
  },

  async purgeSampleData(): Promise<{ deletedCount: number; message: string }> {
    const { data } = await apiClient.delete('/admin/sample-data');
    return data;
  },

  async listUsers(params?: { search?: string }): Promise<{ users: User[] }> {
    const { data } = await apiClient.get('/admin/users', { params });
    return data;
  },

  async updateUserRole(id: string, role: UserRole): Promise<{ user: User }> {
    const { data } = await apiClient.patch(`/admin/users/${id}/role`, { role });
    return data;
  },
};

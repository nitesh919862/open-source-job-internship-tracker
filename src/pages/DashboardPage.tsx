import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  Bookmark,
  ExternalLink,
  FileText,
  History,
  Kanban,
  LayoutDashboard,
  Plus,
  Send,
  Table2,
  Trash2,
  User as UserIcon,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ApplicationStatusLabel, SubmissionStatusLabel } from '../components/StatusLabel';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  applicationsApi,
  authApi,
  bookmarksApi,
  extractApiError,
  opportunitiesApi,
} from '../services/api';
import type { Application, ApplicationStatus, ApplicationSummary, Bookmark as BookmarkItem, Opportunity } from '../types';

type DashboardTab = 'overview' | 'tracker' | 'bookmarks' | 'submissions' | 'profile';

const STATUS_OPTIONS: ApplicationStatus[] = [
  'Applied',
  'Interview',
  'Shortlisted',
  'Selected',
  'Rejected',
];

export default function DashboardPage() {
  const { user, setUser, refreshBookmarks } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [trackerView, setTrackerView] = useState<'table' | 'kanban'>('table');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [applications, setApplications] = useState<Application[]>([]);
  const [summary, setSummary] = useState<ApplicationSummary>({
    total: 0,
    Applied: 0,
    Interview: 0,
    Shortlisted: 0,
    Selected: 0,
    Rejected: 0,
  });
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [submissions, setSubmissions] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);

  // Add application modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  const [customCompany, setCustomCompany] = useState('');
  const [customUrl, setCustomUrl] = useState('');
  const [newStatus, setNewStatus] = useState<ApplicationStatus>('Applied');
  const [newDate, setNewDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [newNotes, setNewNotes] = useState('');
  const [savingNew, setSavingNew] = useState(false);

  // Edit / History modal
  const [editingApp, setEditingApp] = useState<Application | null>(null);
  const [editStatus, setEditStatus] = useState<ApplicationStatus>('Applied');
  const [editDate, setEditDate] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [historyApp, setHistoryApp] = useState<Application | null>(null);

  // Profile state
  const [profileName, setProfileName] = useState(user?.name || '');
  const [profileHeadline, setProfileHeadline] = useState(user?.headline || '');
  const [profileLocation, setProfileLocation] = useState(user?.location || '');
  const [profileSkills, setProfileSkills] = useState((user?.skills || []).join(', '));
  const [profileBio, setProfileBio] = useState(user?.bio || '');
  const [savingProfile, setSavingProfile] = useState(false);

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const [appsRes, bookmarksRes, subsRes] = await Promise.all([
        applicationsApi.listMy(),
        bookmarksApi.list(),
        opportunitiesApi.getMySubmissions(),
      ]);
      setApplications(appsRes.applications);
      setSummary(appsRes.summary);
      setBookmarks(bookmarksRes.bookmarks);
      setSubmissions(subsRes.items);
    } catch (err) {
      showToast(extractApiError(err, 'Failed to load dashboard data.'), 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  useEffect(() => {
    if (user) {
      setProfileName(user.name);
      setProfileHeadline(user.headline || '');
      setProfileLocation(user.location || '');
      setProfileSkills((user.skills || []).join(', '));
      setProfileBio(user.bio || '');
    }
  }, [user]);

  const filteredApplications = useMemo(() => {
    if (statusFilter === 'all') return applications;
    return applications.filter((a) => a.status === statusFilter);
  }, [applications, statusFilter]);

  const chartData = useMemo(
    () => [
      { stage: 'Applied', count: summary.Applied },
      { stage: 'Shortlisted', count: summary.Shortlisted },
      { stage: 'Interview', count: summary.Interview },
      { stage: 'Selected', count: summary.Selected },
      { stage: 'Rejected', count: summary.Rejected },
    ],
    [summary]
  );

  const handleAddApplication = async (e: FormEvent) => {
    e.preventDefault();
    setSavingNew(true);
    try {
      await applicationsApi.create({
        customTitle: customTitle.trim(),
        customCompany: customCompany.trim(),
        customUrl: customUrl.trim(),
        status: newStatus,
        appliedAt: newDate,
        notes: newNotes.trim(),
      });
      showToast('Application added to your tracker.', 'success');
      setShowAddModal(false);
      setCustomTitle('');
      setCustomCompany('');
      setCustomUrl('');
      setNewNotes('');
      await loadDashboardData();
    } catch (err) {
      showToast(extractApiError(err, 'Could not add application.'), 'error');
    } finally {
      setSavingNew(false);
    }
  };

  const handleQuickStatusChange = async (appId: string, nextStatus: ApplicationStatus) => {
    try {
      await applicationsApi.update(appId, { status: nextStatus });
      showToast(`Status updated to ${nextStatus}.`, 'success');
      await loadDashboardData();
    } catch (err) {
      showToast(extractApiError(err, 'Failed to update status.'), 'error');
    }
  };

  const openEditModal = (app: Application) => {
    setEditingApp(app);
    setEditStatus(app.status);
    setEditDate((app.appliedAt || new Date().toISOString()).slice(0, 10));
    setEditNotes(app.notes || '');
  };

  const handleSaveEdit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingApp) return;
    setSavingEdit(true);
    try {
      await applicationsApi.update(editingApp._id, {
        status: editStatus,
        appliedAt: editDate,
        notes: editNotes,
      });
      showToast('Application updated.', 'success');
      setEditingApp(null);
      await loadDashboardData();
    } catch (err) {
      showToast(extractApiError(err, 'Failed to save changes.'), 'error');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteApplication = async (appId: string) => {
    try {
      await applicationsApi.remove(appId);
      showToast('Application removed.', 'info');
      await loadDashboardData();
    } catch (err) {
      showToast(extractApiError(err, 'Failed to delete application.'), 'error');
    }
  };

  const handleRemoveBookmark = async (bookmarkId: string) => {
    try {
      await bookmarksApi.remove(bookmarkId);
      showToast('Removed from saved opportunities.', 'info');
      await Promise.all([loadDashboardData(), refreshBookmarks()]);
    } catch (err) {
      showToast(extractApiError(err, 'Failed to remove bookmark.'), 'error');
    }
  };

  const handleTrackFromBookmark = async (opp: Opportunity) => {
    try {
      await applicationsApi.create({
        opportunityId: opp._id,
        status: 'Applied',
        appliedAt: new Date().toISOString(),
        notes: 'Tracked from saved bookmarks.',
      });
      showToast(`Tracked "${opp.title}".`, 'success');
      await loadDashboardData();
      setActiveTab('tracker');
    } catch (err) {
      showToast(extractApiError(err, 'Could not track this opportunity.'), 'error');
    }
  };

  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const skills = profileSkills
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const { user: updated } = await authApi.updateProfile({
        name: profileName.trim(),
        headline: profileHeadline.trim(),
        location: profileLocation.trim(),
        skills,
        bio: profileBio.trim(),
      });
      setUser(updated);
      showToast('Profile updated successfully.', 'success');
    } catch (err) {
      showToast(extractApiError(err, 'Could not update profile.'), 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const getAppTitle = (app: Application) => app.opportunity?.title || app.customTitle || 'Untitled Role';
  const getAppCompany = (app: Application) =>
    app.opportunity?.company || app.customCompany || 'Unknown Organization';
  const getAppUrl = (app: Application) => app.opportunity?.applicationUrl || app.customUrl;

  const navItems: Array<{ id: DashboardTab; label: string; icon: typeof LayoutDashboard }> = [
    { id: 'overview', label: 'Overview & Analytics', icon: LayoutDashboard },
    { id: 'tracker', label: 'Application Tracker', icon: FileText },
    { id: 'bookmarks', label: 'Saved Opportunities', icon: Bookmark },
    { id: 'submissions', label: 'My Submissions', icon: Send },
    { id: 'profile', label: 'Profile & Settings', icon: UserIcon },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Sidebar Navigation (240px–260px on desktop) */}
        <aside className="w-full lg:w-64 shrink-0 bg-white border border-slate-200 rounded-xl p-3 space-y-1">
          <div className="px-3 py-2.5 border-b border-slate-100 mb-2">
            <p className="font-display text-sm font-bold text-slate-950 truncate">{user?.name}</p>
            <p className="text-xs text-slate-500 truncate">{user?.headline || user?.email}</p>
          </div>

          <div className="flex lg:flex-col gap-1 overflow-x-auto pb-1 lg:pb-0">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-950'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </aside>

        {/* Main Viewport */}
        <div className="flex-1 min-w-0 w-full space-y-6">
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <p className="text-xs text-slate-500">Workspace / Career Tracker</p>
              <h1 className="font-display text-2xl font-bold text-slate-950 mt-0.5">
                {navItems.find((n) => n.id === activeTab)?.label}
              </h1>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link
                to="/opportunities"
                className="px-3.5 py-2 text-xs font-medium border border-slate-200 bg-white text-slate-800 rounded-lg hover:bg-slate-50 whitespace-nowrap"
              >
                Browse Roles
              </Link>
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-blue-700 text-white rounded-lg hover:bg-blue-800 whitespace-nowrap"
              >
                <Plus className="h-4 w-4" />
                Add Application
              </button>
            </div>
          </div>

          {/* 6 KPI Overview Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
            {[
              { label: 'Total', value: summary.total },
              { label: 'Applied', value: summary.Applied },
              { label: 'Interview', value: summary.Interview },
              { label: 'Shortlisted', value: summary.Shortlisted },
              { label: 'Selected', value: summary.Selected },
              { label: 'Rejected', value: summary.Rejected },
            ].map((card) => (
              <div
                key={card.label}
                className="bg-white border border-slate-200 rounded-xl p-4 space-y-1"
              >
                <p className="text-xs text-slate-500 font-medium">{card.label}</p>
                <p className="font-mono text-2xl font-bold text-slate-950 tabular-nums">
                  {loading ? '—' : card.value}
                </p>
              </div>
            ))}
          </div>

          {/* OVERVIEW & ANALYTICS TAB */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-base font-semibold text-slate-950">
                    Application Stage Breakdown
                  </h2>
                  <span className="font-mono text-xs text-slate-500 tabular-nums">
                    {summary.total} tracked
                  </span>
                </div>

                {summary.total === 0 ? (
                  <div className="h-56 flex flex-col items-center justify-center text-center space-y-3 bg-slate-50 rounded-lg border border-slate-200 p-6">
                    <p className="text-sm text-slate-600">
                      Track your first application to visualize your interview funnel.
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowAddModal(true)}
                      className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg"
                    >
                      Log First Application
                    </button>
                  </div>
                ) : (
                  <div className="h-60 w-full min-w-0">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={200}>
                      <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                        <XAxis
                          dataKey="stage"
                          tick={{ fontSize: 12, fill: '#475569' }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          allowDecimals={false}
                          tick={{ fontSize: 12, fill: '#475569' }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          cursor={{ fill: '#f8fafc' }}
                          contentStyle={{
                            borderRadius: '8px',
                            border: '1px solid #e2e8f0',
                            fontSize: '12px',
                          }}
                        />
                        <Bar dataKey="count" fill="#1d4ed8" radius={[6, 6, 0, 0]} maxBarSize={42} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-base font-semibold text-slate-950">
                    Recent Applications
                  </h2>
                  <button
                    type="button"
                    onClick={() => setActiveTab('tracker')}
                    className="text-xs font-semibold text-blue-700 hover:underline"
                  >
                    View all
                  </button>
                </div>

                {applications.length === 0 ? (
                  <p className="text-sm text-slate-500 py-8 text-center">
                    No applications tracked yet.
                  </p>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {applications.slice(0, 5).map((app) => (
                      <li key={app._id} className="py-3 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">
                            {getAppTitle(app)}
                          </p>
                          <p className="text-xs text-slate-500 truncate">{getAppCompany(app)}</p>
                        </div>
                        <ApplicationStatusLabel status={app.status} />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {/* APPLICATION TRACKER TAB */}
          {activeTab === 'tracker' && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div className="flex flex-wrap items-center gap-1.5">
                  {['all', ...STATUS_OPTIONS].map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setStatusFilter(status)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                        statusFilter === status
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {status === 'all' ? 'All Stages' : status}
                    </button>
                  ))}
                </div>

                <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start">
                  <button
                    type="button"
                    onClick={() => setTrackerView('table')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      trackerView === 'table'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Table2 className="h-3.5 w-3.5" />
                    Table
                  </button>
                  <button
                    type="button"
                    onClick={() => setTrackerView('kanban')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      trackerView === 'kanban'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Kanban className="h-3.5 w-3.5" />
                    Kanban
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="h-48 bg-slate-50 rounded-lg animate-pulse" />
              ) : filteredApplications.length === 0 ? (
                <div className="py-12 text-center space-y-3">
                  <p className="text-sm text-slate-600">
                    No applications match this filter yet.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowAddModal(true)}
                    className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 rounded-lg"
                  >
                    Add Application
                  </button>
                </div>
              ) : trackerView === 'table' ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500">
                        <th className="py-3 pr-4">Role &amp; Company</th>
                        <th className="py-3 px-4">Applied Date</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Notes</th>
                        <th className="py-3 pl-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {filteredApplications.map((app) => (
                        <tr key={app._id} className="hover:bg-slate-50/70">
                          <td className="py-3.5 pr-4 min-w-[200px]">
                            <p className="font-semibold text-slate-900">{getAppTitle(app)}</p>
                            <p className="text-xs text-slate-500">{getAppCompany(app)}</p>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-xs text-slate-600 tabular-nums whitespace-nowrap">
                            {new Date(app.appliedAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </td>
                          <td className="py-3.5 px-4">
                            <select
                              value={app.status}
                              onChange={(e) =>
                                handleQuickStatusChange(app._id, e.target.value as ApplicationStatus)
                              }
                              aria-label={`Change status for ${getAppTitle(app)}`}
                              className="px-2.5 py-1 text-xs font-medium border border-slate-200 rounded-md bg-white focus:border-blue-700 focus:outline-none"
                            >
                              {STATUS_OPTIONS.map((opt) => (
                                <option key={opt} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-3.5 px-4 max-w-xs">
                            <p className="text-xs text-slate-600 line-clamp-2">
                              {app.notes || '—'}
                            </p>
                          </td>
                          <td className="py-3.5 pl-4 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setHistoryApp(app)}
                                title="View status history"
                                className="p-1.5 text-slate-500 hover:text-slate-900 rounded-md hover:bg-slate-100"
                              >
                                <History className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => openEditModal(app)}
                                className="px-2.5 py-1 text-xs font-medium text-slate-700 border border-slate-200 rounded-md hover:bg-slate-50"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteApplication(app._id)}
                                aria-label="Delete application"
                                className="p-1.5 text-slate-400 hover:text-red-700 rounded-md hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                /* Kanban Board View */
                <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4">
                  {STATUS_OPTIONS.map((columnStatus) => {
                    const colApps = applications.filter((a) => a.status === columnStatus);
                    return (
                      <div
                        key={columnStatus}
                        className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-3"
                      >
                        <div className="flex items-center justify-between px-1">
                          <ApplicationStatusLabel status={columnStatus} />
                          <span className="font-mono text-xs text-slate-500 tabular-nums">
                            {colApps.length}
                          </span>
                        </div>

                        <div className="space-y-2.5">
                          {colApps.length === 0 ? (
                            <p className="text-xs text-slate-400 text-center py-6">Empty</p>
                          ) : (
                            colApps.map((app) => (
                              <div
                                key={app._id}
                                className="bg-white border border-slate-200 rounded-lg p-3 space-y-2"
                              >
                                <p className="text-xs font-semibold text-slate-900 line-clamp-2">
                                  {getAppTitle(app)}
                                </p>
                                <p className="text-[11px] text-slate-500 truncate">
                                  {getAppCompany(app)}
                                </p>
                                <select
                                  value={app.status}
                                  onChange={(e) =>
                                    handleQuickStatusChange(
                                      app._id,
                                      e.target.value as ApplicationStatus
                                    )
                                  }
                                  aria-label={`Move ${getAppTitle(app)} stage`}
                                  className="w-full px-2 py-1 text-[11px] border border-slate-200 rounded bg-slate-50"
                                >
                                  {STATUS_OPTIONS.map((opt) => (
                                    <option key={opt} value={opt}>
                                      {opt}
                                    </option>
                                  ))}
                                </select>
                                <div className="flex items-center justify-between pt-1">
                                  <button
                                    type="button"
                                    onClick={() => openEditModal(app)}
                                    className="text-[11px] font-medium text-blue-700 hover:underline"
                                  >
                                    Notes / Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setHistoryApp(app)}
                                    className="text-[11px] text-slate-500 hover:text-slate-900"
                                  >
                                    History
                                  </button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* SAVED OPPORTUNITIES TAB */}
          {activeTab === 'bookmarks' && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="font-display text-base font-semibold text-slate-950">
                  Saved Opportunities
                </h2>
                <span className="font-mono text-xs text-slate-500 tabular-nums">
                  {bookmarks.length} saved
                </span>
              </div>

              {bookmarks.length === 0 ? (
                <div className="py-12 text-center space-y-3">
                  <p className="text-sm text-slate-600">You have not saved any opportunities yet.</p>
                  <Link
                    to="/opportunities"
                    className="inline-flex px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg"
                  >
                    Explore Opportunities
                  </Link>
                </div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {bookmarks.map((bm) => {
                    const opp = bm.opportunity;
                    if (!opp) return null;
                    const alreadyTracked = applications.some((a) => a.opportunityId === opp._id);
                    return (
                      <li
                        key={bm._id}
                        className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div className="space-y-1 min-w-0">
                          <Link
                            to={`/opportunities/${opp._id}`}
                            className="font-display text-base font-semibold text-slate-950 hover:text-blue-700"
                          >
                            {opp.title}
                          </Link>
                          <p className="text-xs text-slate-500 font-mono">
                            {opp.company} · {opp.type} · {opp.workMode} · {opp.stipend}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          <a
                            href={opp.applicationUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50"
                          >
                            Apply Link
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                          {!alreadyTracked && (
                            <button
                              type="button"
                              onClick={() => handleTrackFromBookmark(opp)}
                              className="px-3 py-1.5 text-xs font-semibold bg-blue-700 text-white rounded-lg hover:bg-blue-800"
                            >
                              Track Application
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveBookmark(bm._id)}
                            className="px-3 py-1.5 text-xs font-medium text-red-700 border border-red-200 rounded-lg hover:bg-red-50"
                          >
                            Remove
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}

          {/* MY SUBMISSIONS TAB */}
          {activeTab === 'submissions' && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="font-display text-base font-semibold text-slate-950">
                  Community Submissions
                </h2>
                <Link
                  to="/submit"
                  className="text-xs font-semibold text-blue-700 hover:underline"
                >
                  Submit New Role
                </Link>
              </div>

              {submissions.length === 0 ? (
                <p className="text-sm text-slate-500 py-8 text-center">
                  No submissions yet. Share an opening with the community.
                </p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {submissions.map((item) => (
                    <li key={item._id} className="py-4 flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-slate-950">{item.title}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {item.company} · {item.type} · {item.workMode}
                        </p>
                        {item.reviewNote && (
                          <p className="text-xs text-slate-600 mt-2 bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5">
                            Moderator note: {item.reviewNote}
                          </p>
                        )}
                      </div>
                      <SubmissionStatusLabel status={item.status} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* PROFILE & SETTINGS TAB */}
          {activeTab === 'profile' && (
            <form
              onSubmit={handleSaveProfile}
              className="bg-white border border-slate-200 rounded-xl p-6 space-y-5 max-w-2xl"
            >
              <div className="border-b border-slate-100 pb-3">
                <h2 className="font-display text-base font-semibold text-slate-950">
                  Profile Settings
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Account role: <span className="font-semibold capitalize">{user?.role}</span> ·{' '}
                  {user?.email}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    required
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Location</label>
                  <input
                    type="text"
                    value={profileLocation}
                    onChange={(e) => setProfileLocation(e.target.value)}
                    placeholder="Bengaluru, India"
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Headline</label>
                <input
                  type="text"
                  value={profileHeadline}
                  onChange={(e) => setProfileHeadline(e.target.value)}
                  placeholder="Final-Year CS Student & Full-Stack Developer"
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Skills (comma-separated)
                </label>
                <input
                  type="text"
                  value={profileSkills}
                  onChange={(e) => setProfileSkills(e.target.value)}
                  placeholder="React, TypeScript, Express, MongoDB"
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Bio</label>
                <textarea
                  rows={3}
                  value={profileBio}
                  onChange={(e) => setProfileBio(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg"
                />
              </div>

              <button
                type="submit"
                disabled={savingProfile}
                className="px-5 py-2.5 text-sm font-semibold text-white bg-slate-900 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-60"
              >
                {savingProfile ? 'Saving...' : 'Save Profile'}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Add Custom Application Modal */}
      {showAddModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4"
        >
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 space-y-5 shadow-xl">
            <h2 className="font-display text-lg font-bold text-slate-950">
              Add Application to Tracker
            </h2>
            <form onSubmit={handleAddApplication} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Role Title *</label>
                <input
                  type="text"
                  required
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="Backend Engineer"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Company Name *
                </label>
                <input
                  type="text"
                  required
                  value={customCompany}
                  onChange={(e) => setCustomCompany(e.target.value)}
                  placeholder="Acme Systems"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Job Link (optional)
                </label>
                <input
                  type="url"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Status</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as ApplicationStatus)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Applied Date
                  </label>
                  <input
                    type="date"
                    required
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Notes</label>
                <textarea
                  rows={3}
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-sm font-medium border border-slate-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingNew}
                  className="px-4 py-2 text-sm font-semibold text-white bg-blue-700 rounded-lg disabled:opacity-60"
                >
                  {savingNew ? 'Saving...' : 'Save Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Application Modal */}
      {editingApp && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4"
        >
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 space-y-5 shadow-xl">
            <div>
              <h2 className="font-display text-lg font-bold text-slate-950">Update Application</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {getAppTitle(editingApp)} · {getAppCompany(editingApp)}
              </p>
            </div>
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as ApplicationStatus)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Applied Date
                  </label>
                  <input
                    type="date"
                    required
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Personal Notes
                </label>
                <textarea
                  rows={4}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                />
              </div>
              {getAppUrl(editingApp) && (
                <a
                  href={getAppUrl(editingApp)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:underline"
                >
                  Open original posting <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingApp(null)}
                  className="px-4 py-2 text-sm font-medium border border-slate-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-4 py-2 text-sm font-semibold text-white bg-blue-700 rounded-lg disabled:opacity-60"
                >
                  {savingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Timeline Modal */}
      {historyApp && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4"
        >
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="font-display text-lg font-bold text-slate-950">Application History</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {getAppTitle(historyApp)} · {getAppCompany(historyApp)}
              </p>
            </div>
            <ul className="space-y-3 max-h-72 overflow-y-auto">
              {historyApp.history.map((entry, idx) => (
                <li
                  key={idx}
                  className="border border-slate-200 rounded-lg p-3 space-y-1 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <ApplicationStatusLabel status={entry.status} />
                    <span className="font-mono text-slate-500 tabular-nums">
                      {new Date(entry.changedAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                  {entry.note && <p className="text-slate-600">{entry.note}</p>}
                </li>
              ))}
            </ul>
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setHistoryApp(null)}
                className="px-4 py-2 text-sm font-medium bg-slate-900 text-white rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

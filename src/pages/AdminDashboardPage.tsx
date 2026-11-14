import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  BarChart3,
  Check,
  Database,
  Edit3,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  Users,
  X,
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
import { adminApi, extractApiError } from '../services/api';
import type { AdminStats, Opportunity, User, UserRole } from '../types';

type AdminTab = 'overview' | 'submissions' | 'opportunities' | 'users';

export default function AdminDashboardPage() {
  const { user: currentUser, databaseStatus } = useAuth();
  const { showToast } = useToast();

  const [tab, setTab] = useState<AdminTab>('overview');
  const [excludeSample, setExcludeSample] = useState(false);

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [submissions, setSubmissions] = useState<Opportunity[]>([]);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [oppSearch, setOppSearch] = useState('');
  const [oppTypeFilter, setOppTypeFilter] = useState('all');

  const [users, setUsers] = useState<User[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Sample purge modal
  const [confirmPurgeOpen, setConfirmPurgeOpen] = useState(false);
  const [purging, setPurging] = useState(false);

  // Moderation note prompt
  const [reviewingItem, setReviewingItem] = useState<{
    opp: Opportunity;
    decision: 'approved' | 'rejected';
  } | null>(null);
  const [reviewNote, setReviewNote] = useState('');

  // Create / Edit Opportunity Modal
  const [oppModalOpen, setOppModalOpen] = useState(false);
  const [editingOpp, setEditingOpp] = useState<Opportunity | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formCompany, setFormCompany] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formSkills, setFormSkills] = useState('');
  const [formType, setFormType] = useState('Full-time job');
  const [formWorkMode, setFormWorkMode] = useState('Remote');
  const [formLocation, setFormLocation] = useState('');
  const [formStipend, setFormStipend] = useState('');
  const [formIsPaid, setFormIsPaid] = useState(true);
  const [formDeadline, setFormDeadline] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [savingOpp, setSavingOpp] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [dashRes, subsRes, usersRes] = await Promise.all([
        adminApi.getDashboard({ excludeSample }),
        adminApi.listSubmissions({
          status: tab === 'opportunities' ? 'all' : statusFilter,
          search: oppSearch.trim() || undefined,
          type: tab === 'opportunities' ? oppTypeFilter : 'all',
          excludeSample,
          limit: 50,
        }),
        adminApi.listUsers({ search: userSearch.trim() || undefined }),
      ]);
      setStats(dashRes.stats);
      setSubmissions(subsRes.items);
      setUsers(usersRes.users);
    } catch (err) {
      showToast(extractApiError(err, 'Failed to load admin console.'), 'error');
    } finally {
      setLoading(false);
    }
  }, [excludeSample, oppSearch, oppTypeFilter, statusFilter, tab, userSearch, showToast]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleConfirmModeration = async (e: FormEvent) => {
    e.preventDefault();
    if (!reviewingItem) return;
    try {
      await adminApi.moderateSubmission(reviewingItem.opp._id, {
        status: reviewingItem.decision,
        reviewNote: reviewNote.trim(),
      });
      showToast(
        `Submission ${reviewingItem.decision === 'approved' ? 'approved and published' : 'rejected'}.`,
        'success'
      );
      setReviewingItem(null);
      setReviewNote('');
      await loadAll();
    } catch (err) {
      showToast(extractApiError(err, 'Moderation failed.'), 'error');
    }
  };

  const openCreateOpp = () => {
    setEditingOpp(null);
    setFormTitle('');
    setFormCompany('');
    setFormDescription('');
    setFormSkills('');
    setFormType('Full-time job');
    setFormWorkMode('Remote');
    setFormLocation('');
    setFormStipend('');
    setFormIsPaid(true);
    setFormDeadline('');
    setFormUrl('');
    setOppModalOpen(true);
  };

  const openEditOpp = (opp: Opportunity) => {
    setEditingOpp(opp);
    setFormTitle(opp.title);
    setFormCompany(opp.company);
    setFormDescription(opp.description);
    setFormSkills(opp.skills.join(', '));
    setFormType(opp.type);
    setFormWorkMode(opp.workMode);
    setFormLocation(opp.location);
    setFormStipend(opp.stipend);
    setFormIsPaid(opp.isPaid);
    setFormDeadline(opp.deadline ? opp.deadline.slice(0, 10) : '');
    setFormUrl(opp.applicationUrl);
    setOppModalOpen(true);
  };

  const handleSaveOpportunity = async (e: FormEvent) => {
    e.preventDefault();
    setSavingOpp(true);
    try {
      const payload = {
        title: formTitle.trim(),
        company: formCompany.trim(),
        description: formDescription.trim(),
        skills: formSkills,
        type: formType,
        workMode: formWorkMode,
        location: formLocation.trim(),
        stipend: formIsPaid ? formStipend.trim() || 'Competitive' : 'Unpaid',
        isPaid: formIsPaid,
        deadline: formDeadline || null,
        applicationUrl: formUrl.trim(),
      };
      if (editingOpp) {
        await adminApi.updateOpportunity(editingOpp._id, payload);
        showToast('Opportunity updated.', 'success');
      } else {
        await adminApi.createOpportunity(payload);
        showToast('Opportunity created and published.', 'success');
      }
      setOppModalOpen(false);
      await loadAll();
    } catch (err) {
      showToast(extractApiError(err, 'Failed to save opportunity.'), 'error');
    } finally {
      setSavingOpp(false);
    }
  };

  const handleDeleteOpp = async (id: string) => {
    try {
      await adminApi.deleteOpportunity(id);
      showToast('Opportunity deleted.', 'info');
      await loadAll();
    } catch (err) {
      showToast(extractApiError(err, 'Could not delete opportunity.'), 'error');
    }
  };

  const handlePurgeSamples = async () => {
    setPurging(true);
    try {
      const res = await adminApi.purgeSampleData();
      showToast(res.message, 'success');
      setConfirmPurgeOpen(false);
      await loadAll();
    } catch (err) {
      showToast(extractApiError(err, 'Could not remove sample records.'), 'error');
    } finally {
      setPurging(false);
    }
  };

  const handleRoleChange = async (userId: string, nextRole: UserRole) => {
    try {
      await adminApi.updateUserRole(userId, nextRole);
      showToast(`User role updated to ${nextRole}.`, 'success');
      await loadAll();
    } catch (err) {
      showToast(extractApiError(err, 'Could not update user role.'), 'error');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <p className="text-xs text-slate-500">Administration / Live Database Console</p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-950 mt-0.5">
            Admin Control Panel
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => setExcludeSample(false)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                !excludeSample ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
              }`}
            >
              All Records
            </button>
            <button
              type="button"
              onClick={() => setExcludeSample(true)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                excludeSample ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
              }`}
            >
              Live / Non-Sample Only
            </button>
          </div>

          {stats && stats.sampleOpportunities > 0 && (
            <button
              type="button"
              onClick={() => setConfirmPurgeOpen(true)}
              className="px-3 py-2 text-xs font-medium text-red-700 bg-white border border-red-200 hover:bg-red-50 rounded-lg whitespace-nowrap"
            >
              Clear Sample Data ({stats.sampleOpportunities})
            </button>
          )}

          <button
            type="button"
            onClick={loadAll}
            aria-label="Refresh admin data"
            className="p-2 text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={openCreateOpp}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-blue-700 text-white rounded-lg hover:bg-blue-800 whitespace-nowrap"
          >
            <Plus className="h-4 w-4" />
            Create Opportunity
          </button>
        </div>
      </div>

      {/* Live Database Source Summary */}
      <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-blue-700 shrink-0" />
          <span>
            Source:{' '}
            <strong className="text-slate-900">
              {databaseStatus?.mode === 'mongodb'
                ? 'MongoDB Atlas (Mongoose)'
                : 'Local Disk Store (.data/store.json)'}
            </strong>
          </span>
        </div>
        {stats && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono tabular-nums">
            <span>Live / Community Roles: {stats.realOpportunities}</span>
            <span aria-hidden="true">·</span>
            <span>Sample Seeded Roles: {stats.sampleOpportunities}</span>
            <span aria-hidden="true">·</span>
            <span>Admins: {stats.adminCount}</span>
          </div>
        )}
      </div>

      {/* 6 Live Admin KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'Registered Users', value: stats?.totalUsers },
          { label: 'Opportunities', value: stats?.totalOpportunities },
          { label: 'Pending Review', value: stats?.pendingSubmissions },
          { label: 'Approved Listings', value: stats?.approvedOpportunities },
          { label: 'Tracked Applications', value: stats?.totalApplications },
          { label: 'Saved Bookmarks', value: stats?.totalBookmarks },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white border border-slate-200 rounded-xl p-4 space-y-1">
            <p className="text-xs text-slate-500 font-medium">{kpi.label}</p>
            <p className="font-mono text-2xl font-bold text-slate-950 tabular-nums">
              {loading && !stats ? '—' : kpi.value ?? 0}
            </p>
          </div>
        ))}
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        {[
          { id: 'overview', label: 'Analytics & Activity', icon: BarChart3 },
          {
            id: 'submissions',
            label: `Submission Queue (${stats?.pendingSubmissions ?? 0})`,
            icon: ShieldCheck,
          },
          {
            id: 'opportunities',
            label: `Manage Opportunities (${stats?.totalOpportunities ?? 0})`,
            icon: Edit3,
          },
          { id: 'users', label: `Manage Users (${stats?.totalUsers ?? 0})`, icon: Users },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id as AdminTab)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                tab === item.id
                  ? 'bg-slate-900 text-white'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </button>
          );
        })}
      </div>

      {/* ANALYTICS OVERVIEW & LIVE ACTIVITY */}
      {tab === 'overview' && stats && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
              <h2 className="font-display text-base font-semibold text-slate-950">
                Opportunities by Type
              </h2>
              <div className="h-56 w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={200}>
                  <BarChart data={stats.byType} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: '#475569' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 11, fill: '#475569' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip />
                    <Bar dataKey="count" fill="#1d4ed8" radius={[6, 6, 0, 0]} maxBarSize={42} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
              <h2 className="font-display text-base font-semibold text-slate-950">
                Opportunities by Work Mode
              </h2>
              <div className="h-56 w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={200}>
                  <BarChart
                    data={stats.byWorkMode}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: '#475569' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 11, fill: '#475569' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip />
                    <Bar dataKey="count" fill="#0f172a" radius={[6, 6, 0, 0]} maxBarSize={42} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
              <h2 className="font-display text-base font-semibold text-slate-950">
                Tracked Applications by Stage
              </h2>
              <div className="h-56 w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={200}>
                  <BarChart
                    data={stats.applicationsByStatus}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: '#475569' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 11, fill: '#475569' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip />
                    <Bar dataKey="count" fill="#0284c7" radius={[6, 6, 0, 0]} maxBarSize={42} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Real Recent Database Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
              <h2 className="font-display text-base font-semibold text-slate-950">
                Latest Opportunity Submissions
              </h2>
              {stats.recentSubmissions.length === 0 ? (
                <p className="text-xs text-slate-500 py-4">No opportunities found.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {stats.recentSubmissions.map((item) => (
                    <li key={item._id} className="py-2.5 flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{item.title}</p>
                        <p className="text-xs text-slate-500 truncate">
                          {item.company} {item.isSample ? '· Sample' : '· Live'}
                        </p>
                      </div>
                      <SubmissionStatusLabel status={item.status} />
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
              <h2 className="font-display text-base font-semibold text-slate-950">
                Recent Member Applications
              </h2>
              {stats.recentApplications.length === 0 ? (
                <p className="text-xs text-slate-500 py-4">No tracked applications yet.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {stats.recentApplications.map((app) => (
                    <li key={app._id} className="py-2.5 flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {app.roleTitle}
                        </p>
                        <p className="text-xs text-slate-500 truncate">
                          {app.applicantName} · {app.companyName}
                        </p>
                      </div>
                      <ApplicationStatusLabel status={app.status} />
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
              <h2 className="font-display text-base font-semibold text-slate-950">
                Newest Registered Users
              </h2>
              {stats.recentUsers.length === 0 ? (
                <p className="text-xs text-slate-500 py-4">No registered users yet.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {stats.recentUsers.map((u) => (
                    <li key={u._id} className="py-2.5 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{u.name}</p>
                        <p className="text-xs text-slate-500 truncate">{u.email}</p>
                      </div>
                      <span className="text-xs font-mono text-slate-600 capitalize shrink-0">
                        {u.role}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUBMISSION QUEUE */}
      {tab === 'submissions' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex flex-wrap items-center gap-2">
              {['pending', 'approved', 'rejected', 'all'].map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize ${
                    statusFilter === status
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={oppSearch}
                onChange={(e) => setOppSearch(e.target.value)}
                placeholder="Search title, company, location..."
                aria-label="Search submissions"
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:border-blue-700 focus:outline-none"
              />
            </div>
          </div>

          {submissions.length === 0 ? (
            <p className="text-sm text-slate-500 py-10 text-center">
              No submissions found in &ldquo;{statusFilter}&rdquo; queue.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {submissions.map((item) => (
                <li
                  key={item._id}
                  className="py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  <div className="space-y-1 max-w-2xl">
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="font-display text-base font-semibold text-slate-950">
                        {item.title}
                      </p>
                      <SubmissionStatusLabel status={item.status} />
                      <span className="text-xs font-mono text-slate-500">
                        {item.isSample ? 'Sample Data' : 'Live Submission'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 font-mono">
                      {item.company} · {item.type} · {item.workMode} · {item.location} ·{' '}
                      {item.stipend}
                    </p>
                    <p className="text-xs text-slate-600 line-clamp-2">{item.description}</p>
                    {item.submittedByUser && (
                      <p className="text-[11px] text-slate-500">
                        Submitted by {item.submittedByUser.name} ({item.submittedByUser.email}) on{' '}
                        {new Date(item.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {item.status !== 'approved' && (
                      <button
                        type="button"
                        onClick={() => {
                          setReviewingItem({ opp: item, decision: 'approved' });
                          setReviewNote('');
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg"
                      >
                        <Check className="h-3.5 w-3.5" />
                        Approve
                      </button>
                    )}
                    {item.status !== 'rejected' && (
                      <button
                        type="button"
                        onClick={() => {
                          setReviewingItem({ opp: item, decision: 'rejected' });
                          setReviewNote('');
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-red-700 border border-red-200 hover:bg-red-50 rounded-lg"
                      >
                        <X className="h-3.5 w-3.5" />
                        Reject
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => openEditOpp(item)}
                      className="px-3 py-1.5 text-xs font-medium text-slate-700 border border-slate-200 hover:bg-slate-50 rounded-lg"
                    >
                      Edit
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* MANAGE OPPORTUNITIES TABLE */}
      {tab === 'opportunities' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="relative w-full sm:w-72">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={oppSearch}
                onChange={(e) => setOppSearch(e.target.value)}
                placeholder="Filter opportunities..."
                aria-label="Filter opportunities"
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:border-blue-700 focus:outline-none"
              />
            </div>

            <select
              value={oppTypeFilter}
              onChange={(e) => setOppTypeFilter(e.target.value)}
              aria-label="Filter by opportunity type"
              className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
            >
              <option value="all">All Types</option>
              <option value="Full-time job">Full-time job</option>
              <option value="Part-time job">Part-time job</option>
              <option value="Internship">Internship</option>
              <option value="Freelance">Freelance</option>
            </select>
          </div>

          {submissions.length === 0 ? (
            <p className="text-sm text-slate-500 py-10 text-center">
              No opportunities match the active filters.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500">
                    <th className="py-3 pr-4">Title &amp; Company</th>
                    <th className="py-3 px-4">Type / Mode</th>
                    <th className="py-3 px-4">Source</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 pl-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {submissions.map((opp) => (
                    <tr key={opp._id} className="hover:bg-slate-50/70">
                      <td className="py-3 pr-4">
                        <p className="font-semibold text-slate-900">{opp.title}</p>
                        <p className="text-xs text-slate-500">{opp.company}</p>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600">
                        {opp.type} · {opp.workMode}
                      </td>
                      <td className="py-3 px-4 text-xs font-mono text-slate-600">
                        {opp.isSample ? 'Sample' : 'Live'}
                      </td>
                      <td className="py-3 px-4">
                        <SubmissionStatusLabel status={opp.status} />
                      </td>
                      <td className="py-3 pl-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openEditOpp(opp)}
                            className="px-2.5 py-1 text-xs font-medium border border-slate-200 rounded-md hover:bg-slate-50"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteOpp(opp._id)}
                            aria-label="Delete opportunity"
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
          )}
        </div>
      )}

      {/* MANAGE USERS TABLE */}
      {tab === 'users' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <p className="text-xs text-slate-500 font-mono tabular-nums">
              {users.length} registered {users.length === 1 ? 'account' : 'accounts'}
            </p>
            <div className="relative w-full sm:w-72">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search users by name or email..."
                aria-label="Search users"
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:border-blue-700 focus:outline-none"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500">
                  <th className="py-3 pr-4">Name &amp; Email</th>
                  <th className="py-3 px-4">Joined</th>
                  <th className="py-3 px-4 text-right">Submissions</th>
                  <th className="py-3 px-4 text-right">Applications</th>
                  <th className="py-3 px-4 text-right">Bookmarks</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 pl-4 text-right">Manage Access</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {users.map((u) => (
                  <tr key={u._id} className="hover:bg-slate-50/70">
                    <td className="py-3 pr-4">
                      <p className="font-semibold text-slate-900">
                        {u.name} {u._id === currentUser?._id && '(You)'}
                      </p>
                      <p className="text-xs text-slate-500">{u.email}</p>
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-600 tabular-nums whitespace-nowrap">
                      {new Date(u.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-xs text-slate-700 tabular-nums">
                      {u.activity?.submissionsCount ?? 0}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-xs text-slate-700 tabular-nums">
                      {u.activity?.applicationsCount ?? 0}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-xs text-slate-700 tabular-nums">
                      {u.activity?.bookmarksCount ?? 0}
                    </td>
                    <td className="py-3 px-4 text-xs font-semibold capitalize text-slate-800">
                      {u.role}
                    </td>
                    <td className="py-3 pl-4 text-right">
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u._id, e.target.value as UserRole)}
                        aria-label={`Change role for ${u.name}`}
                        className="px-2.5 py-1 text-xs border border-slate-200 rounded-md bg-white"
                      >
                        <option value="user">user</option>
                        <option value="admin">admin</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Purge Sample Data Confirmation Modal */}
      {confirmPurgeOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4"
        >
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h2 className="font-display text-lg font-bold text-slate-950">
              Clear Seeded Sample Data?
            </h2>
            <p className="text-sm text-slate-600">
              This will permanently remove all {stats?.sampleOpportunities ?? 0} sample opportunity
              records (<code className="font-mono text-xs">isSample: true</code>) so only real
              community-submitted and admin-created opportunities remain.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmPurgeOpen(false)}
                className="px-4 py-2 text-sm font-medium border border-slate-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={purging}
                onClick={handlePurgeSamples}
                className="px-4 py-2 text-sm font-semibold text-white bg-red-700 hover:bg-red-800 rounded-lg disabled:opacity-60"
              >
                {purging ? 'Removing...' : 'Confirm Remove Sample Data'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Moderation Decision Modal */}
      {reviewingItem && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4"
        >
          <form
            onSubmit={handleConfirmModeration}
            className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl"
          >
            <h2 className="font-display text-lg font-bold text-slate-950">
              {reviewingItem.decision === 'approved' ? 'Approve Submission' : 'Reject Submission'}
            </h2>
            <p className="text-xs text-slate-600">
              {reviewingItem.opp.title} at {reviewingItem.opp.company}
            </p>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Moderator Note (sent to submitter)
              </label>
              <textarea
                rows={3}
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                placeholder="Optional feedback or reason..."
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setReviewingItem(null)}
                className="px-4 py-2 text-sm font-medium border border-slate-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className={`px-4 py-2 text-sm font-semibold text-white rounded-lg ${
                  reviewingItem.decision === 'approved'
                    ? 'bg-emerald-700 hover:bg-emerald-800'
                    : 'bg-red-700 hover:bg-red-800'
                }`}
              >
                Confirm {reviewingItem.decision === 'approved' ? 'Approval' : 'Rejection'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Create / Edit Opportunity Modal */}
      {oppModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4 overflow-y-auto"
        >
          <form
            onSubmit={handleSaveOpportunity}
            className="bg-white border border-slate-200 rounded-xl max-w-2xl w-full p-6 space-y-4 shadow-xl my-8"
          >
            <h2 className="font-display text-lg font-bold text-slate-950">
              {editingOpp ? 'Edit Opportunity' : 'Create Opportunity'}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Title *</label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Company *</label>
                <input
                  type="text"
                  required
                  value={formCompany}
                  onChange={(e) => setFormCompany(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Type *</label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
                >
                  <option value="Full-time job">Full-time job</option>
                  <option value="Part-time job">Part-time job</option>
                  <option value="Internship">Internship</option>
                  <option value="Freelance">Freelance</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Work Mode *</label>
                <select
                  value={formWorkMode}
                  onChange={(e) => setFormWorkMode(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
                >
                  <option value="Remote">Remote</option>
                  <option value="Hybrid">Hybrid</option>
                  <option value="On-site">On-site</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Location *</label>
                <input
                  type="text"
                  required
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Stipend / Salary
                </label>
                <input
                  type="text"
                  value={formStipend}
                  onChange={(e) => setFormStipend(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Compensation
                </label>
                <select
                  value={formIsPaid ? 'paid' : 'unpaid'}
                  onChange={(e) => setFormIsPaid(e.target.value === 'paid')}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
                >
                  <option value="paid">Paid</option>
                  <option value="unpaid">Unpaid</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Deadline</label>
                <input
                  type="date"
                  value={formDeadline}
                  onChange={(e) => setFormDeadline(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Application URL *
              </label>
              <input
                type="url"
                required
                value={formUrl}
                onChange={(e) => setFormUrl(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Skills (comma-separated)
              </label>
              <input
                type="text"
                value={formSkills}
                onChange={(e) => setFormSkills(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Description *</label>
              <textarea
                rows={4}
                required
                minLength={20}
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setOppModalOpen(false)}
                className="px-4 py-2 text-sm font-medium border border-slate-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingOpp}
                className="px-4 py-2 text-sm font-semibold text-white bg-blue-700 rounded-lg disabled:opacity-60"
              >
                {savingOpp ? 'Saving...' : editingOpp ? 'Save Changes' : 'Create Opportunity'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

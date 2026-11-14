import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, RotateCcw, Search } from 'lucide-react';
import OpportunityCard from '../components/OpportunityCard';
import { useAuth } from '../context/AuthContext';
import { applicationsApi, opportunitiesApi } from '../services/api';
import type { Opportunity, Pagination } from '../types';

export default function OpportunitiesPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [type, setType] = useState(searchParams.get('type') || 'all');
  const [workMode, setWorkMode] = useState(searchParams.get('workMode') || 'all');
  const [location, setLocation] = useState(searchParams.get('location') || '');
  const [paid, setPaid] = useState(searchParams.get('paid') || 'all');
  const [sort, setSort] = useState(searchParams.get('sort') || 'newest');
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);

  const [items, setItems] = useState<Opportunity[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    limit: 9,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trackedIds, setTrackedIds] = useState<Set<string>>(new Set());

  // Sync URL params -> state when navigating from navbar links
  useEffect(() => {
    setSearch(searchParams.get('search') || '');
    setType(searchParams.get('type') || 'all');
    setWorkMode(searchParams.get('workMode') || 'all');
    setLocation(searchParams.get('location') || '');
    setPaid(searchParams.get('paid') || 'all');
    setSort(searchParams.get('sort') || 'newest');
    setPage(Number(searchParams.get('page')) || 1);
  }, [searchParams]);

  useEffect(() => {
    let active = true;
    async function fetchOpportunities() {
      setLoading(true);
      setError(null);
      try {
        const res = await opportunitiesApi.list({
          search: search.trim() || undefined,
          type,
          workMode,
          location: location.trim() || undefined,
          paid,
          sort,
          page,
          limit: 9,
        });
        if (!active) return;
        setItems(res.items);
        setPagination(res.pagination);
      } catch {
        if (active) setError('Could not load opportunities. Please try again.');
      } finally {
        if (active) setLoading(false);
      }
    }
    fetchOpportunities();
    return () => {
      active = false;
    };
  }, [search, type, workMode, location, paid, sort, page]);

  useEffect(() => {
    if (!user) {
      setTrackedIds(new Set());
      return;
    }
    applicationsApi
      .listMy()
      .then((res) => {
        const ids = res.applications
          .map((a) => a.opportunityId)
          .filter((id): id is string => Boolean(id));
        setTrackedIds(new Set(ids));
      })
      .catch(() => null);
  }, [user]);

  const updateUrlParams = (overrides: Record<string, string | number>) => {
    const next = new URLSearchParams();
    const state = {
      search,
      type,
      workMode,
      location,
      paid,
      sort,
      page,
      ...overrides,
    };
    if (String(state.search).trim()) next.set('search', String(state.search).trim());
    if (state.type !== 'all') next.set('type', String(state.type));
    if (state.workMode !== 'all') next.set('workMode', String(state.workMode));
    if (String(state.location).trim()) next.set('location', String(state.location).trim());
    if (state.paid !== 'all') next.set('paid', String(state.paid));
    if (state.sort !== 'newest') next.set('sort', String(state.sort));
    if (Number(state.page) > 1) next.set('page', String(state.page));
    setSearchParams(next);
  };

  const resetFilters = () => {
    setSearchParams(new URLSearchParams());
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-slate-950">
            Discover Opportunities
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Browse approved jobs, internships, and freelance engagements. Sample records are tagged
            transparently.
          </p>
        </div>
        <p className="text-sm text-slate-600 font-mono tabular-nums">
          {pagination.total} {pagination.total === 1 ? 'listing' : 'listings'} found
        </p>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <div className="lg:col-span-2 relative">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                updateUrlParams({ search: e.target.value, page: 1 });
              }}
              placeholder="Search job title, company, or skill..."
              aria-label="Search job title or company"
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:border-blue-700 focus:outline-none"
            />
          </div>

          <select
            value={type}
            onChange={(e) => updateUrlParams({ type: e.target.value, page: 1 })}
            aria-label="Opportunity type"
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:border-blue-700 focus:outline-none"
          >
            <option value="all">All Types</option>
            <option value="Full-time job">Full-time job</option>
            <option value="Part-time job">Part-time job</option>
            <option value="Internship">Internship</option>
            <option value="Freelance">Freelance</option>
          </select>

          <select
            value={workMode}
            onChange={(e) => updateUrlParams({ workMode: e.target.value, page: 1 })}
            aria-label="Work mode"
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:border-blue-700 focus:outline-none"
          >
            <option value="all">All Work Modes</option>
            <option value="Remote">Remote</option>
            <option value="Hybrid">Hybrid</option>
            <option value="On-site">On-site</option>
          </select>

          <input
            type="text"
            value={location}
            onChange={(e) => {
              setLocation(e.target.value);
              updateUrlParams({ location: e.target.value, page: 1 });
            }}
            placeholder="Location (e.g. Bengaluru)"
            aria-label="Filter by location"
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:border-blue-700 focus:outline-none"
          />

          <div className="flex gap-2">
            <select
              value={paid}
              onChange={(e) => updateUrlParams({ paid: e.target.value, page: 1 })}
              aria-label="Paid or unpaid filter"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:border-blue-700 focus:outline-none"
            >
              <option value="all">Paid &amp; Unpaid</option>
              <option value="paid">Paid Only</option>
              <option value="unpaid">Unpaid Only</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <label htmlFor="sort-select" className="font-medium">
              Sort by:
            </label>
            <select
              id="sort-select"
              value={sort}
              onChange={(e) => updateUrlParams({ sort: e.target.value, page: 1 })}
              className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-md bg-white focus:border-blue-700 focus:outline-none"
            >
              <option value="newest">Newest First</option>
              <option value="deadline">Earliest Deadline</option>
            </select>
          </div>

          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-950 transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset Filters
          </button>
        </div>
      </div>

      {/* Results Grid */}
      {error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-sm text-red-800">
          {error}
        </div>
      ) : loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((idx) => (
            <div
              key={idx}
              className="h-64 bg-white border border-slate-200 rounded-xl p-6 animate-pulse"
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center space-y-4">
          <h2 className="font-display text-lg font-semibold text-slate-950">
            No matching opportunities found
          </h2>
          <p className="text-sm text-slate-600 max-w-md mx-auto">
            Try broadening your keywords or clearing one of the active work mode, type, or
            location filters.
          </p>
          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Clear All Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((opp) => (
            <OpportunityCard
              key={opp._id}
              opportunity={opp}
              isTracked={trackedIds.has(opp._id)}
              onTracked={(id) => setTrackedIds((prev) => new Set(prev).add(id))}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-slate-200">
          <p className="text-xs text-slate-600 font-mono tabular-nums">
            Page {pagination.page} of {pagination.totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={pagination.page <= 1}
              onClick={() => updateUrlParams({ page: pagination.page - 1 })}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-lg bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>
            <button
              type="button"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => updateUrlParams({ page: pagination.page + 1 })}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-lg bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

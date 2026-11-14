import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Bookmark,
  Briefcase,
  CheckCircle2,
  GitPullRequest,
  Search,
  ShieldCheck,
  SlidersHorizontal,
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
import heroWorkspaceImg from '../assets/images/hero_career_workspace_1794586968838.jpg';
import communityCollabImg from '../assets/images/community_collab_banner_1794586968606.jpg';
import avatarMentor1Img from '../assets/images/avatar_mentor_1_1794586969427.jpg';
import avatarMentor2Img from '../assets/images/avatar_mentor_2_1794586969456.jpg';
import OpportunityCard from '../components/OpportunityCard';
import { useAuth } from '../context/AuthContext';
import { applicationsApi, opportunitiesApi } from '../services/api';
import type { Opportunity, PublicStats } from '../types';

export default function LandingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedWorkMode, setSelectedWorkMode] = useState('all');

  const [featuredJobs, setFeaturedJobs] = useState<Opportunity[]>([]);
  const [latestInternships, setLatestInternships] = useState<Opportunity[]>([]);
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [trackedOppIds, setTrackedOppIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [heroImgFailed, setHeroImgFailed] = useState(false);
  const [communityImgFailed, setCommunityImgFailed] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const [allJobsRes, internshipsRes, statsRes] = await Promise.all([
          opportunitiesApi.list({ limit: 12, sort: 'newest' }),
          opportunitiesApi.list({ type: 'Internship', limit: 3, sort: 'newest' }),
          opportunitiesApi.getStats(),
        ]);
        if (!mounted) return;
        const nonInternships = allJobsRes.items.filter((o) => o.type !== 'Internship').slice(0, 3);
        setFeaturedJobs(nonInternships);
        setLatestInternships(internshipsRes.items.slice(0, 3));
        setStats(statsRes.stats);
      } catch {
        // Keep clean fallback empty states
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setTrackedOppIds(new Set());
      return;
    }
    applicationsApi
      .listMy()
      .then((res) => {
        const ids = res.applications
          .map((a) => a.opportunityId)
          .filter((id): id is string => Boolean(id));
        setTrackedOppIds(new Set(ids));
      })
      .catch(() => null);
  }, [user]);

  const handleHeroSearch = (e: FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.set('search', searchQuery.trim());
    if (selectedType !== 'all') params.set('type', selectedType);
    if (selectedWorkMode !== 'all') params.set('workMode', selectedWorkMode);
    navigate(`/opportunities?${params.toString()}`);
  };

  return (
    <div className="bg-slate-50">
      {/* HERO SECTION */}
      <section className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
            {/* Left column */}
            <div className="lg:col-span-7 flex flex-col justify-center space-y-6">
              <div className="space-y-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">
                  Open-Source Job &amp; Internship Tracker
                </p>
                <h1
                  className="font-display font-bold tracking-tight text-slate-950 leading-[1.12]"
                  style={{ fontSize: 'clamp(2.25rem, 4vw, 3.5rem)', textWrap: 'balance' }}
                >
                  Discover vetted roles and track every application in one workspace.
                </h1>
                <p className="text-base sm:text-lg text-slate-600 max-w-2xl leading-relaxed">
                  Built for students, fresh graduates, and working engineers. Browse
                  community-submitted jobs and internships, save deadlines, and monitor every
                  stage from application to offer.
                </p>
              </div>

              {/* Large Opportunity Search Bar */}
              <form
                onSubmit={handleHeroSearch}
                className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-3"
              >
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                  <div className="sm:col-span-6 relative">
                    <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Role title, company, or skill (e.g. React)"
                      aria-label="Search opportunities by title, company, or skill"
                      className="w-full pl-10 pr-3 py-2.5 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:outline-none"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <select
                      value={selectedType}
                      onChange={(e) => setSelectedType(e.target.value)}
                      aria-label="Filter by opportunity type"
                      className="w-full px-3 py-2.5 text-sm bg-white border border-slate-200 rounded-lg text-slate-800 focus:border-blue-700 focus:outline-none"
                    >
                      <option value="all">All Types</option>
                      <option value="Full-time job">Full-time job</option>
                      <option value="Part-time job">Part-time job</option>
                      <option value="Internship">Internship</option>
                      <option value="Freelance">Freelance</option>
                    </select>
                  </div>
                  <div className="sm:col-span-3">
                    <select
                      value={selectedWorkMode}
                      onChange={(e) => setSelectedWorkMode(e.target.value)}
                      aria-label="Filter by work mode"
                      className="w-full px-3 py-2.5 text-sm bg-white border border-slate-200 rounded-lg text-slate-800 focus:border-blue-700 focus:outline-none"
                    >
                      <option value="all">Any Mode</option>
                      <option value="Remote">Remote</option>
                      <option value="Hybrid">Hybrid</option>
                      <option value="On-site">On-site</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => navigate('/opportunities?type=Internship&workMode=Remote')}
                      className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:border-slate-300 transition-colors"
                    >
                      Remote Internships
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate('/opportunities?type=Full-time+job')}
                      className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:border-slate-300 transition-colors"
                    >
                      Full-Time Roles
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate('/opportunities?paid=paid')}
                      className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:border-slate-300 transition-colors"
                    >
                      Paid Openings
                    </button>
                  </div>

                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
                  >
                    Search Roles
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </form>
            </div>

            {/* Right column */}
            <div className="lg:col-span-5 flex">
              <div className="w-full rounded-xl overflow-hidden border border-slate-200 bg-slate-100 min-h-[280px]">
                {!heroImgFailed ? (
                  <img
                    src={heroWorkspaceImg}
                    alt="Software engineer reviewing career metrics and job opportunities on dual monitors"
                    referrerPolicy="no-referrer"
                    onError={() => setHeroImgFailed(true)}
                    className="w-full h-full object-cover lg:h-full"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-slate-900 to-blue-900 p-8 flex flex-col justify-end text-white">
                    <Briefcase className="h-10 w-10 text-blue-300 mb-3" />
                    <p className="font-display text-xl font-semibold">
                      Structured Career Pipeline
                    </p>
                    <p className="text-sm text-slate-300 mt-1">
                      Centralize discovery, saved deadlines, and interview notes.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 4-column Platform Statistics Strip directly below Hero */}
          <div className="mt-10 pt-8 border-t border-slate-200 grid grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <p className="font-mono text-2xl sm:text-3xl font-bold text-slate-950 tabular-nums">
                {stats ? stats.approvedOpportunities : '—'}
              </p>
              <p className="text-sm text-slate-600 mt-1">Approved Opportunities</p>
            </div>
            <div>
              <p className="font-mono text-2xl sm:text-3xl font-bold text-slate-950 tabular-nums">
                {stats ? stats.activeInternships : '—'}
              </p>
              <p className="text-sm text-slate-600 mt-1">Active Internships</p>
            </div>
            <div>
              <p className="font-mono text-2xl sm:text-3xl font-bold text-slate-950 tabular-nums">
                {stats ? stats.contributors : '—'}
              </p>
              <p className="text-sm text-slate-600 mt-1">Community Members</p>
            </div>
            <div>
              <p className="font-mono text-2xl sm:text-3xl font-bold text-slate-950 tabular-nums">
                {stats ? stats.trackedApplications : '—'}
              </p>
              <p className="text-sm text-slate-600 mt-1">Tracked Applications</p>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURED JOBS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-950">
              Featured Jobs
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Full-time, part-time, and contract roles approved by platform moderators.
            </p>
          </div>
          <Link
            to="/opportunities?type=Full-time+job"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 hover:text-blue-800 whitespace-nowrap shrink-0"
          >
            View all jobs
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-60 bg-white border border-slate-200 rounded-xl p-6 animate-pulse" />
            ))}
          </div>
        ) : featuredJobs.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-3">
            <p className="text-sm text-slate-600">No approved job listings found yet.</p>
            <Link
              to="/submit"
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg"
            >
              Submit an Opportunity
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {featuredJobs.map((opp) => (
              <OpportunityCard
                key={opp._id}
                opportunity={opp}
                isTracked={trackedOppIds.has(opp._id)}
                onTracked={(id) => setTrackedOppIds((prev) => new Set(prev).add(id))}
              />
            ))}
          </div>
        )}
      </section>

      {/* LATEST INTERNSHIPS */}
      <section className="bg-white border-y border-slate-200 py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-950">
                Latest Internships
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Paid and open-source fellowship internships for students and recent graduates.
              </p>
            </div>
            <Link
              to="/opportunities?type=Internship"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 hover:text-blue-800 whitespace-nowrap shrink-0"
            >
              Browse internships
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-60 bg-slate-50 border border-slate-200 rounded-xl p-6 animate-pulse" />
              ))}
            </div>
          ) : latestInternships.length === 0 ? (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-10 text-center">
              <p className="text-sm text-slate-600">No internship listings available yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {latestInternships.map((opp) => (
                <OpportunityCard
                  key={opp._id}
                  opportunity={opp}
                  isTracked={trackedOppIds.has(opp._id)}
                  onTracked={(id) => setTrackedOppIds((prev) => new Set(prev).add(id))}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* HOW IT WORKS & FEATURES (ASYMMETRIC MECHANISM SECTION) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-6 space-y-8">
            <div className="space-y-2">
              <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-950">
                How the workflow stays organized
              </h2>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                Replace scattered spreadsheets and expired bookmarks with one structured workflow
                backed by role-based moderation.
              </p>
            </div>

            <div className="space-y-6 border-t border-slate-200 pt-6">
              <div className="flex gap-4">
                <span className="font-mono text-sm font-semibold text-blue-700 tabular-nums pt-0.5">
                  01.
                </span>
                <div>
                  <h3 className="font-display text-base font-semibold text-slate-950">
                    Filter verified community listings
                  </h3>
                  <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                    Search across internships, full-time roles, remote policies, and compensation
                    filters. Only admin-approved opportunities appear publicly.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <span className="font-mono text-sm font-semibold text-blue-700 tabular-nums pt-0.5">
                  02.
                </span>
                <div>
                  <h3 className="font-display text-base font-semibold text-slate-950">
                    Manage applications in Table or Kanban view
                  </h3>
                  <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                    Record application dates, interview notes, and stage transitions from Applied
                    to Selected with automatic timestamped history.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <span className="font-mono text-sm font-semibold text-blue-700 tabular-nums pt-0.5">
                  03.
                </span>
                <div>
                  <h3 className="font-display text-base font-semibold text-slate-950">
                    Submit openings to help peers
                  </h3>
                  <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                    Share verified roles with duplicate detection. Maintainers review submissions in
                    the admin queue before publishing.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-display text-base font-semibold text-slate-950">
                  Live Platform Application Funnel
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Aggregated across tracked applications stored in the database
                </p>
              </div>
              <Link
                to="/dashboard"
                className="text-xs font-semibold text-blue-700 hover:underline whitespace-nowrap"
              >
                Open Tracker
              </Link>
            </div>

            <div className="h-56 w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={200}>
                <BarChart
                  data={
                    stats?.applicationsByStage || [
                      { stage: 'Applied', count: 0 },
                      { stage: 'Shortlisted', count: 0 },
                      { stage: 'Interview', count: 0 },
                      { stage: 'Selected', count: 0 },
                    ]
                  }
                  margin={{ top: 10, right: 12, left: -18, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="stage" tick={{ fontSize: 12, fill: '#475569' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#475569' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="count" fill="#1d4ed8" radius={[6, 6, 0, 0]} maxBarSize={44} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100 text-xs">
              <div className="flex items-center gap-2 text-slate-700">
                <SlidersHorizontal className="h-4 w-4 text-blue-700 shrink-0" />
                <span>Multi-filter search</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <Bookmark className="h-4 w-4 text-blue-700 shrink-0" />
                <span>Duplicate-safe saves</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <CheckCircle2 className="h-4 w-4 text-blue-700 shrink-0" />
                <span>Stage history log</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <ShieldCheck className="h-4 w-4 text-blue-700 shrink-0" />
                <span>Backend RBAC</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* COMMUNITY SECTION */}
      <section className="bg-slate-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
            <div className="lg:col-span-6 rounded-xl overflow-hidden border border-slate-800 bg-slate-800 min-h-[260px]">
              {!communityImgFailed ? (
                <img
                  src={communityCollabImg}
                  alt="Software engineers collaborating on open-source career resources"
                  referrerPolicy="no-referrer"
                  onError={() => setCommunityImgFailed(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full p-8 flex flex-col justify-center">
                  <GitPullRequest className="h-10 w-10 text-blue-400 mb-3" />
                  <p className="font-display text-xl font-semibold">Community Maintained</p>
                </div>
              )}
            </div>

            <div className="lg:col-span-6 flex flex-col justify-between gap-8">
              <div className="space-y-4">
                <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-white">
                  Built in the open for students and engineers
                </h2>
                <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                  Every listing submitted by the community goes through moderator approval before
                  going live. Contribute new internships, keep deadlines accurate, or deploy your
                  own instance for your university club.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-4 space-y-3">
                  <p className="text-xs text-slate-300 leading-relaxed">
                    &ldquo;Having one place to separate remote internships from full-time roles
                    saved me hours of spreadsheet cleanup during campus placement season.&rdquo;
                  </p>
                  <div className="flex items-center gap-3">
                    <img
                      src={avatarMentor1Img}
                      alt="Ananya Deshmukh"
                      referrerPolicy="no-referrer"
                      className="h-9 w-9 rounded-full object-cover border border-slate-600"
                    />
                    <div>
                      <p className="text-xs font-semibold text-white">Ananya Deshmukh</p>
                      <p className="text-xs text-slate-400">Software Engineer, Community Reviewer</p>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-4 space-y-3">
                  <p className="text-xs text-slate-300 leading-relaxed">
                    &ldquo;Tracking interview notes alongside application timestamps made it easy
                    to follow up on shortlisted engineering internships.&rdquo;
                  </p>
                  <div className="flex items-center gap-3">
                    <img
                      src={avatarMentor2Img}
                      alt="Rohan Kulkarni"
                      referrerPolicy="no-referrer"
                      className="h-9 w-9 rounded-full object-cover border border-slate-600"
                    />
                    <div>
                      <p className="text-xs font-semibold text-white">Rohan Kulkarni</p>
                      <p className="text-xs text-slate-400">CS Graduate, Open-Source Contributor</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Link
                  to="/submit"
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-slate-950 bg-white hover:bg-slate-100 rounded-lg transition-colors whitespace-nowrap"
                >
                  Submit an Opportunity
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to={user ? '/dashboard' : '/register'}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white border border-slate-600 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap"
                >
                  {user ? 'Go to Dashboard' : 'Create Free Account'}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

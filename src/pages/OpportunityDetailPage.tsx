import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  CheckCircle2,
  ExternalLink,
  Info,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  applicationsApi,
  bookmarksApi,
  extractApiError,
  opportunitiesApi,
} from '../services/api';
import type { ApplicationStatus, Opportunity } from '../types';

export default function OpportunityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, bookmarkedIds, refreshBookmarks } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [opportunity, setOpportunity] = useState<Opportunity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTracked, setIsTracked] = useState(false);

  const [showTrackModal, setShowTrackModal] = useState(false);
  const [trackStatus, setTrackStatus] = useState<ApplicationStatus>('Applied');
  const [trackDate, setTrackDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [trackNotes, setTrackNotes] = useState('');
  const [submittingTrack, setSubmittingTrack] = useState(false);

  useEffect(() => {
    if (!id) return;
    let active = true;
    setLoading(true);
    setError(null);

    opportunitiesApi
      .getById(id)
      .then((res) => {
        if (active) setOpportunity(res.opportunity);
      })
      .catch((err) => {
        if (active) setError(extractApiError(err, 'Opportunity not found.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    if (!user || !id) {
      setIsTracked(false);
      return;
    }
    applicationsApi
      .listMy()
      .then((res) => {
        setIsTracked(res.applications.some((a) => a.opportunityId === id));
      })
      .catch(() => null);
  }, [user, id]);

  const isBookmarked = opportunity ? bookmarkedIds.has(opportunity._id) : false;

  const handleToggleBookmark = async () => {
    if (!opportunity) return;
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      if (isBookmarked) {
        await bookmarksApi.remove(opportunity._id);
        showToast('Removed from bookmarks.', 'info');
      } else {
        await bookmarksApi.create(opportunity._id);
        showToast('Saved to bookmarks.', 'success');
      }
      await refreshBookmarks();
    } catch (err) {
      showToast(extractApiError(err, 'Could not update bookmark.'), 'error');
    }
  };

  const handleCreateApplication = async (e: FormEvent) => {
    e.preventDefault();
    if (!opportunity) return;
    setSubmittingTrack(true);
    try {
      await applicationsApi.create({
        opportunityId: opportunity._id,
        status: trackStatus,
        appliedAt: trackDate,
        notes: trackNotes,
      });
      setIsTracked(true);
      setShowTrackModal(false);
      showToast('Application added to your personal tracker.', 'success');
    } catch (err) {
      showToast(extractApiError(err, 'Could not save application.'), 'error');
    } finally {
      setSubmittingTrack(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="h-80 bg-white border border-slate-200 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (error || !opportunity) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center space-y-4">
        <h1 className="font-display text-2xl font-bold text-slate-950">Opportunity Unavailable</h1>
        <p className="text-sm text-slate-600">{error || 'This listing could not be found.'}</p>
        <Link
          to="/opportunities"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Opportunities
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
      <Link
        to="/opportunities"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-950 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to all opportunities
      </Link>

      {opportunity.isSample && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 text-sm text-amber-950">
          <Info className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
          <p>
            <span className="font-semibold">Sample Data Record:</span> This opportunity is seeded
            for demonstration and testing. It does not represent a live employer vacancy.
          </p>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-100 pb-6">
          <div className="space-y-2">
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-950">
              {opportunity.title}
            </h1>
            <p className="text-base font-medium text-slate-700">{opportunity.company}</p>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 font-mono tabular-nums pt-1">
              <span className="text-slate-800 font-medium">{opportunity.type}</span>
              <span aria-hidden="true">·</span>
              <span>{opportunity.workMode}</span>
              <span aria-hidden="true">·</span>
              <span>{opportunity.location}</span>
              <span aria-hidden="true">·</span>
              <span className="text-slate-800">{opportunity.stipend}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleToggleBookmark}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-lg border transition-colors whitespace-nowrap ${
                isBookmarked
                  ? 'border-blue-200 bg-blue-50 text-blue-700'
                  : 'border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {isBookmarked ? (
                <>
                  <BookmarkCheck className="h-4 w-4" />
                  Saved
                </>
              ) : (
                <>
                  <Bookmark className="h-4 w-4" />
                  Save Role
                </>
              )}
            </button>

            {isTracked ? (
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 whitespace-nowrap"
              >
                <CheckCircle2 className="h-4 w-4" />
                Tracked in Dashboard
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => (user ? setShowTrackModal(true) : navigate('/login'))}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-lg border border-slate-200 text-slate-800 hover:bg-slate-50 whitespace-nowrap"
              >
                Track Application
              </button>
            )}

            <a
              href={opportunity.applicationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg bg-blue-700 text-white hover:bg-blue-800 transition-colors whitespace-nowrap"
            >
              Apply Externally
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-2 text-sm">
          <div>
            <p className="text-xs text-slate-500">Compensation</p>
            <p className="font-medium text-slate-900 mt-0.5">
              {opportunity.isPaid ? `Paid (${opportunity.stipend})` : 'Unpaid'}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Application Deadline</p>
            <p className="font-mono text-slate-900 tabular-nums mt-0.5">
              {opportunity.deadline
                ? new Date(opportunity.deadline).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : 'Rolling'}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Submitted On</p>
            <p className="font-mono text-slate-900 tabular-nums mt-0.5">
              {new Date(opportunity.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Moderation Status</p>
            <p className="font-medium text-slate-900 capitalize mt-0.5">{opportunity.status}</p>
          </div>
        </div>

        <div className="space-y-2 border-t border-slate-100 pt-6">
          <h2 className="font-display text-lg font-semibold text-slate-950">Role Description</h2>
          <p className="text-sm sm:text-base text-slate-700 leading-relaxed whitespace-pre-line">
            {opportunity.description}
          </p>
        </div>

        {opportunity.skills.length > 0 && (
          <div className="space-y-2 border-t border-slate-100 pt-6">
            <h2 className="font-display text-lg font-semibold text-slate-950">Required Skills</h2>
            <p className="text-sm text-slate-700 font-medium">
              {opportunity.skills.join(' · ')}
            </p>
          </div>
        )}
      </div>

      {/* Track Application Modal */}
      {showTrackModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="track-modal-title"
          className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4"
        >
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 space-y-5 shadow-xl">
            <div>
              <h2 id="track-modal-title" className="font-display text-lg font-bold text-slate-950">
                Track Application
              </h2>
              <p className="text-xs text-slate-600 mt-1">
                {opportunity.title} at {opportunity.company}
              </p>
            </div>

            <form onSubmit={handleCreateApplication} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Application Status
                </label>
                <select
                  value={trackStatus}
                  onChange={(e) => setTrackStatus(e.target.value as ApplicationStatus)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
                >
                  <option value="Applied">Applied</option>
                  <option value="Interview">Interview</option>
                  <option value="Shortlisted">Shortlisted</option>
                  <option value="Selected">Selected</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Application Date
                </label>
                <input
                  type="date"
                  value={trackDate}
                  onChange={(e) => setTrackDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Personal Notes
                </label>
                <textarea
                  rows={3}
                  value={trackNotes}
                  onChange={(e) => setTrackNotes(e.target.value)}
                  placeholder="Resume version used, referral name, follow-up reminder..."
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTrackModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingTrack}
                  className="px-4 py-2 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg disabled:opacity-60"
                >
                  {submittingTrack ? 'Saving...' : 'Save to Tracker'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

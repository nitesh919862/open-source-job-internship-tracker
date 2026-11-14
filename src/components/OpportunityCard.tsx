import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowUpRight, Bookmark, BookmarkCheck, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { applicationsApi, bookmarksApi, extractApiError } from '../services/api';
import type { Opportunity } from '../types';

interface OpportunityCardProps {
  opportunity: Opportunity;
  isTracked?: boolean;
  onTracked?: (opportunityId: string) => void;
}

export default function OpportunityCard({
  opportunity,
  isTracked = false,
  onTracked,
}: OpportunityCardProps) {
  const { user, bookmarkedIds, refreshBookmarks } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [bookmarkBusy, setBookmarkBusy] = useState(false);
  const [trackBusy, setTrackBusy] = useState(false);

  const isBookmarked = bookmarkedIds.has(opportunity._id);

  const formattedDeadline = opportunity.deadline
    ? new Date(opportunity.deadline).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Rolling';

  const handleToggleBookmark = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    setBookmarkBusy(true);
    try {
      if (isBookmarked) {
        await bookmarksApi.remove(opportunity._id);
        showToast('Removed from saved opportunities.', 'info');
      } else {
        await bookmarksApi.create(opportunity._id);
        showToast('Saved to your bookmarked opportunities.', 'success');
      }
      await refreshBookmarks();
    } catch (err) {
      showToast(extractApiError(err, 'Could not update bookmark.'), 'error');
    } finally {
      setBookmarkBusy(false);
    }
  };

  const handleQuickTrack = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (isTracked) {
      navigate('/dashboard');
      return;
    }
    setTrackBusy(true);
    try {
      await applicationsApi.create({
        opportunityId: opportunity._id,
        status: 'Applied',
        appliedAt: new Date().toISOString(),
        notes: 'Tracked from opportunity listing.',
      });
      showToast(`Added "${opportunity.title}" to your Application Tracker.`, 'success');
      onTracked?.(opportunity._id);
    } catch (err) {
      showToast(extractApiError(err, 'Could not track application.'), 'error');
    } finally {
      setTrackBusy(false);
    }
  };

  return (
    <article className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between gap-5 hover:border-slate-300 transition-colors">
      <div className="space-y-3">
        {/* Card leads directly with primary title and company */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <Link
              to={`/opportunities/${opportunity._id}`}
              className="font-display text-lg font-semibold text-slate-950 hover:text-blue-700 transition-colors line-clamp-2"
            >
              {opportunity.title}
            </Link>
            <p className="text-sm font-medium text-slate-700 mt-1">{opportunity.company}</p>
          </div>

          <button
            type="button"
            onClick={handleToggleBookmark}
            disabled={bookmarkBusy}
            aria-label={isBookmarked ? 'Remove bookmark' : 'Save opportunity'}
            title={isBookmarked ? 'Saved' : 'Save opportunity'}
            className={`p-2 rounded-lg border transition-colors shrink-0 ${
              isBookmarked
                ? 'border-blue-200 bg-blue-50 text-blue-700'
                : 'border-slate-200 text-slate-500 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            {isBookmarked ? (
              <BookmarkCheck className="h-4 w-4" />
            ) : (
              <Bookmark className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Clean unboxed metadata with typographic separators */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 font-mono tabular-nums">
          <span className="text-slate-800 font-medium">{opportunity.type}</span>
          <span aria-hidden="true">·</span>
          <span>{opportunity.workMode}</span>
          <span aria-hidden="true">·</span>
          <span>{opportunity.location}</span>
          <span aria-hidden="true">·</span>
          <span className="text-slate-800">{opportunity.stipend}</span>
          {opportunity.isSample && (
            <>
              <span aria-hidden="true">·</span>
              <span className="text-amber-700 font-medium">Sample Data</span>
            </>
          )}
        </div>

        <p className="text-sm text-slate-600 leading-relaxed line-clamp-2">
          {opportunity.description}
        </p>

        {opportunity.skills.length > 0 && (
          <p className="text-xs text-slate-500 truncate">
            <span className="font-medium text-slate-700">Skills:</span>{' '}
            {opportunity.skills.slice(0, 5).join(' · ')}
          </p>
        )}
      </div>

      <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
        <span className="text-xs text-slate-500 font-mono tabular-nums">
          Deadline: {formattedDeadline}
        </span>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleQuickTrack}
            disabled={trackBusy}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
          >
            {isTracked ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                Tracked
              </>
            ) : trackBusy ? (
              'Saving...'
            ) : (
              'Track'
            )}
          </button>
          <Link
            to={`/opportunities/${opportunity._id}`}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-900 text-white hover:bg-blue-700 transition-colors whitespace-nowrap shrink-0"
          >
            Details
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </article>
  );
}

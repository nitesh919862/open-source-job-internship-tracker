import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { SubmissionStatusLabel } from '../components/StatusLabel';
import { useToast } from '../context/ToastContext';
import { extractApiError, opportunitiesApi } from '../services/api';
import type { Opportunity } from '../types';

export default function SubmitOpportunityPage() {
  const { showToast } = useToast();

  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [description, setDescription] = useState('');
  const [skills, setSkills] = useState('');
  const [type, setType] = useState('Internship');
  const [workMode, setWorkMode] = useState('Remote');
  const [location, setLocation] = useState('');
  const [stipend, setStipend] = useState('');
  const [isPaid, setIsPaid] = useState(true);
  const [deadline, setDeadline] = useState('');
  const [applicationUrl, setApplicationUrl] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mySubmissions, setMySubmissions] = useState<Opportunity[]>([]);
  const [loadingMine, setLoadingMine] = useState(true);

  const loadMySubmissions = async () => {
    setLoadingMine(true);
    try {
      const res = await opportunitiesApi.getMySubmissions();
      setMySubmissions(res.items);
    } catch {
      // ignore
    } finally {
      setLoadingMine(false);
    }
  };

  useEffect(() => {
    loadMySubmissions();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (title.trim().length < 3) {
      setError('Opportunity title must be at least 3 characters.');
      return;
    }
    if (company.trim().length < 2) {
      setError('Company name must be at least 2 characters.');
      return;
    }
    if (description.trim().length < 20) {
      setError('Description must be at least 20 characters.');
      return;
    }

    setSubmitting(true);
    try {
      await opportunitiesApi.submit({
        title: title.trim(),
        company: company.trim(),
        description: description.trim(),
        skills,
        type,
        workMode,
        location: location.trim(),
        stipend: isPaid ? stipend.trim() || 'Competitive' : 'Unpaid',
        isPaid,
        deadline: deadline || undefined,
        applicationUrl: applicationUrl.trim(),
      });

      showToast('Opportunity submitted! It is now queued for admin approval.', 'success');
      setTitle('');
      setCompany('');
      setDescription('');
      setSkills('');
      setLocation('');
      setStipend('');
      setDeadline('');
      setApplicationUrl('');
      await loadMySubmissions();
    } catch (err) {
      setError(extractApiError(err, 'Could not submit opportunity.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="border-b border-slate-200 pb-6">
        <h1 className="font-display text-3xl font-bold tracking-tight text-slate-950">
          Submit an Opportunity
        </h1>
        <p className="text-sm text-slate-600 mt-1 max-w-2xl">
          Share a job, internship, or fellowship with the community. New submissions enter a
          pending queue and appear publicly once approved by an administrator.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Submission Form */}
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-5"
        >
          <h2 className="font-display text-lg font-semibold text-slate-950">
            Opportunity Details
          </h2>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 text-sm rounded-lg p-3.5">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="sub-title" className="block text-xs font-medium text-slate-700 mb-1">
                Opportunity Title *
              </label>
              <input
                id="sub-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="Frontend Engineering Intern"
                className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:border-blue-700 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="sub-company" className="block text-xs font-medium text-slate-700 mb-1">
                Company / Organization *
              </label>
              <input
                id="sub-company"
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                required
                placeholder="Northstar Cloud Labs"
                className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:border-blue-700 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="sub-type" className="block text-xs font-medium text-slate-700 mb-1">
                Job Type *
              </label>
              <select
                id="sub-type"
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:border-blue-700 focus:outline-none"
              >
                <option value="Full-time job">Full-time job</option>
                <option value="Part-time job">Part-time job</option>
                <option value="Internship">Internship</option>
                <option value="Freelance">Freelance</option>
              </select>
            </div>
            <div>
              <label htmlFor="sub-mode" className="block text-xs font-medium text-slate-700 mb-1">
                Work Mode *
              </label>
              <select
                id="sub-mode"
                value={workMode}
                onChange={(e) => setWorkMode(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:border-blue-700 focus:outline-none"
              >
                <option value="Remote">Remote</option>
                <option value="Hybrid">Hybrid</option>
                <option value="On-site">On-site</option>
              </select>
            </div>
            <div>
              <label htmlFor="sub-loc" className="block text-xs font-medium text-slate-700 mb-1">
                Location *
              </label>
              <input
                id="sub-loc"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                required
                placeholder="Bengaluru / Remote"
                className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:border-blue-700 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Compensation Type
              </label>
              <div className="flex rounded-lg border border-slate-200 p-1 bg-slate-50">
                <button
                  type="button"
                  onClick={() => setIsPaid(true)}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    isPaid ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                  }`}
                >
                  Paid
                </button>
                <button
                  type="button"
                  onClick={() => setIsPaid(false)}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    !isPaid ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                  }`}
                >
                  Unpaid
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="sub-stipend" className="block text-xs font-medium text-slate-700 mb-1">
                Stipend / Salary
              </label>
              <input
                id="sub-stipend"
                type="text"
                value={isPaid ? stipend : 'Unpaid'}
                disabled={!isPaid}
                onChange={(e) => setStipend(e.target.value)}
                placeholder="₹35,000 / month"
                className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg disabled:bg-slate-50 disabled:text-slate-400 focus:border-blue-700 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="sub-deadline" className="block text-xs font-medium text-slate-700 mb-1">
                Application Deadline
              </label>
              <input
                id="sub-deadline"
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:border-blue-700 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label htmlFor="sub-url" className="block text-xs font-medium text-slate-700 mb-1">
              Application Link (URL) *
            </label>
            <input
              id="sub-url"
              type="url"
              value={applicationUrl}
              onChange={(e) => setApplicationUrl(e.target.value)}
              required
              placeholder="https://careers.example.org/roles/swe-intern"
              className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:border-blue-700 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="sub-skills" className="block text-xs font-medium text-slate-700 mb-1">
              Skills Required (comma-separated)
            </label>
            <input
              id="sub-skills"
              type="text"
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
              placeholder="React, TypeScript, Node.js, Git"
              className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:border-blue-700 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="sub-desc" className="block text-xs font-medium text-slate-700 mb-1">
              Description *
            </label>
            <textarea
              id="sub-desc"
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              minLength={20}
              placeholder="Outline key responsibilities, eligibility, and application instructions (minimum 20 characters)..."
              className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:border-blue-700 focus:outline-none"
            />
          </div>

          <div className="pt-2 flex items-center justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors disabled:opacity-60"
            >
              {submitting ? 'Submitting...' : 'Submit for Review'}
            </button>
          </div>
        </form>

        {/* User's Recent Submissions */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="font-display text-base font-semibold text-slate-950">
              Your Recent Submissions
            </h2>
            <span className="font-mono text-xs text-slate-500 tabular-nums">
              {mySubmissions.length} total
            </span>
          </div>

          {loadingMine ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-20 bg-slate-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : mySubmissions.length === 0 ? (
            <p className="text-sm text-slate-500 py-6 text-center">
              You have not submitted any opportunities yet.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {mySubmissions.map((item) => (
                <li key={item._id} className="py-3.5 space-y-1.5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      {item.status === 'approved' ? (
                        <Link
                          to={`/opportunities/${item._id}`}
                          className="text-sm font-semibold text-slate-950 hover:text-blue-700"
                        >
                          {item.title}
                        </Link>
                      ) : (
                        <p className="text-sm font-semibold text-slate-950">{item.title}</p>
                      )}
                      <p className="text-xs text-slate-500">
                        {item.company} · {item.type}
                      </p>
                    </div>
                    <SubmissionStatusLabel status={item.status} />
                  </div>
                  {item.reviewNote && (
                    <p className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5">
                      Moderator note: {item.reviewNote}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

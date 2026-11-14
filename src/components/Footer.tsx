import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-slate-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-slate-200">
          <div className="md:col-span-2 space-y-3">
            <Link
              to="/"
              className="font-display text-lg font-bold tracking-tight text-slate-950 inline-block"
            >
              Open-Source Job &amp; Internship Tracker
            </Link>
            <p className="text-sm text-slate-600 max-w-md leading-relaxed">
              An open-source career discovery and application tracking platform built for students,
              graduates, and working engineers. Seeded listings labeled as Sample Data are provided
              solely for development and testing.
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-slate-900">Platform</h3>
            <ul className="space-y-2 text-sm text-slate-600">
              <li>
                <Link to="/opportunities" className="hover:text-slate-950 transition-colors">
                  Browse Opportunities
                </Link>
              </li>
              <li>
                <Link
                  to="/opportunities?type=Internship"
                  className="hover:text-slate-950 transition-colors"
                >
                  Latest Internships
                </Link>
              </li>
              <li>
                <Link to="/submit" className="hover:text-slate-950 transition-colors">
                  Submit an Opening
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="hover:text-slate-950 transition-colors">
                  Application Tracker
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-slate-900">Account &amp; Governance</h3>
            <ul className="space-y-2 text-sm text-slate-600">
              <li>
                <Link to="/login" className="hover:text-slate-950 transition-colors">
                  Sign In
                </Link>
              </li>
              <li>
                <Link to="/register" className="hover:text-slate-950 transition-colors">
                  Create Account
                </Link>
              </li>
              <li>
                <Link to="/admin" className="hover:text-slate-950 transition-colors">
                  Admin Moderation
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} Open-Source Job &amp; Internship Tracker · MIT Licensed</p>
          <p>Sample opportunity listings are clearly tagged and do not represent live employer vacancies.</p>
        </div>
      </div>
    </footer>
  );
}

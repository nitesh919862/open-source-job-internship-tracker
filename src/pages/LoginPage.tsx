import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { extractApiError } from '../services/api';

export default function LoginPage() {
  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError('Email and password are required.');
      return;
    }

    setSubmitting(true);
    try {
      const user = await login(email.trim(), password);
      showToast(`Signed in as ${user.name}.`, 'success');
      navigate(user.role === 'admin' && from === '/dashboard' ? '/admin' : from, { replace: true });
    } catch (err) {
      setError(extractApiError(err, 'Invalid email or password.'));
    } finally {
      setSubmitting(false);
    }
  };

  const fillSampleUser = () => {
    if (!import.meta.env.DEV) return;
    setEmail('seeker@opentrack.dev');
    setPassword('SeekerPassword123!');
  };

  return (
    <div className="max-w-md mx-auto px-4 py-14 space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-950">Sign in to OpenTrack</h1>
          <p className="text-sm text-slate-600 mt-1">
            Access your saved opportunities, application tracker, and submissions.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 text-sm rounded-lg p-3">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="login-email" className="block text-xs font-medium text-slate-700 mb-1">
              Email Address
            </label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="you@example.com"
              className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg focus:border-blue-700 focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="login-password"
              className="block text-xs font-medium text-slate-700 mb-1"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="Enter your password"
                className="w-full px-3.5 py-2.5 pr-10 text-sm border border-slate-200 rounded-lg focus:border-blue-700 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-slate-900 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-60"
          >
            {submitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="text-sm text-slate-600 text-center">
          New to OpenTrack?{' '}
          <Link to="/register" className="font-semibold text-blue-700 hover:underline">
            Create an account
          </Link>
        </p>
      </div>

      {/* Development-only helper (tree-shaken out of production builds) */}
      {import.meta.env.DEV && (
        <div className="bg-slate-100 border border-slate-200 rounded-xl p-5 space-y-3">
          <p className="text-xs font-semibold text-slate-800">
            Development Preview Helper (Disabled in Production)
          </p>
          <p className="text-xs text-slate-600 leading-relaxed">
            In development mode you can fill the seeded member account or sign in as an admin
            initialized via <code className="font-mono text-slate-800">npm run init-admin</code>.
          </p>
          <button
            type="button"
            onClick={fillSampleUser}
            className="w-full text-left p-2.5 bg-white border border-slate-200 rounded-lg hover:border-blue-400 transition-colors"
          >
            <p className="text-xs font-semibold text-slate-900">Fill Dev Member Account</p>
            <p className="text-[11px] font-mono text-slate-500 truncate">seeker@opentrack.dev</p>
          </button>
        </div>
      )}
    </div>
  );
}

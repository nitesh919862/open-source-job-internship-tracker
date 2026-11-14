import { useState } from 'react';
import { Database, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function ConfigNoticeBanner() {
  const { databaseStatus } = useAuth();
  const [dismissed, setDismissed] = useState(false);

  if (!databaseStatus || databaseStatus.mode === 'mongodb' || dismissed) {
    return null;
  }

  return (
    <div className="bg-slate-900 text-slate-100 border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <Database className="h-4 w-4 text-amber-400 shrink-0" />
          <p className="truncate sm:whitespace-normal">
            <span className="font-semibold text-white">Local Persistence Mode:</span>{' '}
            <code className="font-mono text-amber-300">MONGODB_URI</code> is not configured in{' '}
            <code className="font-mono text-slate-300">.env</code>. Data is persisting locally in{' '}
            <code className="font-mono text-slate-300">.data/store.json</code>. Add your MongoDB
            Atlas URI to switch to cloud persistence.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss configuration notice"
          className="text-slate-400 hover:text-white p-1 shrink-0"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

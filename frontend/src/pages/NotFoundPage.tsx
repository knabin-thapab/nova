import React from 'react';
import { AlertCircle, Home } from 'lucide-react';

interface NotFoundPageProps {
  onNavigate: (route: string) => void;
}

export const NotFoundPage: React.FC<NotFoundPageProps> = ({ onNavigate }) => {
  return (
    <div className="max-w-md mx-auto py-16 text-center space-y-6">
      <div className="w-16 h-16 mx-auto rounded-3xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shadow-xl">
        <AlertCircle className="w-8 h-8" />
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-slate-100">Page Not Found (404)</h1>
        <p className="text-xs text-slate-400 leading-relaxed">
          The requested page could not be located. You can navigate back to the main restoration workstation or explore our guides.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
        <button
          type="button"
          onClick={() => onNavigate('/')}
          className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 flex items-center justify-center space-x-2 transition-all cursor-pointer"
        >
          <Home className="w-4 h-4" />
          <span>Return to Workstation</span>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('/guides')}
          className="w-full sm:w-auto px-4 py-3 rounded-xl bg-surface-elevated hover:bg-slate-800 text-slate-300 text-xs font-semibold border border-white/10 transition-colors"
        >
          Browse Guides
        </button>
      </div>
    </div>
  );
};

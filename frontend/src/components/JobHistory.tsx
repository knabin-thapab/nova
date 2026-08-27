import React from 'react';
import { History, Download, CheckCircle2, AlertCircle, ArrowRight, Trash2 } from 'lucide-react';
import { RestorationJob } from '../types';
import { getDownloadUrl } from '../services/api';

interface JobHistoryProps {
  jobs: RestorationJob[];
  onSelectJob: (job: RestorationJob) => void;
  selectedJobId?: string;
  onDeleteJob?: (jobId: string) => void;
  onClearAll?: () => void;
}

export const JobHistory: React.FC<JobHistoryProps> = ({
  jobs,
  onSelectJob,
  selectedJobId,
  onDeleteJob,
  onClearAll
}) => {
  if (jobs.length === 0) return null;

  return (
    <div className="glass-panel rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 max-w-6xl mx-auto my-6 border border-white/10">
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400">
            <History className="w-4 h-4" />
          </div>
          <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-200">
            Restoration Session History ({jobs.length})
          </h3>
        </div>

        {onClearAll && jobs.length > 0 && (
          <button
            onClick={onClearAll}
            className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 text-[11px] font-semibold flex items-center space-x-1.5 transition-all cursor-pointer"
            title="Clear all session history"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Clear All</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {jobs.map((job) => (
          <div
            key={job.id}
            onClick={() => onSelectJob(job)}
            className={`relative group p-4 rounded-2xl border transition-all cursor-pointer ${
              selectedJobId === job.id
                ? 'border-indigo-500 bg-indigo-500/10 shadow-lg shadow-indigo-500/10'
                : 'border-white/5 bg-surface-elevated/60 hover:bg-surface-elevated hover:border-white/20'
            }`}
          >
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-mono font-bold text-slate-300 truncate max-w-[120px]">{job.id}</span>
              <div className="flex items-center space-x-1.5">
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase flex items-center space-x-1 ${
                    job.status === 'completed'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : job.status === 'failed'
                      ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                  }`}
                >
                  {job.status === 'completed' && <CheckCircle2 className="w-3 h-3" />}
                  {job.status === 'failed' && <AlertCircle className="w-3 h-3" />}
                  <span>{job.status}</span>
                </span>

                {onDeleteJob && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteJob(job.id);
                    }}
                    className="p-1 rounded-md text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer"
                    title="Remove from history"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="text-xs space-y-1">
              <div className="font-semibold text-slate-100 truncate">
                {job.source.fileName || 'Video'}
              </div>
              <div className="text-[11px] font-mono text-slate-400 flex items-center space-x-1.5">
                <span>{job.source.width}×{job.source.height}</span>
                <ArrowRight className="w-3 h-3 text-indigo-400" />
                <span className="text-indigo-300 font-bold">{job.target.width}×{job.target.height}</span>
                <span>({job.target.fps} FPS)</span>
              </div>
            </div>

            {job.restoredUrl && job.status === 'completed' && (
              <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-400">Restored MP4 Ready</span>
                <a
                  href={getDownloadUrl(job.id)}
                  download={`nova_restored_${job.target.width}x${job.target.height}.mp4`}
                  onClick={(e) => e.stopPropagation()}
                  className="text-emerald-400 hover:text-emerald-300 flex items-center space-x-1 font-semibold cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </a>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

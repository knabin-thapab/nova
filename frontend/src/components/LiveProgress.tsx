import React from 'react';
import { Activity, CheckCircle2, Circle, Clock, Cpu, Loader2, StopCircle, Zap } from 'lucide-react';
import { RestorationJob, SystemTelemetry } from '../types';

interface LiveProgressProps {
  job: RestorationJob;
  telemetry: SystemTelemetry | null;
  onCancel: () => void;
}

export const LiveProgress: React.FC<LiveProgressProps> = ({ job, telemetry, onCancel }) => {
  const formatTime = (sec?: number) => {
    if (sec === undefined || isNaN(sec) || sec < 0) return '00:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="glass-panel rounded-2xl p-4 sm:p-6 shadow-2xl space-y-5 sm:space-y-6 max-w-4xl mx-auto my-6 border border-white/10">
      {/* Title & Cancel */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div className="flex items-center space-x-3 min-w-0">
          <div className="p-2 sm:p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400 flex-shrink-0">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-bold text-slate-100 flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span>Restoring Video with Temporal AI</span>
              <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono">
                {job.id}
              </span>
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 truncate">
              {job.stage || 'Executing multi-frame neural inference...'}
            </p>
          </div>
        </div>

        <button
          onClick={onCancel}
          className="w-full sm:w-auto px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all cursor-pointer flex-shrink-0"
        >
          <StopCircle className="w-4 h-4" />
          <span>Cancel Restoration</span>
        </button>
      </div>

      {/* Progress Bar & Authentic Metrics */}
      <div className="space-y-2">
        <div className="flex justify-between items-baseline text-xs">
          <span className="font-semibold text-slate-300">Total Pipeline Progress</span>
          <span className="text-xl font-bold font-mono text-indigo-400">
            {job.progress.toFixed(1)}%
          </span>
        </div>
        <div className="w-full h-3 bg-slate-800/80 rounded-full overflow-hidden p-0.5 border border-white/5">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400 rounded-full transition-all duration-300 shadow-lg shadow-indigo-500/50"
            style={{ width: `${Math.max(job.progress, 2)}%` }}
          />
        </div>
      </div>

      {/* Live Pipeline Telemetry Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-3 rounded-xl bg-surface-elevated/70 border border-white/5 space-y-1">
          <div className="text-slate-400 text-[11px] flex items-center space-x-1">
            <Activity className="w-3 h-3 text-cyan-400" />
            <span>Frame Progress</span>
          </div>
          <div className="font-mono text-sm font-bold text-slate-100">
            {job.currentFrame || 0} / {job.totalFrames || 0}
          </div>
          <div className="text-[10px] text-slate-400">
            {job.fpsProcessing ? `${job.fpsProcessing} FPS processing` : 'Processing'}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-surface-elevated/70 border border-white/5 space-y-1">
          <div className="text-slate-400 text-[11px] flex items-center space-x-1">
            <Clock className="w-3 h-3 text-purple-400" />
            <span>Estimated Remaining</span>
          </div>
          <div className="font-mono text-sm font-bold text-slate-100">
            {formatTime(job.estimatedRemainingSec)}
          </div>
          <div className="text-[10px] text-slate-400 font-mono">
            Elapsed: {formatTime(job.elapsedSec)}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-surface-elevated/70 border border-white/5 space-y-1">
          <div className="text-slate-400 text-[11px] flex items-center space-x-1">
            <Cpu className="w-3 h-3 text-emerald-400" />
            <span>Compute Telemetry</span>
          </div>
          <div className="font-mono text-sm font-bold text-slate-100">
            {telemetry?.gpu?.available ? (
              <span className="text-emerald-400">{telemetry.gpu.name || 'GPU Active'}</span>
            ) : (
              <span className="text-amber-400">CPU Fallback</span>
            )}
          </div>
          <div className="text-[10px] text-slate-400 font-mono space-y-0.5">
            <div>CPU: {telemetry?.cpuPercent || 0}% | RAM: {telemetry?.ramUsedGB || 0} GB</div>
            {telemetry?.gpu?.vramUsedGB != null && (
              <div>VRAM: {telemetry.gpu.vramUsedGB} / {telemetry.gpu.vramTotalGB} GB</div>
            )}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-surface-elevated/70 border border-white/5 space-y-1">
          <div className="text-slate-400 text-[11px] flex items-center space-x-1">
            <Zap className="w-3 h-3 text-amber-400 fill-amber-400/20" />
            <span>Target Resolution</span>
          </div>
          <div className="font-mono text-sm font-bold text-slate-100">
            {job.target.width} × {job.target.height}
          </div>
          <div className="text-[10px] text-slate-400">
            {job.target.scale}× AI Super-Res ({job.target.fps} FPS)
          </div>
        </div>
      </div>

      {/* Stage Flow Indicator */}
      <div className="p-4 rounded-xl bg-surface-elevated/40 border border-white/5 space-y-3">
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Processing Flow
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          {[
            { key: 'decoding', label: '1. Frame Extraction' },
            { key: 'restoring', label: '2. Neural VSR Pass' },
            { key: 'encoding', label: '3. Master Encoding' },
            { key: 'completed', label: '4. Output Verified' },
          ].map((s) => {
            const isCurrent = job.status === s.key;
            const isDone =
              (s.key === 'decoding' && job.status !== 'queued' && job.status !== 'analyzing') ||
              (s.key === 'restoring' && (job.status === 'encoding' || job.status === 'verifying' || job.status === 'completed')) ||
              (s.key === 'encoding' && (job.status === 'verifying' || job.status === 'completed')) ||
              (s.key === 'completed' && job.status === 'completed');

            return (
              <div
                key={s.key}
                className={`p-2.5 rounded-xl border flex items-center space-x-2 transition-all ${
                  isCurrent
                    ? 'border-indigo-500/50 bg-indigo-500/10 text-indigo-300 font-semibold shadow-md'
                    : isDone
                    ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-400'
                    : 'border-white/5 bg-surface/40 text-slate-500'
                }`}
              >
                {isDone ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                ) : isCurrent ? (
                  <Loader2 className="w-3.5 h-3.5 text-indigo-400 animate-spin flex-shrink-0" />
                ) : (
                  <Circle className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
                )}
                <span className="truncate">{s.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

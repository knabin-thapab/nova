import React from 'react';
import { Film, Clock, Layers, FileCode, Gauge, Volume2, ShieldCheck } from 'lucide-react';
import { MediaMetadata } from '../types';

interface MediaProbeViewProps {
  metadata: MediaMetadata;
}

export const MediaProbeView: React.FC<MediaProbeViewProps> = ({ metadata }) => {
  const formatBitrate = (kbps?: number) => {
    if (!kbps) return 'Variable';
    if (kbps >= 1000) return `${(kbps / 1000).toFixed(2)} Mbps`;
    return `${kbps} kbps`;
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'N/A';
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  return (
    <div className="glass-panel rounded-2xl p-5 shadow-xl space-y-4">
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
            <Film className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Source Stream Analysis
            </h4>
            <p className="text-sm font-semibold text-slate-100 font-mono truncate max-w-sm">
              {metadata.fileName || 'Source Video'}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-medium text-emerald-400">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Probe Verified</span>
        </div>
      </div>

      {/* Grid of Authentic Metadata Values */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-3 rounded-xl bg-surface-elevated/80 border border-white/5 space-y-1">
          <div className="text-slate-400 flex items-center space-x-1.5 text-[11px]">
            <Layers className="w-3 h-3 text-cyan-400" />
            <span>Resolution</span>
          </div>
          <div className="font-mono text-sm font-bold text-slate-100">
            {metadata.width} × {metadata.height}
          </div>
          <div className="text-[10px] text-slate-400">
            Aspect: {(metadata.width / Math.max(metadata.height, 1)).toFixed(2)}:1
          </div>
        </div>

        <div className="p-3 rounded-xl bg-surface-elevated/80 border border-white/5 space-y-1">
          <div className="text-slate-400 flex items-center space-x-1.5 text-[11px]">
            <Clock className="w-3 h-3 text-purple-400" />
            <span>Frame Rate</span>
          </div>
          <div className="font-mono text-sm font-bold text-slate-100">
            {metadata.fps} FPS
          </div>
          <div className="text-[10px] text-slate-400 font-mono">
            {metadata.frameCount} total frames
          </div>
        </div>

        <div className="p-3 rounded-xl bg-surface-elevated/80 border border-white/5 space-y-1">
          <div className="text-slate-400 flex items-center space-x-1.5 text-[11px]">
            <Gauge className="w-3 h-3 text-amber-400" />
            <span>Duration & Bitrate</span>
          </div>
          <div className="font-mono text-sm font-bold text-slate-100">
            {metadata.duration.toFixed(2)}s
          </div>
          <div className="text-[10px] text-slate-400 font-mono">
            {formatBitrate(metadata.bitrate)} ({formatFileSize(metadata.fileSize)})
          </div>
        </div>

        <div className="p-3 rounded-xl bg-surface-elevated/80 border border-white/5 space-y-1">
          <div className="text-slate-400 flex items-center space-x-1.5 text-[11px]">
            <FileCode className="w-3 h-3 text-emerald-400" />
            <span>Codec & Color</span>
          </div>
          <div className="font-mono text-sm font-bold text-slate-100 truncate">
            {metadata.codec || 'H.264'}
          </div>
          <div className="text-[10px] text-slate-400 font-mono truncate">
            {metadata.pixelFormat || 'yuv420p'} • {metadata.colorSpace || 'bt709'}
          </div>
        </div>
      </div>

      {/* Audio Stream Info */}
      <div className="p-2.5 rounded-xl bg-surface-elevated/40 border border-white/5 flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2 text-slate-300">
          <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
          <span>Audio Stream:</span>
          <span className="font-mono text-slate-200">
            {metadata.hasAudio
              ? `${metadata.audioCodec || 'AAC'} (${metadata.audioSampleRate || '48kHz'}, ${metadata.audioChannels === 2 ? 'Stereo' : 'Mono'})`
              : 'No audio track present in source'}
          </span>
        </div>
        <span className="text-[10px] font-mono text-slate-400">
          {metadata.hasAudio ? 'Pass-through Multiplexing Ready' : 'Video Only Pipeline'}
        </span>
      </div>
    </div>
  );
};

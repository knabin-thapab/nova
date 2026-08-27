import React, { useState } from 'react';
import { Sliders, Play, ChevronDown, ChevronUp, Clock, HardDrive, Cpu } from 'lucide-react';
import { MediaMetadata, RestorationConfig } from '../types';

interface ConfigPanelProps {
  metadata: MediaMetadata;
  config: RestorationConfig;
  onChange: (newConfig: RestorationConfig) => void;
  onStartRestoration: () => void;
  isProcessing: boolean;
}

export const ConfigPanel: React.FC<ConfigPanelProps> = ({
  metadata,
  config,
  onChange,
  onStartRestoration,
  isProcessing,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const updateConfig = (key: keyof RestorationConfig, value: any) => {
    onChange({ ...config, [key]: value });
  };

  // Smart resolution calculation
  const smartScale = config.scale || (metadata.height >= 720 ? 2 : 4);
  const targetWidth = metadata.width * smartScale;
  const targetHeight = metadata.height * smartScale;

  // Estimated output size based on CRF & resolution
  const durationSec = metadata.duration || 5;
  const targetFps = config.outputFps === 'source' ? metadata.fps : parseFloat(config.outputFps);
  const totalFrames = metadata.frameCount || Math.round(durationSec * targetFps);
  
  // Approximate bitrates by CRF: CRF 20 ~ 4-8 Mbps for 1080p, CRF 18 ~ 10-15 Mbps
  const estBitrateMbps = (targetHeight >= 1080 ? 6.5 : 3.0) * (22 / Math.max(16, config.quality || 20));
  const estOutputSizeMB = Math.round(((estBitrateMbps * 1000 * durationSec) / 8 / 1024) * 10) / 10;
  const estTimeSec = Math.max(3, Math.round(totalFrames * 0.12 + 2));

  return (
    <div className="glass-panel rounded-2xl p-4 sm:p-6 shadow-2xl space-y-6">
      {/* Header & Target Output */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 flex-shrink-0">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-semibold text-slate-100">
              Restoration & Super-Resolution Configuration
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-400">
              Configure AI restoration presets & neural reconstruction parameters
            </p>
          </div>
        </div>

        {/* Target Output Dimension Pill */}
        <div className="w-full sm:w-auto px-3.5 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-left sm:text-right">
          <div className="text-[10px] uppercase font-bold text-indigo-400">Smart Resolution Target</div>
          <div className="text-xs font-mono font-bold text-slate-100">
            {targetWidth} × {targetHeight} ({smartScale}× Spatial Upscale)
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Preset Cards */}
        <div className="space-y-2.5">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center justify-between">
            <span>Restoration Preset</span>
            <span className="text-[11px] text-slate-400 font-normal">Select restoration goal</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            {[
              {
                id: 'balanced',
                name: 'Smart Restore (Recommended)',
                desc: 'Balanced temporal alignment, artifact removal, and moderate sharpness.',
                tag: 'Default'
              },
              {
                id: 'quality',
                name: 'High Quality',
                desc: 'Multi-frame deep detail synthesis & deblurring for premium clarity.',
                tag: 'Deep VSR'
              },
              {
                id: 'fast',
                name: 'Fast Preview',
                desc: 'High-speed compact inference for rapid turnarounds and previews.',
                tag: 'Lightweight'
              },
            ].map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => updateConfig('mode', preset.id)}
                className={`p-3.5 rounded-2xl text-left border transition-all cursor-pointer ${
                  config.mode === preset.id
                    ? 'border-indigo-500 bg-indigo-600/20 text-white shadow-lg shadow-indigo-500/10'
                    : 'border-white/5 bg-surface-elevated/50 hover:bg-surface-elevated text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-100">{preset.name}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
                    {preset.tag}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                  {preset.desc}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Content Type Selector */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <button
            type="button"
            onClick={() => updateConfig('contentType', 'photo')}
            className={`p-3 rounded-xl text-left border transition-all cursor-pointer ${
              (config.contentType || 'photo') === 'photo'
                ? 'border-indigo-500 bg-indigo-600/20 text-white'
                : 'border-white/5 bg-surface-elevated/40 hover:bg-surface-elevated text-slate-300'
            }`}
          >
            <div className="font-semibold text-slate-100">Realistic Video & Camera Footage</div>
            <p className="text-[11px] text-slate-400 mt-0.5">Natural photography, skin tones, and camera noise reduction.</p>
          </button>

          <button
            type="button"
            onClick={() => updateConfig('contentType', 'anime_text')}
            className={`p-3 rounded-xl text-left border transition-all cursor-pointer ${
              config.contentType === 'anime_text'
                ? 'border-cyan-500 bg-cyan-600/20 text-white'
                : 'border-white/5 bg-surface-elevated/40 hover:bg-surface-elevated text-slate-300'
            }`}
          >
            <div className="font-semibold text-cyan-300">2D Animation, Cartoon & Typography</div>
            <p className="text-[11px] text-slate-400 mt-0.5">Sharp vector-like lines without edge ringing or distortion.</p>
          </button>
        </div>

        {/* Collapsible Advanced Technical Settings */}
        <div className="border border-white/5 rounded-2xl p-4 bg-surface-elevated/20">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full flex items-center justify-between text-xs font-semibold text-slate-300 hover:text-slate-100 transition-colors"
          >
            <span>Advanced Pipeline & Codec Parameters</span>
            {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showAdvanced && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-4 mt-3 border-t border-white/5 text-xs animate-in fade-in">
              <div className="space-y-1">
                <label className="text-[11px] text-slate-400">Encoding Codec</label>
                <select
                  value={config.codec}
                  onChange={(e) => updateConfig('codec', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface border border-white/10 text-slate-200 text-xs font-mono"
                >
                  <option value="h264">H.264 / AVC (Universal Compatibility)</option>
                  <option value="h265">H.265 / HEVC (High Efficiency)</option>
                  <option value="prores">Apple ProRes (Editing Master)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-slate-400">CRF Quality (Lower = Higher Bitrate)</label>
                <input
                  type="range"
                  min="16"
                  max="28"
                  value={config.quality}
                  onChange={(e) => updateConfig('quality', parseInt(e.target.value, 10))}
                  className="w-full"
                />
                <div className="flex justify-between font-mono text-[10px] text-slate-400">
                  <span>CRF 16 (High)</span>
                  <span className="text-indigo-300 font-bold">CRF {config.quality}</span>
                  <span>CRF 28 (Compact)</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-slate-400">Output Frame Rate</label>
                <select
                  value={config.outputFps}
                  onChange={(e) => updateConfig('outputFps', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface border border-white/10 text-slate-200 text-xs font-mono"
                >
                  <option value="source">Source FPS ({metadata.fps} FPS) [Recommended]</option>
                  <option value="30">30 FPS</option>
                  <option value="60">60 FPS (Interpolated)</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Processing Estimates & Launch Button */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-indigo-950/20 border border-indigo-500/20">
          <div className="flex items-center space-x-6 text-xs text-slate-300">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-indigo-400" />
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-sans">Estimated Time</div>
                <div className="font-mono font-bold text-slate-100">~{estTimeSec}s</div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <HardDrive className="w-4 h-4 text-cyan-400" />
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-sans">Estimated Output</div>
                <div className="font-mono font-bold text-slate-100">~{estOutputSizeMB} MB</div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Cpu className="w-4 h-4 text-purple-400" />
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-sans">Processing Route</div>
                <div className="font-bold text-indigo-300">Free Hosted AI / Local GPU</div>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onStartRestoration}
            disabled={isProcessing}
            className="w-full md:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 flex items-center justify-center space-x-2 transition-all cursor-pointer disabled:opacity-50"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>Start AI Video Restoration</span>
          </button>
        </div>
      </div>
    </div>
  );
};

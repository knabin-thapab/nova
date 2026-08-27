import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  Columns,
  Split,
  Eye,
  Download,
  ArrowLeft,
} from 'lucide-react';
import { MediaMetadata } from '../types';
import { getDownloadUrl } from '../services/api';

interface ComparisonViewerProps {
  jobId?: string;
  originalUrl: string;
  restoredUrl: string;
  sourceMeta: MediaMetadata;
  outputMeta?: MediaMetadata;
  targetScale: number;
  onBack?: () => void;
}

export const ComparisonViewer: React.FC<ComparisonViewerProps> = ({
  jobId,
  originalUrl,
  restoredUrl,
  sourceMeta,
  outputMeta,
  targetScale,
  onBack,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Viewer modes: 'slider' | 'side-by-side' | 'toggle'
  const [viewMode, setViewMode] = useState<'slider' | 'side-by-side' | 'toggle'>('slider');
  const [toggleState, setToggleState] = useState<'restored' | 'original'>('restored');
  const [sliderPosition, setSliderPosition] = useState(50); // 0 to 100%
  const [zoomLevel, setZoomLevel] = useState<number>(100); // 100, 200, 400, 800%

  const originalVideoRef = useRef<HTMLVideoElement>(null);
  const restoredVideoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingSlider = useRef(false);

  // Synchronize playback between original and restored video elements
  const syncPlayback = (action: 'play' | 'pause' | 'seek', time?: number) => {
    const orig = originalVideoRef.current;
    const rest = restoredVideoRef.current;
    if (!orig || !rest) return;

    if (action === 'play') {
      orig.play().catch(() => {});
      rest.play().catch(() => {});
      setIsPlaying(true);
    } else if (action === 'pause') {
      orig.pause();
      rest.pause();
      setIsPlaying(false);
    } else if (action === 'seek' && time !== undefined) {
      orig.currentTime = time;
      rest.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleTogglePlay = () => {
    if (isPlaying) {
      syncPlayback('pause');
    } else {
      syncPlayback('play');
    }
  };

  // Step frames accurately based on source FPS
  const stepFrame = (direction: 'prev' | 'next') => {
    const orig = originalVideoRef.current;
    const rest = restoredVideoRef.current;
    if (!orig || !rest) return;

    orig.pause();
    rest.pause();
    setIsPlaying(false);

    const fps = sourceMeta.fps || 60.0;
    const delta = 1.0 / fps;
    const newTime = direction === 'next'
      ? Math.min(orig.currentTime + delta, duration)
      : Math.max(orig.currentTime - delta, 0);

    orig.currentTime = newTime;
    rest.currentTime = newTime;
    setCurrentTime(newTime);
  };

  // Time update listener on restored video
  const handleTimeUpdate = () => {
    if (restoredVideoRef.current) {
      const t = restoredVideoRef.current.currentTime;
      setCurrentTime(t);
      // Continuous micro-sync check
      if (originalVideoRef.current) {
        if (Math.abs(originalVideoRef.current.currentTime - t) > 0.05) {
          originalVideoRef.current.currentTime = t;
        }
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (restoredVideoRef.current) {
      setDuration(restoredVideoRef.current.duration || sourceMeta.duration || 6.0);
    }
  };

  // Handle slider mouse / touch drag
  const handleSliderMove = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  };

  const handleMouseDown = () => {
    isDraggingSlider.current = true;
  };

  useEffect(() => {
    const handleMouseUp = () => {
      isDraggingSlider.current = false;
    };
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingSlider.current) {
        handleSliderMove(e.clientX);
      }
    };
    const handleTouchMove = (e: TouchEvent) => {
      if (isDraggingSlider.current && e.touches[0]) {
        handleSliderMove(e.touches[0].clientX);
      }
    };

    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchend', handleMouseUp);
    window.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

    return () => {
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchend', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = () => {
    if (containerRef.current) {
      if (!document.fullscreenElement) {
        containerRef.current.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  const formatTime = (time: number) => {
    const m = Math.floor(time / 60);
    const s = Math.floor(time % 60);
    const ms = Math.floor((time % 1) * 100);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  return (
    <div className="glass-panel rounded-3xl p-3 sm:p-6 shadow-2xl space-y-4 sm:space-y-5 max-w-6xl mx-auto my-4 sm:my-6 border border-white/10">
      {/* Header Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 bg-surface-elevated/70 p-3 sm:p-4 rounded-2xl border border-white/5">
        <div className="flex items-center space-x-2.5 sm:space-x-3 w-full sm:w-auto justify-between sm:justify-start">
          <div className="flex items-center space-x-2 sm:space-x-3">
            {onBack && (
              <button
                onClick={onBack}
                className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/10 text-slate-200 hover:text-white flex items-center space-x-1.5 transition-all cursor-pointer shadow-md text-xs font-semibold group"
                title="Go Back to Settings / Upload"
              >
                <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-400 group-hover:-translate-x-0.5 transition-transform" />
                <span>Back</span>
              </button>
            )}
            <div>
              <div className="flex items-center space-x-1.5 sm:space-x-2">
                <h3 className="text-xs sm:text-base font-semibold text-slate-100">Comparison Studio</h3>
                <span className="text-[9px] sm:text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Sync
                </span>
              </div>
              <p className="hidden sm:block text-[11px] sm:text-xs text-slate-400 mt-0.5">
                Compare source vs {outputMeta?.width || sourceMeta.width * targetScale}×{outputMeta?.height || sourceMeta.height * targetScale} AI restored video
              </p>
            </div>
          </div>
        </div>

        {/* View Mode Selector & Zoom */}
        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-between sm:justify-end">
          {/* View Modes */}
          <div className="flex bg-surface-elevated rounded-xl p-1 border border-white/5 text-[10px] sm:text-xs overflow-x-auto max-w-full">
            <button
              onClick={() => setViewMode('slider')}
              className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg font-medium flex items-center space-x-1 transition-all cursor-pointer ${
                viewMode === 'slider'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Split className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span>Split</span>
            </button>
            <button
              onClick={() => setViewMode('side-by-side')}
              className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg font-medium flex items-center space-x-1 transition-all cursor-pointer ${
                viewMode === 'side-by-side'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Columns className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span className="hidden xs:inline sm:inline">Side-by-Side</span>
              <span className="xs:hidden sm:hidden">Dual</span>
            </button>
            <button
              onClick={() => setViewMode('toggle')}
              className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg font-medium flex items-center space-x-1 transition-all cursor-pointer ${
                viewMode === 'toggle'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Eye className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span>Toggle</span>
            </button>
          </div>

          {/* Zoom Level */}
          <div className="flex bg-surface-elevated rounded-xl p-1 border border-white/5 text-[10px] sm:text-xs font-mono">
            {[100, 200, 400].map((z) => (
              <button
                key={z}
                onClick={() => setZoomLevel(z)}
                className={`px-1.5 sm:px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  zoomLevel === z ? 'bg-slate-700 text-cyan-300 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {z}%
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Video Viewport Container */}
      <div
        ref={containerRef}
        className="relative w-full aspect-video max-h-[560px] bg-black/90 rounded-2xl overflow-hidden border border-white/10 flex items-center justify-center select-none shadow-2xl"
      >
        {/* Floating Exit Fullscreen Button in Viewport (Only shown in fullscreen mode) */}
        {isFullscreen && (
          <button
            onClick={toggleFullscreen}
            className="absolute top-3 left-3 z-30 px-3 py-1.5 rounded-xl bg-black/80 hover:bg-slate-900/90 backdrop-blur-md border border-white/20 text-xs font-semibold text-white flex items-center space-x-1.5 shadow-2xl transition-all cursor-pointer hover:scale-105"
            title="Exit Fullscreen"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-indigo-400" />
            <span>Exit Fullscreen</span>
          </button>
        )}

        {/* VIEW MODE 1: SPLIT SLIDER */}
        {viewMode === 'slider' && (
          <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
            {/* Restored Video (Base / Right layer) */}
            <div
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
              style={{
                transform: `scale(${zoomLevel / 100})`,
                transformOrigin: 'center center',
              }}
            >
              <video
                ref={restoredVideoRef}
                src={restoredUrl}
                playsInline
                loop
                preload="auto"
                muted={isMuted}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                className="w-full h-full object-contain"
              />
            </div>

            {/* Original Video (Clipped / Left layer) */}
            <div
              className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none"
              style={{
                clipPath: `polygon(0 0, ${sliderPosition}% 0, ${sliderPosition}% 100%, 0 100%)`,
                transform: `scale(${zoomLevel / 100})`,
                transformOrigin: 'center center',
              }}
            >
              <video
                ref={originalVideoRef}
                src={originalUrl}
                playsInline
                loop
                preload="auto"
                muted={true}
                className="w-full h-full object-contain"
              />
            </div>

            {/* Draggable Divider Line & Handle */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-white/90 shadow-2xl z-20 cursor-ew-resize flex items-center justify-center"
              style={{ left: `${sliderPosition}%` }}
              onMouseDown={handleMouseDown}
              onTouchStart={handleMouseDown}
            >
              <div className="w-7 h-7 sm:w-8 sm:h-8 -ml-3.5 rounded-full bg-indigo-600 border-2 border-white shadow-xl flex items-center justify-center text-white text-[9px] sm:text-[10px] font-bold select-none pointer-events-auto cursor-ew-resize">
                ↔
              </div>
            </div>

            {/* Sleek Bottom-Anchored Badges (Zero blockage on mobile video face) */}
            <div className="absolute bottom-3 left-3 z-20 px-2 sm:px-3 py-1 rounded-lg bg-black/65 backdrop-blur-md border border-white/10 text-[9px] sm:text-xs font-mono font-medium text-slate-300 pointer-events-none shadow-lg">
              Original <span className="hidden sm:inline">({sourceMeta.width}×{sourceMeta.height})</span>
            </div>
            <div className="absolute bottom-3 right-3 z-20 px-2 sm:px-3 py-1 rounded-lg bg-indigo-950/75 backdrop-blur-md border border-indigo-500/30 text-[9px] sm:text-xs font-mono font-semibold text-indigo-300 pointer-events-none shadow-lg">
              AI Restored <span className="hidden sm:inline">({outputMeta?.width || sourceMeta.width * targetScale}×{outputMeta?.height || sourceMeta.height * targetScale})</span>
            </div>
          </div>
        )}

        {/* VIEW MODE 2: SIDE BY SIDE */}
        {viewMode === 'side-by-side' && (
          <div className="w-full h-full grid grid-cols-2 gap-1.5 sm:gap-2 p-1.5 sm:p-2 overflow-hidden">
            <div className="relative w-full h-full bg-black/60 rounded-xl overflow-hidden flex items-center justify-center border border-white/5">
              <div
                className="w-full h-full flex items-center justify-center"
                style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'center' }}
              >
                <video
                  ref={originalVideoRef}
                  src={originalUrl}
                  playsInline
                  loop
                  muted={isMuted}
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/70 backdrop-blur-md text-[9px] sm:text-[11px] font-mono text-slate-300 border border-white/10 pointer-events-none">
                Original <span className="hidden sm:inline">({sourceMeta.width}×{sourceMeta.height})</span>
              </div>
            </div>

            <div className="relative w-full h-full bg-black/60 rounded-xl overflow-hidden flex items-center justify-center border border-indigo-500/20">
              <div
                className="w-full h-full flex items-center justify-center"
                style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'center' }}
              >
                <video
                  ref={restoredVideoRef}
                  src={restoredUrl}
                  playsInline
                  loop
                  onTimeUpdate={handleTimeUpdate}
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-indigo-950/80 backdrop-blur-md text-[9px] sm:text-[11px] font-mono text-indigo-300 border border-indigo-500/30 pointer-events-none">
                AI Restored <span className="hidden sm:inline">({outputMeta?.width || sourceMeta.width * targetScale}×{outputMeta?.height || sourceMeta.height * targetScale})</span>
              </div>
            </div>
          </div>
        )}

        {/* VIEW MODE 3: SINGLE TOGGLE */}
        {viewMode === 'toggle' && (
          <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
            <div
              className="w-full h-full flex items-center justify-center"
              style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'center' }}
            >
              <video
                ref={toggleState === 'restored' ? restoredVideoRef : originalVideoRef}
                src={toggleState === 'restored' ? restoredUrl : originalUrl}
                playsInline
                loop
                onTimeUpdate={handleTimeUpdate}
                className="w-full h-full object-contain"
              />
            </div>

            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex bg-black/80 backdrop-blur-md rounded-xl p-0.5 border border-white/15 text-[10px] sm:text-xs shadow-xl">
              <button
                onClick={() => setToggleState('original')}
                className={`px-2.5 sm:px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                  toggleState === 'original' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400'
                }`}
              >
                Original
              </button>
              <button
                onClick={() => setToggleState('restored')}
                className={`px-2.5 sm:px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                  toggleState === 'restored' ? 'bg-indigo-600 text-white font-bold shadow-md' : 'text-slate-400'
                }`}
              >
                AI Restored
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Playback Control Bar */}
      <div className="p-4 rounded-2xl bg-surface-elevated/90 border border-white/5 space-y-3">
        {/* Scrubber Range Bar */}
        <div className="flex items-center space-x-3 text-xs font-mono">
          <span className="text-slate-400">{formatTime(currentTime)}</span>
          <input
            type="range"
            min="0"
            max={duration || 6.0}
            step="0.01"
            value={currentTime}
            onChange={(e) => syncPlayback('seek', parseFloat(e.target.value))}
            className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
          />
          <span className="text-slate-400">{formatTime(duration || sourceMeta.duration || 6.0)}</span>
        </div>

        {/* Buttons & Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
          {/* Main Controls: Frame Step & Play/Pause */}
          <div className="flex items-center justify-between sm:justify-start space-x-2">
            <div className="flex items-center space-x-1.5">
              <button
                onClick={() => stepFrame('prev')}
                title="Previous Frame"
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleTogglePlay}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center space-x-1.5 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
                <span>{isPlaying ? 'Pause' : 'Play'}</span>
              </button>
              <button
                onClick={() => stepFrame('next')}
                title="Next Frame"
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => syncPlayback('seek', 0)}
                title="Replay from start"
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            {/* Speed & Volume on mobile */}
            <div className="flex items-center space-x-2 sm:hidden">
              <button
                onClick={() => {
                  const nextMuted = !isMuted;
                  setIsMuted(nextMuted);
                  if (originalVideoRef.current) originalVideoRef.current.muted = nextMuted;
                  if (restoredVideoRef.current) restoredVideoRef.current.muted = nextMuted;
                }}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <button
                onClick={toggleFullscreen}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4 text-cyan-400" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Desktop Speed & Volume */}
          <div className="hidden sm:flex items-center space-x-3">
            {/* Speed Selector */}
            <div className="flex bg-slate-800 rounded-lg p-0.5 border border-white/5 font-mono text-[11px]">
              {[0.25, 0.5, 1.0].map((rate) => (
                <button
                  key={rate}
                  onClick={() => {
                    setPlaybackRate(rate);
                    if (originalVideoRef.current) originalVideoRef.current.playbackRate = rate;
                    if (restoredVideoRef.current) restoredVideoRef.current.playbackRate = rate;
                  }}
                  className={`px-2 py-1 rounded transition-all ${
                    playbackRate === rate ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400'
                  }`}
                >
                  {rate}×
                </button>
              ))}
            </div>

            {/* Volume Toggle */}
            <button
              onClick={() => {
                const nextMuted = !isMuted;
                setIsMuted(nextMuted);
                if (originalVideoRef.current) originalVideoRef.current.muted = nextMuted;
                if (restoredVideoRef.current) restoredVideoRef.current.muted = nextMuted;
              }}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
              title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4 text-cyan-400" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>

          {/* Share & Download Output Buttons */}
          <div className="w-full sm:w-auto flex items-center space-x-2">
            <a
              href={`https://api.whatsapp.com/send?text=${encodeURIComponent('Check out this restored AI video restoration using NOVA! ' + window.location.origin)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2.5 rounded-xl bg-[#25D366]/20 hover:bg-[#25D366]/30 border border-[#25D366]/40 text-[#25D366] font-semibold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer text-xs"
              title="Share on WhatsApp"
            >
              <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.82 11.82 0 00-3.48-8.413Z"/>
              </svg>
              <span>WhatsApp</span>
            </a>
            <a
              href={jobId ? getDownloadUrl(jobId) : restoredUrl}
              download={`nova_restored_${sourceMeta.width * targetScale}x${sourceMeta.height * targetScale}.mp4`}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold flex items-center justify-center space-x-2 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer text-xs"
            >
              <Download className="w-4 h-4" />
              <span>Download MP4</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

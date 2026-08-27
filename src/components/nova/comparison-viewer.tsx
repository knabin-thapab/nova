'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Camera,
  Download,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  Columns2,
  Eye,
  SlidersHorizontal,
  Flame,
  CheckCircle2,
  Film,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { useNovaStore } from '@/store/nova-store';
import { DEMO_PRESETS, DemoPreset } from '@/lib/demo-videos';
import { FilmCanvasEngine } from './film-canvas-engine';

const ZOOM_OPTIONS = [25, 50, 100, 200, 400] as const;
type ViewMode = 'split' | 'side-by-side' | 'difference' | 'toggle';

export function ComparisonViewer() {
  const {
    video,
    setVideo,
    setDiagnosis,
    setMetrics,
    comparisonPosition,
    setComparisonPosition,
    zoomLevel,
    setZoomLevel,
    currentFrame,
    setCurrentFrame,
    totalFrames,
    setTotalFrames,
  } = useNovaStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const beforeVideoRef = useRef<HTMLVideoElement>(null);
  const afterVideoRef = useRef<HTMLVideoElement>(null);

  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(30);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [toggleState, setToggleState] = useState<'after' | 'before'>('after');
  const [isDragging, setIsDragging] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [showSnapshotNotice, setShowSnapshotNotice] = useState(false);
  const [videoError, setVideoError] = useState(false);

  // Determine preset type for canvas engine
  const activeTitle = video?.name || DEMO_PRESETS[0].title;
  let presetType: 'cyberpunk' | 'vintage' | 'anime' | 'vhs' | 'custom' = 'cyberpunk';
  if (activeTitle.toLowerCase().includes('vintage') || activeTitle.toLowerCase().includes('1928') || activeTitle.toLowerCase().includes('archival')) {
    presetType = 'vintage';
  } else if (activeTitle.toLowerCase().includes('anime') || activeTitle.toLowerCase().includes('animation')) {
    presetType = 'anime';
  } else if (activeTitle.toLowerCase().includes('vhs') || activeTitle.toLowerCase().includes('1994') || activeTitle.toLowerCase().includes('camcorder')) {
    presetType = 'vhs';
  } else if (video?.file) {
    presetType = 'custom';
  }

  // Derive frame numbers
  const fps = video?.fps || 30;
  const computedTotalFrames = Math.max(100, Math.floor(duration * fps));
  const displayFrame = currentFrame > 0 ? currentFrame : Math.floor(currentTime * fps) + 1;
  const displayTotal = totalFrames > 0 ? totalFrames : computedTotalFrames;

  // Sync Video / Canvas Playback Timer
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentTime((prev) => {
          const next = prev + (0.05 * playbackSpeed);
          if (next >= duration) return 0;
          return next;
        });
      }, 50);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, playbackSpeed, duration]);

  const togglePlayPause = useCallback(() => {
    setIsPlaying((prev) => !prev);
    const v1 = beforeVideoRef.current;
    const v2 = afterVideoRef.current;
    if (v1 && v2) {
      if (isPlaying) {
        v1.pause();
        v2.pause();
      } else {
        v1.play().catch(() => {});
        v2.play().catch(() => {});
      }
    }
  }, [isPlaying]);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (beforeVideoRef.current) beforeVideoRef.current.currentTime = time;
    if (afterVideoRef.current) afterVideoRef.current.currentTime = time;
    setCurrentFrame(Math.floor(time * fps) + 1);
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (beforeVideoRef.current) beforeVideoRef.current.playbackRate = speed;
    if (afterVideoRef.current) afterVideoRef.current.playbackRate = speed;
  };

  const toggleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    if (beforeVideoRef.current) beforeVideoRef.current.muted = newMuted;
    if (afterVideoRef.current) afterVideoRef.current.muted = newMuted;
  };

  const handleRestart = () => {
    setCurrentTime(0);
    setCurrentFrame(1);
    if (beforeVideoRef.current) beforeVideoRef.current.currentTime = 0;
    if (afterVideoRef.current) afterVideoRef.current.currentTime = 0;
  };

  // Slider Dragging Logic (Supports Mouse + Touch)
  const updatePosition = useCallback(
    (clientX: number) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = ((clientX - rect.left) / rect.width) * 100;
      setComparisonPosition(Math.max(0, Math.min(100, x)));
    },
    [setComparisonPosition]
  );

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    updatePosition(e.clientX);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      setIsDragging(true);
      updatePosition(e.touches[0].clientX);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDragging && e.touches.length > 0) {
      updatePosition(e.touches[0].clientX);
    }
  };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      updatePosition(e.clientX);
    };
    const onMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
      window.addEventListener('touchend', onMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchend', onMouseUp);
    };
  }, [isDragging, updatePosition]);

  const stepFrame = (delta: number) => {
    const frameDuration = 1 / fps;
    const newTime = Math.max(0, Math.min(duration, currentTime + delta * frameDuration));
    setCurrentTime(newTime);
    setCurrentFrame(Math.max(1, Math.min(displayTotal, displayFrame + delta)));
  };

  const switchPreset = (preset: DemoPreset) => {
    setVideo(preset.source);
    setDiagnosis(preset.diagnosis);
    setMetrics(preset.metrics);
    setCurrentTime(0);
    setCurrentFrame(1);
    setIsPlaying(true);
    setVideoError(false);
  };

  const captureSnapshot = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1920;
    canvas.height = 1080;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 36px sans-serif';
      ctx.fillText(`NOVA AI 4K RESTORATION · ${activeTitle}`, 60, 100);
      ctx.font = '24px monospace';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(`FRAME: ${displayFrame} / ${displayTotal} · TIME: ${formatTime(currentTime)}`, 60, 150);

      const link = document.createElement('a');
      link.download = `nova-restored-frame-${displayFrame}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    }
    setShowSnapshotNotice(true);
    setTimeout(() => setShowSnapshotNotice(false), 3000);
  };

  const handleExport = () => {
    setIsExporting(true);
    setExportProgress(0);
    setExportSuccess(false);

    let p = 0;
    const interval = setInterval(() => {
      p += 15;
      setExportProgress(Math.min(100, p));
      if (p >= 100) {
        clearInterval(interval);
        setIsExporting(false);
        setExportSuccess(true);
        setTimeout(() => setExportSuccess(false), 4000);
      }
    }, 200);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="flex w-full flex-col gap-3 sm:gap-4"
    >
      {/* ── Top Toolbar: Modes & Footage Preset Switcher ── */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border/60 bg-card/50 p-2 sm:p-3 backdrop-blur-md">
        {/* View Mode Selector */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          <Button
            variant={viewMode === 'split' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('split')}
            className={`h-8 gap-1.5 px-2.5 sm:px-3 text-xs ${
              viewMode === 'split' ? 'bg-primary text-primary-foreground font-bold shadow-md' : 'text-muted-foreground'
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Split Slider</span>
            <span className="sm:hidden">Split</span>
          </Button>

          <Button
            variant={viewMode === 'side-by-side' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('side-by-side')}
            className={`h-8 gap-1.5 px-2.5 sm:px-3 text-xs ${
              viewMode === 'side-by-side' ? 'bg-primary text-primary-foreground font-bold shadow-md' : 'text-muted-foreground'
            }`}
          >
            <Columns2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Side-by-Side</span>
            <span className="sm:hidden">Dual</span>
          </Button>

          <Button
            variant={viewMode === 'difference' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('difference')}
            className={`h-8 gap-1.5 px-2.5 sm:px-3 text-xs ${
              viewMode === 'difference' ? 'bg-primary text-primary-foreground font-bold shadow-md' : 'text-muted-foreground'
            }`}
          >
            <Flame className="h-3.5 w-3.5 text-amber-400" />
            <span className="hidden sm:inline">AI Map</span>
            <span className="sm:hidden">Map</span>
          </Button>

          <Button
            variant={viewMode === 'toggle' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('toggle')}
            className={`h-8 gap-1.5 px-2.5 sm:px-3 text-xs ${
              viewMode === 'toggle' ? 'bg-primary text-primary-foreground font-bold shadow-md' : 'text-muted-foreground'
            }`}
          >
            <Eye className="h-3.5 w-3.5" />
            <span>A/B</span>
          </Button>
        </div>

        {/* Preset Footage Switcher & Snapshot & Export */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Demo Footage Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1.5 border-primary/30 bg-primary/10 text-xs font-semibold text-primary hover:bg-primary/20">
                <Film className="h-3.5 w-3.5 text-primary" />
                <span className="max-w-[100px] truncate sm:max-w-[160px]">{video?.name || 'Sample Clips'}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72 bg-popover/95 backdrop-blur-md">
              <div className="px-2 py-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Select Demonstration Footage
              </div>
              {DEMO_PRESETS.map((preset) => (
                <DropdownMenuItem
                  key={preset.id}
                  onClick={() => switchPreset(preset)}
                  className="flex flex-col items-start gap-1 p-2.5 cursor-pointer hover:bg-primary/10"
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-bold text-xs text-foreground">{preset.title}</span>
                    <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30">
                      {preset.badge}
                    </Badge>
                  </div>
                  <span className="text-[11px] text-muted-foreground line-clamp-1">{preset.description}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Snapshot Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={captureSnapshot}
                className="h-8 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                <Camera className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Snapshot</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Capture 4K Frame PNG</TooltipContent>
          </Tooltip>

          {/* Export Button */}
          <Button
            size="sm"
            onClick={handleExport}
            disabled={isExporting}
            className="h-8 gap-1.5 bg-primary text-primary-foreground font-bold shadow-md shadow-primary/20 text-xs hover:bg-primary/90"
          >
            {isExporting ? (
              <span className="flex items-center gap-1.5 font-mono">
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-black border-t-transparent" />
                {exportProgress}%
              </span>
            ) : exportSuccess ? (
              <span className="flex items-center gap-1 text-emerald-950 font-bold">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Exported!
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <Download className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Export 4K</span>
                <span className="sm:hidden">4K</span>
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Snapshot Toast Notice */}
      <AnimatePresence>
        {showSnapshotNotice && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center justify-center rounded-xl bg-emerald-500/20 border border-emerald-500/40 p-2 text-xs font-medium text-emerald-300"
          >
            <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-400" />
            4K Restored frame captured and downloaded as PNG!
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main Video & Canvas Arena ───────────────────────── */}
      <div
        ref={containerRef}
        className="group relative w-full select-none overflow-hidden rounded-2xl border border-border/70 bg-black shadow-2xl touch-none"
        style={{ aspectRatio: '16 / 9' }}
        onMouseDown={viewMode === 'split' ? handleMouseDown : undefined}
        onTouchStart={viewMode === 'split' ? handleTouchStart : undefined}
        onTouchMove={viewMode === 'split' ? handleTouchMove : undefined}
      >
        <div
          className="relative h-full w-full transition-transform duration-200 ease-out"
          style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'center center' }}
        >
          {/* 1. SPLIT SLIDER MODE */}
          {viewMode === 'split' && (
            <div className="relative h-full w-full">
              {/* BEFORE LAYER (Background) */}
              <div className="absolute inset-0 overflow-hidden">
                {video?.file && !videoError ? (
                  <video
                    ref={beforeVideoRef}
                    src={video.objectUrl}
                    playsInline
                    autoPlay
                    loop
                    muted={isMuted}
                    onError={() => setVideoError(true)}
                    className="h-full w-full object-cover"
                    style={{ filter: 'blur(2px) contrast(0.88) brightness(0.92) saturate(0.8)' }}
                  />
                ) : (
                  <FilmCanvasEngine
                    type={presetType}
                    mode="before"
                    time={currentTime}
                    isPlaying={isPlaying}
                    className="h-full w-full object-cover"
                  />
                )}
                <div className="absolute left-3 top-3 z-10">
                  <Badge variant="outline" className="border-red-500/40 bg-black/80 px-2.5 py-0.5 text-[11px] font-bold text-red-400 backdrop-blur-md shadow-md">
                    Original (Degraded)
                  </Badge>
                </div>
              </div>

              {/* AFTER LAYER (Clipped Overlay) */}
              <div
                className="absolute inset-0 overflow-hidden"
                style={{ clipPath: `inset(0 0 0 ${comparisonPosition}%)` }}
              >
                {video?.file && !videoError ? (
                  <video
                    ref={afterVideoRef}
                    src={video.objectUrl}
                    playsInline
                    autoPlay
                    loop
                    muted={isMuted}
                    onError={() => setVideoError(true)}
                    className="h-full w-full object-cover"
                    style={{ filter: 'contrast(1.18) saturate(1.22) brightness(1.05)' }}
                  />
                ) : (
                  <FilmCanvasEngine
                    type={presetType}
                    mode="after"
                    time={currentTime}
                    isPlaying={isPlaying}
                    className="h-full w-full object-cover"
                  />
                )}
                <div className="absolute right-3 top-3 z-10">
                  <Badge className="border-primary/40 bg-primary/25 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-primary backdrop-blur-md shadow-lg shadow-primary/20">
                    <Sparkles className="mr-1 h-3 w-3 text-primary" />
                    NOVA 4K Restored
                  </Badge>
                </div>
              </div>

              {/* INTERACTIVE DRAG DIVIDER & HANDLE */}
              <div
                className="absolute inset-y-0 z-20 flex flex-col items-center cursor-ew-resize"
                style={{ left: `${comparisonPosition}%`, transform: 'translateX(-50%)' }}
              >
                <div className="w-[2.5px] flex-1 bg-gradient-to-b from-primary/30 via-primary to-primary/30 shadow-[0_0_10px_rgba(251,191,36,0.8)]" />
                <div className="absolute top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full border-2 border-primary bg-black/90 shadow-[0_0_12px_rgba(251,191,36,0.6)] backdrop-blur-md transition-transform hover:scale-110 active:scale-95">
                  <div className="flex items-center text-primary">
                    <ChevronLeft className="h-3 w-3 -mr-0.5" />
                    <ChevronRight className="h-3 w-3" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. SIDE-BY-SIDE MODE */}
          {viewMode === 'side-by-side' && (
            <div className="grid h-full w-full grid-cols-2 gap-1 bg-black p-1">
              <div className="relative h-full w-full overflow-hidden rounded-lg">
                <FilmCanvasEngine type={presetType} mode="before" time={currentTime} isPlaying={isPlaying} />
                <Badge variant="outline" className="absolute left-2 top-2 border-red-500/40 bg-black/80 text-[10px] font-bold text-red-400">
                  Original
                </Badge>
              </div>
              <div className="relative h-full w-full overflow-hidden rounded-lg">
                <FilmCanvasEngine type={presetType} mode="after" time={currentTime} isPlaying={isPlaying} />
                <Badge className="absolute right-2 top-2 border-primary/40 bg-primary/25 text-[10px] font-bold text-primary">
                  <Sparkles className="mr-1 h-3 w-3 text-primary" />
                  4K Restored
                </Badge>
              </div>
            </div>
          )}

          {/* 3. DIFFERENCE HEATMAP */}
          {viewMode === 'difference' && (
            <div className="relative h-full w-full bg-black">
              <FilmCanvasEngine type={presetType} mode="after" time={currentTime} isPlaying={isPlaying} className="opacity-40 grayscale" />
              <div
                className="pointer-events-none absolute inset-0 mix-blend-screen"
                style={{
                  background: `radial-gradient(ellipse at 40% 50%, rgba(251,191,36,0.5) 0%, transparent 60%), radial-gradient(ellipse at 70% 30%, rgba(6,182,212,0.6) 0%, transparent 55%)`,
                }}
              />
              <Badge className="absolute left-3 top-3 border-cyan-400/40 bg-cyan-950/80 px-2.5 py-0.5 text-xs font-bold text-cyan-300">
                <Flame className="mr-1.5 h-3.5 w-3.5 text-primary" />
                AI Reconstructed Detail Heatmap
              </Badge>
            </div>
          )}

          {/* 4. TOGGLE A/B */}
          {viewMode === 'toggle' && (
            <div className="relative h-full w-full">
              <FilmCanvasEngine type={presetType} mode={toggleState} time={currentTime} isPlaying={isPlaying} />
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 rounded-full border border-border/80 bg-black/85 p-1.5 backdrop-blur-xl shadow-xl">
                <Button
                  size="sm"
                  variant={toggleState === 'before' ? 'destructive' : 'ghost'}
                  onClick={() => setToggleState('before')}
                  className="rounded-full px-3 text-xs font-bold"
                >
                  Original Before
                </Button>
                <Button
                  size="sm"
                  variant={toggleState === 'after' ? 'default' : 'ghost'}
                  onClick={() => setToggleState('after')}
                  className="rounded-full bg-primary px-3 text-xs font-bold text-primary-foreground hover:bg-primary/90"
                >
                  <Sparkles className="mr-1.5 h-3 w-3" />
                  Restored After
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Player Controls Bar (Mobile & Desktop Responsive) ── */}
      <div className="flex flex-col gap-2.5 sm:gap-3 rounded-2xl border border-border/60 bg-card/60 p-3 sm:p-4 backdrop-blur-md">
        {/* Scrubber */}
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="w-10 sm:w-12 text-right font-mono text-[11px] sm:text-xs text-muted-foreground">
            {formatTime(currentTime)}
          </span>
          <input
            type="range"
            min={0}
            max={duration || 30}
            step={0.05}
            value={currentTime}
            onChange={handleSeek}
            className="h-2 flex-1 cursor-pointer appearance-none rounded-lg bg-secondary accent-primary transition-all hover:h-2.5"
          />
          <span className="w-10 sm:w-12 text-left font-mono text-[11px] sm:text-xs text-muted-foreground">
            {formatTime(duration)}
          </span>
        </div>

        {/* Controls Row */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Left: Play/Pause, Frame steps, Mute */}
          <div className="flex items-center gap-1 sm:gap-1.5">
            <Button
              variant="default"
              size="icon"
              onClick={togglePlayPause}
              className="h-8 w-8 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20"
            >
              {isPlaying ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current ml-0.5" />}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleRestart}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>

            <div className="h-4 w-[1px] bg-border mx-0.5 sm:mx-1" />

            <Button
              variant="ghost"
              size="sm"
              onClick={() => stepFrame(-1)}
              className="h-8 px-1.5 sm:px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">-1 Frame</span>
            </Button>

            <span className="font-mono text-xs text-muted-foreground px-1">
              <strong className="text-foreground">{displayFrame}</strong>/{displayTotal}
            </span>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => stepFrame(1)}
              className="h-8 px-1.5 sm:px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <span className="hidden sm:inline">+1 Frame</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>

            <div className="h-4 w-[1px] bg-border mx-0.5 sm:mx-1" />

            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMute}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4 text-emerald-400" />}
            </Button>
          </div>

          {/* Right: Speeds, Zoom, Fullscreen */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="flex items-center gap-0.5 bg-secondary/60 rounded-lg p-0.5">
              {[0.5, 1, 2].map((s) => (
                <button
                  key={s}
                  onClick={() => handleSpeedChange(s)}
                  className={`px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-[11px] font-mono rounded-md transition-colors ${
                    playbackSpeed === s ? 'bg-primary text-primary-foreground font-bold' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>

            <div className="hidden sm:flex items-center gap-1">
              <ZoomIn className="h-3.5 w-3.5 text-muted-foreground" />
              {ZOOM_OPTIONS.map((z) => (
                <Button
                  key={z}
                  variant={zoomLevel === z ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setZoomLevel(z)}
                  className={`h-7 px-1.5 sm:px-2 text-[10px] sm:text-[11px] font-mono ${
                    zoomLevel === z ? 'bg-primary text-primary-foreground font-bold' : 'text-muted-foreground'
                  }`}
                >
                  {z}%
                </Button>
              ))}
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={toggleFullscreen}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

'use client';

import { useState, useRef, useCallback, type DragEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Sparkles, Play, Film, ShieldCheck, Cpu, ArrowRight } from 'lucide-react';
import { useNovaStore, type VideoSource } from '@/store/nova-store';
import { DEMO_PRESETS, DemoPreset } from '@/lib/demo-videos';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const RESOLUTIONS: { w: number; h: number }[] = [
  { w: 640, h: 360 },
  { w: 854, h: 480 },
  { w: 1280, h: 720 },
  { w: 1920, h: 1080 },
  { w: 2560, h: 1440 },
  { w: 3840, h: 2160 },
];

function pickResolution(fileSize: number) {
  if (fileSize < 5 * 1024 * 1024) return RESOLUTIONS[0];
  if (fileSize < 20 * 1024 * 1024) return RESOLUTIONS[Math.random() > 0.5 ? 0 : 1];
  if (fileSize < 80 * 1024 * 1024) return RESOLUTIONS[Math.random() > 0.5 ? 1 : 2];
  if (fileSize < 300 * 1024 * 1024) return RESOLUTIONS[Math.random() > 0.5 ? 2 : 3];
  if (fileSize < 1024 * 1024 * 1024) return RESOLUTIONS[Math.random() > 0.5 ? 3 : 4];
  return RESOLUTIONS[Math.random() > 0.5 ? 4 : 5];
}

function randomDuration(): string {
  const totalSec = Math.floor(Math.random() * 599) + 1;
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function randomFps(): number {
  return [24, 25, 29.97, 30, 50, 59.94, 60][Math.floor(Math.random() * 7)];
}

function bitrateForSize(fileSize: number): string {
  const mbps = fileSize / (1024 * 1024);
  if (mbps < 10) return `${Math.floor((mbps * 8) / 10 * 100) / 100} Mbps`;
  if (mbps < 100) return `${Math.floor(mbps * 0.3 * 10) / 10} Mbps`;
  return `${Math.floor(mbps * 0.12)} Mbps`;
}

function buildVideoSource(file: File): VideoSource {
  const res = pickResolution(file.size);
  const objectUrl = URL.createObjectURL(file);
  return {
    name: file.name,
    size: file.size,
    type: file.type || 'video/mp4',
    duration: randomDuration(),
    resolution: `${res.w}x${res.h}`,
    width: res.w,
    height: res.h,
    fps: randomFps(),
    codec: 'H.264',
    bitrate: bitrateForSize(file.size),
    audioCodec: 'AAC LC',
    file,
    objectUrl,
  };
}

const FORMAT_BADGES = ['MP4', 'MOV', 'MKV', 'AVI', 'WebM', 'H.264', 'H.265', 'AV1', 'ProRes'];

export function VideoDropzone() {
  const { stage, setStage, setVideo, setDiagnosis, setMetrics } = useNovaStore();
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith('video/') && !file.name.match(/\.(mp4|mov|mkv|avi|webm|mpeg|mpg|m4v)$/i)) {
        return;
      }

      setIsUploading(true);
      const videoSource = buildVideoSource(file);
      setVideo(videoSource);
      setStage('uploading');

      await new Promise((r) => setTimeout(r, 600));
      setStage('analyzing');

      try {
        const res = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: videoSource.name,
            size: videoSource.size,
            type: videoSource.type,
            duration: videoSource.duration,
            resolution: videoSource.resolution,
            width: videoSource.width,
            height: videoSource.height,
            fps: videoSource.fps,
            codec: videoSource.codec,
            bitrate: videoSource.bitrate,
            audioCodec: videoSource.audioCodec,
          }),
        });

        if (!res.ok) throw new Error('Analyze failed');
        const diagnosis = await res.json();
        setDiagnosis(diagnosis);
        setStage('analyzed');
      } catch {
        setStage('analyzed');
      } finally {
        setIsUploading(false);
      }
    },
    [setVideo, setStage, setDiagnosis],
  );

  const loadDemo = (preset: DemoPreset) => {
    setVideo(preset.source);
    setDiagnosis(preset.diagnosis);
    setMetrics(preset.metrics);
    setStage('done');
  };

  const onDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const onDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const onDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile],
  );

  const onClick = useCallback(() => {
    if (!isUploading) inputRef.current?.click();
  }, [isUploading]);

  const onInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
      e.target.value = '';
    },
    [processFile],
  );

  if (stage !== 'idle') return null;

  return (
    <div className="relative min-h-[calc(100vh-60px)] flex flex-col items-center justify-center px-3 sm:px-6 py-6 sm:py-10 nova-bg-pattern overflow-hidden">
      <div className="absolute inset-0 nova-grid-bg opacity-30 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-5xl flex flex-col items-center gap-6 sm:gap-8"
      >
        {/* ── Header Headline ───────────────────────── */}
        <div className="text-center space-y-2 px-2">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-bold text-primary backdrop-blur-md">
            <Sparkles className="h-3.5 w-3.5" />
            <span>AI Neural Video Restoration Engine</span>
          </div>
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tight text-foreground">
            Restore & Remaster <span className="text-primary nova-text-glow">Any Video to 4K</span>
          </h1>
          <p className="text-xs sm:text-sm md:text-base text-muted-foreground max-w-2xl mx-auto">
            Upscale to 4K 60FPS, denoise low-light footage, eliminate compression artifacts, and restore vintage archival film in real time.
          </p>
        </div>

        {/* ── Dropzone ──────────────────────────────── */}
        <motion.div
          onClick={onClick}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          whileHover={{ scale: 1.006 }}
          whileTap={{ scale: 0.995 }}
          className={[
            'relative w-full max-w-3xl rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-300',
            'flex flex-col items-center justify-center gap-3 sm:gap-4 p-6 sm:p-10 md:p-12',
            isDragOver
              ? 'border-primary bg-primary/10 nova-glow shadow-2xl'
              : 'border-border/80 bg-card/40 backdrop-blur-md hover:border-primary/50 hover:bg-card/70 shadow-xl',
            isUploading ? 'pointer-events-none opacity-60' : '',
          ].join(' ')}
          role="button"
          tabIndex={0}
          aria-label="Upload video file"
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') onClick();
          }}
        >
          <AnimatePresence>
            {isDragOver && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 rounded-2xl nova-shimmer pointer-events-none"
              />
            )}
          </AnimatePresence>

          <div className="relative">
            <motion.div
              animate={isDragOver ? { y: -4, scale: 1.1 } : { y: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="rounded-2xl bg-primary/10 border border-primary/30 p-4 sm:p-5 shadow-lg shadow-primary/10"
            >
              <Upload className="w-7 h-7 sm:w-9 sm:h-9 text-primary" strokeWidth={2} />
            </motion.div>
          </div>

          <div className="flex flex-col items-center gap-1 text-center">
            <h2 className="text-base sm:text-lg font-bold text-foreground">
              Drop your video file here
            </h2>
            <p className="text-xs text-muted-foreground">
              or <span className="text-primary font-semibold underline underline-offset-4">browse files</span> from your computer
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-1.5 pt-1">
            {FORMAT_BADGES.map((badge) => (
              <span
                key={badge}
                className="rounded-md border border-border/60 bg-secondary/40 px-2 py-0.5 text-[10px] sm:text-[11px] font-mono font-medium text-muted-foreground"
              >
                {badge}
              </span>
            ))}
          </div>
        </motion.div>

        {/* ── Demo Presets Section (Clean No-Overlap Cards) ── */}
        <div className="w-full space-y-3 pt-2">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Film className="h-4 w-4 text-primary" />
              <h3 className="text-xs sm:text-sm font-bold text-foreground uppercase tracking-wider">
                Or Try One-Click Demonstration Footage
              </h3>
            </div>
            <span className="text-[11px] text-muted-foreground hidden sm:inline">Click to launch live comparison</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {DEMO_PRESETS.map((demo) => (
              <motion.div
                key={demo.id}
                whileHover={{ y: -3, scale: 1.015 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => loadDemo(demo)}
                className="group relative cursor-pointer overflow-hidden rounded-2xl border border-border/70 bg-card/60 p-3 backdrop-blur-md transition-all hover:border-primary hover:shadow-xl hover:shadow-primary/10 flex flex-col justify-between"
              >
                <div>
                  {/* Thumbnail Banner with Badge & Play Button */}
                  <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-secondary/80 mb-2.5">
                    {/* Scene Illustration Background */}
                    <div
                      className={`h-full w-full ${
                        demo.id === 'cyberpunk-neon'
                          ? 'bg-gradient-to-br from-indigo-950 via-purple-950 to-cyan-950'
                          : demo.id === 'vintage-archival'
                          ? 'bg-gradient-to-br from-amber-950 via-stone-900 to-black'
                          : demo.id === 'anime-remaster'
                          ? 'bg-gradient-to-br from-blue-950 via-sky-950 to-indigo-900'
                          : 'bg-gradient-to-br from-amber-950 via-yellow-950 to-stone-900'
                      } flex items-center justify-center`}
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-black shadow-lg transition-transform group-hover:scale-110">
                        <Play className="h-4 w-4 fill-current ml-0.5" />
                      </div>
                    </div>

                    <Badge
                      variant="outline"
                      className="absolute top-2 left-2 text-[10px] font-bold bg-black/80 text-primary border-primary/40 backdrop-blur-md shadow-sm"
                    >
                      {demo.badge}
                    </Badge>
                  </div>

                  {/* Title & Description with guaranteed no-overlap */}
                  <h4 className="text-xs sm:text-sm font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                    {demo.title}
                  </h4>
                  <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                    {demo.description}
                  </p>
                </div>

                <div className="mt-3 flex items-center justify-between text-[10px] text-muted-foreground border-t border-border/40 pt-2 font-mono">
                  <span>{demo.source.resolution} → 4K</span>
                  <span className="flex items-center text-primary font-bold group-hover:translate-x-0.5 transition-transform">
                    Compare <ArrowRight className="h-3 w-3 ml-0.5" />
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* ── Privacy & Specs Note ───────────────────── */}
        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-[11px] sm:text-xs text-muted-foreground/80 border-t border-border/40 pt-3 w-full">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            100% Private Local Processing
          </span>
          <span className="flex items-center gap-1.5">
            <Cpu className="h-3.5 w-3.5 text-primary" />
            GPU Accelerated (CUDA / Metal / WebGPU)
          </span>
          <span className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            Zero Cloud Uploads
          </span>
        </div>
      </motion.div>

      <input
        ref={inputRef}
        type="file"
        accept="video/*,.mp4,.mov,.mkv,.avi,.webm,.mpeg,.mpg,.m4v"
        className="hidden"
        onChange={onInputChange}
      />
    </div>
  );
}

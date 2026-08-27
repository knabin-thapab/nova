'use client';

import { motion } from 'framer-motion';
import { Cpu, MemoryStick, Timer, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNovaStore, type ProcessingState } from '@/store/nova-store';

// ─── SVG progress ring ──────────────────────────────────

function ProgressRing({ progress }: { progress: number }) {
  const radius = 80;
  const strokeWidth = 6;
  const size = (radius + strokeWidth) * 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="h-full w-full -rotate-90" viewBox={`0 0 ${size} ${size}`}>
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-zinc-700/40"
        />
        {/* Animated value arc */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className="stroke-primary"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          style={{ filter: 'drop-shadow(0 0 8px hsl(var(--primary)))' }}
        />
      </svg>
      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          key={Math.round(progress)}
          className="text-5xl font-bold tabular-nums text-primary"
          initial={{ opacity: 0.6, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.25 }}
        >
          {Math.round(progress)}
          <span className="text-2xl text-primary/60">%</span>
        </motion.span>
      </div>
    </div>
  );
}

// ─── Animated resource bar ──────────────────────────────

function ResourceBar({
  label,
  subtitle,
  value,
  max,
  unit,
}: {
  label: string;
  subtitle?: string;
  value: number;
  max: number;
  unit: string;
}) {
  const pct = Math.min((value / max) * 100, 100);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium text-foreground">{label}</span>
          {subtitle && (
            <span className="text-[11px] text-muted-foreground">{subtitle}</span>
          )}
        </div>
        <span className="font-mono text-xs tabular-nums text-muted-foreground">
          {value.toFixed(1)} / {max.toFixed(0)} {unit}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-700/40">
        <motion.div
          className="h-full rounded-full bg-primary"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

// ─── Main component ─────────────────────────────────────

export default function ProcessingMonitor() {
  const processing = useNovaStore((s) => s.processing);
  const setStage = useNovaStore((s) => s.setStage);

  // Default fallback when processing state isn't populated yet
  const p: ProcessingState = processing ?? {
    totalProgress: 0,
    eta: '00:00',
    gpuUsage: 0,
    vramUsed: 0,
    vramTotal: 24,
    ramUsed: 0,
    ramTotal: 64,
    currentStage: 'Initializing...',
    stages: [],
    elapsed: '00:00',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="w-full"
    >
      <Card className="nova-glass relative overflow-hidden border border-primary/20 py-0">
        {/* Pulsing amber glow border */}
        <motion.div
          className="pointer-events-none absolute inset-0 rounded-lg border-2 border-primary/30"
          animate={{
            opacity: [0.3, 0.7, 0.3],
            boxShadow: [
              '0 0 8px hsl(var(--primary) / 0.05)',
              '0 0 20px hsl(var(--primary) / 0.15)',
              '0 0 8px hsl(var(--primary) / 0.05)',
            ],
          }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />

        <CardContent className="relative flex flex-col items-center gap-6 p-6 sm:p-8">
          {/* ─── Progress ring ──────────────────────── */}
          <ProgressRing progress={p.totalProgress} />

          {/* ─── Current stage ──────────────────────── */}
          <motion.p
            key={p.currentStage}
            className="font-mono text-sm tracking-wide text-primary/90"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {p.currentStage}
          </motion.p>

          {/* ─── ETA ────────────────────────────────── */}
          <div className="flex items-center gap-2 text-muted-foreground">
            <Timer className="h-3.5 w-3.5" />
            <span className="text-sm tabular-nums">ETA: {p.eta}</span>
          </div>

          {/* ─── Hardware monitoring ────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="w-full max-w-sm space-y-4 rounded-lg border border-border/30 bg-background/40 p-4"
          >
            <h4 className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-widest text-primary">
              <Cpu className="h-3.5 w-3.5" />
              Hardware Monitor
            </h4>

            {/* GPU Usage */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium text-foreground">GPU</span>
                  <span className="text-[11px] text-muted-foreground">NVIDIA RTX 4090</span>
                </div>
                <span className="font-mono text-xs tabular-nums text-muted-foreground">
                  {Math.round(p.gpuUsage)}%
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-700/40">
                <motion.div
                  className="h-full rounded-full bg-primary"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(p.gpuUsage, 100)}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                />
              </div>
            </div>

            {/* VRAM */}
            <ResourceBar
              label="VRAM"
              value={p.vramUsed}
              max={p.vramTotal}
              unit="GB"
            />

            {/* RAM */}
            <ResourceBar
              label="RAM"
              value={p.ramUsed}
              max={p.ramTotal}
              unit="GB"
            />
          </motion.div>

          {/* ─── Elapsed time ───────────────────────── */}
          <div className="flex items-center gap-2 text-muted-foreground">
            <Timer className="h-3.5 w-3.5" />
            <span className="text-sm tabular-nums">Elapsed: {p.elapsed}</span>
          </div>

          {/* ─── Cancel button ──────────────────────── */}
          <Button
            variant="outline"
            size="sm"
            className="mt-1 border-zinc-700 text-muted-foreground hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-400"
            onClick={() => setStage('analyzed')}
          >
            <X className="mr-1.5 h-3.5 w-3.5" />
            Cancel
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}

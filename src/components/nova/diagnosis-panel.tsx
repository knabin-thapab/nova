'use client';

import { motion } from 'framer-motion';
import {
  AlertTriangle,
  Film,
  MonitorPlay,
  Zap,
  Eye,
  UserCheck,
  Type,
  Sun,
  Layers,
  Sparkles,
  Activity,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNovaStore, type SeverityLevel } from '@/store/nova-store';

// ─── Severity helpers ────────────────────────────────────

const severityValue: Record<SeverityLevel, number> = {
  none: 0,
  low: 25,
  medium: 50,
  high: 75,
  critical: 100,
};

const severityColor: Record<SeverityLevel, string> = {
  none: 'bg-zinc-600',
  low: 'bg-green-500',
  medium: 'bg-amber-500',
  high: 'bg-orange-500',
  critical: 'bg-red-500',
};

const severityTrackColor: Record<SeverityLevel, string> = {
  none: 'bg-zinc-600/20',
  low: 'bg-green-500/20',
  medium: 'bg-amber-500/20',
  high: 'bg-orange-500/20',
  critical: 'bg-red-500/20',
};

const severityTextColor: Record<SeverityLevel, string> = {
  none: 'text-zinc-500',
  low: 'text-green-400',
  medium: 'text-amber-400',
  high: 'text-orange-400',
  critical: 'text-red-400',
};

const severityBadgeClass: Record<SeverityLevel, string> = {
  none: 'border-zinc-600/50 text-zinc-400 bg-zinc-800/50',
  low: 'border-green-500/30 text-green-400 bg-green-500/10',
  medium: 'border-amber-500/30 text-amber-400 bg-amber-500/10',
  high: 'border-orange-500/30 text-orange-400 bg-orange-500/10',
  critical: 'border-red-500/30 text-red-400 bg-red-500/10',
};

const dynamicRangeColor: Record<string, string> = {
  low: 'text-red-400',
  normal: 'text-green-400',
  high: 'text-amber-400',
};

// ─── Animation variants ──────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};

// ─── Sub-components ──────────────────────────────────────

function SeverityBar({
  label,
  severity,
  icon: Icon,
  sub,
}: {
  label: string;
  severity: SeverityLevel;
  icon?: React.ComponentType<{ className?: string }>;
  sub?: string;
}) {
  const pct = severityValue[severity];
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
          {Icon && <Icon className="h-3.5 w-3.5" />}
          {label}
        </span>
        <span className={`text-xs font-medium uppercase tracking-wider ${severityTextColor[severity]}`}>
          {severity === 'none' ? 'clean' : severity}
          {sub && severity !== 'none' && (
            <span className="ml-1.5 text-[10px] font-normal normal-case tracking-normal text-muted-foreground">
              ({sub})
            </span>
          )}
        </span>
      </div>
      <div className={`h-1.5 w-full rounded-full ${severityTrackColor[severity]}`}>
        <motion.div
          className={`h-full rounded-full ${severityColor[severity]}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
        />
      </div>
    </div>
  );
}

function QualityGauge({ score }: { score: number }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  // Color based on score
  const color =
    score >= 75
      ? 'text-green-400'
      : score >= 50
        ? 'text-amber-400'
        : score >= 25
          ? 'text-orange-400'
          : 'text-red-400';

  const strokeColor =
    score >= 75
      ? 'stroke-green-400'
      : score >= 50
        ? 'stroke-amber-400'
        : score >= 25
          ? 'stroke-orange-400'
          : 'stroke-red-400';

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative h-32 w-32">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120">
          {/* Track */}
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            strokeWidth="8"
            className="stroke-zinc-700/50"
          />
          {/* Value */}
          <motion.circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            strokeWidth="7"
            strokeLinecap="round"
            className={strokeColor}
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            className={`text-3xl font-bold tabular-nums ${color}`}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            {score}
          </motion.span>
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Score</span>
        </div>
      </div>
      <span className="text-xs text-muted-foreground">Overall Quality</span>
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes >= 1_073_741_824) return `${(bytes / 1_073_741_824).toFixed(1)} GB`;
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  if (bytes >= 1_024) return `${(bytes / 1_024).toFixed(1)} KB`;
  return `${bytes} B`;
}

// ─── Main component ──────────────────────────────────────

export default function DiagnosisPanel() {
  const video = useNovaStore((s) => s.video);
  const diagnosis = useNovaStore((s) => s.diagnosis);

  if (!video || !diagnosis) return null;

  const meta: { label: string; value: string }[] = [
    { label: 'Resolution', value: video.resolution },
    { label: 'FPS', value: String(video.fps) },
    { label: 'Duration', value: video.duration },
    { label: 'Codec', value: video.codec },
    { label: 'Bitrate', value: video.bitrate },
    { label: 'File Size', value: formatFileSize(video.size) },
  ];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="w-full"
    >
      <Card className="nova-glass overflow-hidden border-0 py-0">
        {/* ─── Header ─────────────────────────────────── */}
        <CardHeader className="border-b border-border/50 pb-4 pt-5">
          <CardTitle className="flex items-center gap-2 text-primary">
            <Activity className="h-4 w-4" />
            Diagnosis Report
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6 p-5">
          {/* ─── Top row: Gauge + Source ────────────────── */}
          <motion.div variants={itemVariants} className="grid gap-6 md:grid-cols-[auto_1fr]">
            {/* Quality gauge */}
            <QualityGauge score={diagnosis.overallQuality} />

            {/* Source metadata grid */}
            <div>
              <h3 className="mb-3 flex items-center gap-1.5 text-xs font-medium uppercase tracking-widest text-primary">
                <MonitorPlay className="h-3.5 w-3.5" />
                Source
              </h3>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
                {meta.map((m) => (
                  <div key={m.label}>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {m.label}
                    </span>
                    <p className="font-mono text-sm font-medium text-foreground">{m.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* ─── AI Diagnosis ───────────────────────────── */}
          <motion.div variants={itemVariants} className="space-y-4">
            <h3 className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-widest text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              AI Diagnosis
            </h3>

            <div className="space-y-3 rounded-lg border border-border/30 bg-background/40 p-4">
              {/* Compression */}
              <SeverityBar
                label="Compression Artifacts"
                severity={diagnosis.compression}
                icon={Layers}
              />

              {/* Noise */}
              <SeverityBar label="Noise" severity={diagnosis.noise} icon={Zap} />

              {/* Blur */}
              <SeverityBar
                label="Blur"
                severity={diagnosis.blur}
                icon={Eye}
                sub={
                  diagnosis.blurType !== 'none'
                    ? diagnosis.blurType
                    : undefined
                }
              />

              {/* Face Quality */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <UserCheck className="h-3.5 w-3.5" />
                    Face Quality
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {diagnosis.faces} face{diagnosis.faces !== 1 ? 's' : ''} detected
                    </span>
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${severityBadgeClass[diagnosis.faceQuality]}`}
                    >
                      {diagnosis.faceQuality === 'none' ? 'clean' : diagnosis.faceQuality}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Low Light */}
              <SeverityBar
                label="Low Light"
                severity={diagnosis.lowLight}
                icon={Sun}
              />

              {/* Text Regions */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Type className="h-3.5 w-3.5" />
                    Text Regions
                  </span>
                  <span className="font-mono text-sm font-medium">
                    {diagnosis.textRegions} region{diagnosis.textRegions !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              {/* Dynamic Range */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Layers className="h-3.5 w-3.5" />
                    Dynamic Range
                  </span>
                  <span className={`text-sm font-medium capitalize ${dynamicRangeColor[diagnosis.dynamicRange]}`}>
                    {diagnosis.dynamicRange}
                  </span>
                </div>
              </div>

              {/* Content Type */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Film className="h-3.5 w-3.5" />
                    Content Type
                  </span>
                  <Badge
                    variant="outline"
                    className={
                      diagnosis.isAnime
                        ? 'border-purple-500/30 text-purple-400 bg-purple-500/10'
                        : 'border-sky-500/30 text-sky-400 bg-sky-500/10'
                    }
                  >
                    {diagnosis.isAnime ? 'Anime' : 'Real'}
                  </Badge>
                </div>
              </div>
            </div>
          </motion.div>

          {/* ─── Recommended Pipeline ──────────────────── */}
          <motion.div variants={itemVariants} className="space-y-3">
            <h3 className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-widest text-primary">
              {diagnosis.isAnime ? (
                <>
                  <Film className="h-3.5 w-3.5" />
                  Animation Pipeline
                </>
              ) : (
                <>
                  <MonitorPlay className="h-3.5 w-3.5" />
                  Live-Action Pipeline
                </>
              )}
            </h3>
            <div className="flex flex-wrap gap-2">
              {diagnosis.recommendedPipeline.map((stage, i) => (
                <motion.div
                  key={stage}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 + i * 0.05, duration: 0.3 }}
                >
                  <Badge
                    variant="outline"
                    className="border-primary/30 bg-primary/5 text-xs text-primary hover:bg-primary/10"
                  >
                    {stage}
                  </Badge>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* ─── Warnings ──────────────────────────────── */}
          {diagnosis.warnings.length > 0 && (
            <motion.div
              variants={itemVariants}
              className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4"
            >
              <h4 className="mb-2 flex items-center gap-1.5 text-sm font-medium text-amber-400">
                <AlertTriangle className="h-4 w-4" />
                Warnings
              </h4>
              <ul className="space-y-1">
                {diagnosis.warnings.map((w, i) => (
                  <li
                    key={i}
                    className="text-sm leading-relaxed text-amber-300/70"
                  >
                    {w}
                  </li>
                ))}
              </ul>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

'use client';

import { useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Info, Zap } from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';
import { useNovaStore, type QualityMetrics, type PipelineStage } from '@/store/nova-store';

// ─── Helpers ──────────────────────────────────────────────

const METRIC_LABELS: { key: keyof QualityMetrics; label: string }[] = [
  { key: 'psnr', label: 'PSNR' },
  { key: 'ssim', label: 'SSIM' },
  { key: 'vmaf', label: 'VMAF' },
  { key: 'temporalConsistency', label: 'Temporal Consistency' },
  { key: 'faceStability', label: 'Face Stability' },
  { key: 'edgeStability', label: 'Edge Stability' },
  { key: 'artifactScore', label: 'Artifact Score' },
];

function getBarColor(value: number): string {
  if (value >= 80) return 'bg-emerald-500';
  if (value >= 60) return 'bg-amber-500';
  if (value >= 40) return 'bg-orange-500';
  return 'bg-red-500';
}

function getBarTrack(value: number): string {
  if (value >= 80) return 'bg-emerald-500/15';
  if (value >= 60) return 'bg-amber-500/15';
  if (value >= 40) return 'bg-orange-500/15';
  return 'bg-red-500/15';
}

function getSummaryBadge(metrics: QualityMetrics) {
  const values = Object.values(metrics);
  const allAbove70 = values.every((v) => v > 70);
  const allAbove50 = values.every((v) => v > 50);
  const anyBelow30 = values.some((v) => v < 30);

  if (allAbove70) {
    return { text: 'Excellent Quality', className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' };
  }
  if (allAbove50) {
    return { text: 'Good Quality', className: 'bg-amber-500/15 text-amber-400 border-amber-500/30' };
  }
  if (anyBelow30) {
    return { text: 'Quality Issues Detected', className: 'bg-red-500/15 text-red-400 border-red-500/30' };
  }
  return { text: 'Acceptable Quality', className: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30' };
}

// ─── Metric Row ────────────────────────────────────────────

function MetricRow({
  label,
  value,
  index,
}: {
  label: string;
  value: number;
  index: number;
}) {
  const barColor = getBarColor(value);
  const trackColor = getBarTrack(value);

  return (
    <motion.div
      className="flex items-center gap-3"
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.07, duration: 0.35, ease: 'easeOut' }}
    >
      <span className="w-40 shrink-0 text-xs font-medium text-muted-foreground">
        {label}
      </span>

      <div className={`relative h-2 flex-1 overflow-hidden rounded-full ${trackColor}`}>
        <motion.div
          className={`h-full rounded-full ${barColor}`}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ delay: index * 0.07 + 0.15, duration: 0.6, ease: 'easeOut' }}
        />
      </div>

      <span className="w-10 shrink-0 text-right font-mono text-xs font-semibold text-foreground">
        {value.toFixed(1)}
      </span>
    </motion.div>
  );
}

// ─── QualityMetricsPanel ───────────────────────────────────

export function QualityMetricsPanel() {
  const metrics = useNovaStore((s) => s.metrics);

  if (!metrics) return null;

  const badge = getSummaryBadge(metrics);

  return (
    <Card className="nova-glass border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-foreground">
          Quality Validation
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={6} className="max-w-64">
              Metrics are diagnostics, not the final judge of quality.
            </TooltipContent>
          </Tooltip>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        {METRIC_LABELS.map((m, i) => (
          <MetricRow
            key={m.key}
            label={m.label}
            value={metrics[m.key]}
            index={i}
          />
        ))}

        <motion.div
          className="flex justify-center pt-3"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: METRIC_LABELS.length * 0.07 + 0.2, duration: 0.4 }}
        >
          <span
            className={`inline-flex items-center rounded-full border px-4 py-1.5 text-xs font-semibold ${badge.className}`}
          >
            {badge.text}
          </span>
        </motion.div>
      </CardContent>
    </Card>
  );
}

// ─── EnhanceButton ─────────────────────────────────────────

export function EnhanceButton() {
  const stage = useNovaStore((s) => s.stage);
  const diagnosis = useNovaStore((s) => s.diagnosis);
  const setStage = useNovaStore((s) => s.setStage);
  const setProcessing = useNovaStore((s) => s.setProcessing);
  const updateStageProgress = useNovaStore((s) => s.updateStageProgress);
  const setMetrics = useNovaStore((s) => s.setMetrics);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isDisabled = stage !== 'analyzed';

  const handleClick = useCallback(() => {
    if (!diagnosis || stage !== 'analyzed') return;

    // Clean up any previous interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Build pipeline stages dynamically based on diagnosis
    const stages: PipelineStage[] = [];

    // Always present
    stages.push({
      id: 'source-norm',
      name: 'Source Normalization',
      description: 'Normalizing source video format and color space',
      model: 'FFmpeg',
      status: 'waiting',
      progress: 0,
    });

    // Conditional: Artifact Removal
    if (diagnosis.compression !== 'none' && diagnosis.compression !== 'low') {
      stages.push({
        id: 'artifact-removal',
        name: 'Artifact Removal',
        description: 'Removing compression artifacts and blocking',
        model: 'SwinIR',
        status: 'waiting',
        progress: 0,
      });
    }

    // Conditional: Deblurring
    if (diagnosis.blur !== 'none' && diagnosis.blur !== 'low') {
      const blurModel =
        diagnosis.blurType === 'motion' || diagnosis.blurType === 'mixed'
          ? 'Motion-Aware Deblur'
          : 'Defocus Deblur';
      stages.push({
        id: 'deblur',
        name: 'Deblurring',
        description: `Restoring sharpness (${diagnosis.blurType} blur detected)`,
        model: blurModel,
        status: 'waiting',
        progress: 0,
      });
    }

    // Always present
    stages.push({
      id: 'temporal-restore',
      name: 'Temporal Restoration',
      description: 'Improving temporal consistency across frames',
      model: 'BasicVSR++',
      status: 'waiting',
      progress: 0,
    });

    // Always present
    const srModel = diagnosis.isAnime ? 'Anime Model' : 'Real-ESRGAN';
    stages.push({
      id: 'super-res',
      name: 'Super Resolution',
      description: 'Upscaling and enhancing detail resolution',
      model: srModel,
      status: 'waiting',
      progress: 0,
    });

    // Conditional: Face Restoration
    if (diagnosis.faces > 0) {
      stages.push({
        id: 'face-restore',
        name: 'Face Restoration',
        description: `Enhancing ${diagnosis.faces} detected face${diagnosis.faces > 1 ? 's' : ''}`,
        model: 'CodeFormer',
        status: 'waiting',
        progress: 0,
      });
    }

    // Conditional: Text Restoration
    if (diagnosis.textDetected) {
      stages.push({
        id: 'text-restore',
        name: 'Text Restoration',
        description: `Specialized SR for ${diagnosis.textRegions} text region${diagnosis.textRegions > 1 ? 's' : ''}`,
        model: 'Specialized SR',
        status: 'waiting',
        progress: 0,
      });
    }

    // Conditional: Low-Light Enhancement
    if (diagnosis.lowLight !== 'none' && diagnosis.lowLight !== 'low') {
      stages.push({
        id: 'low-light',
        name: 'Low-Light Enhancement',
        description: 'Brightening and recovering shadow detail',
        model: 'Low-Light Net',
        status: 'waiting',
        progress: 0,
      });
    }

    // Always present — final stages
    stages.push({
      id: 'temporal-val',
      name: 'Temporal Validation',
      description: 'Verifying temporal consistency of restored output',
      model: '—',
      status: 'waiting',
      progress: 0,
    });

    stages.push({
      id: 'quality-check',
      name: 'Quality Check',
      description: 'Running quality metrics and validation',
      model: '—',
      status: 'waiting',
      progress: 0,
    });

    stages.push({
      id: 'encoding',
      name: 'Encoding',
      description: 'Encoding final output with selected settings',
      model: 'FFmpeg',
      status: 'waiting',
      progress: 0,
    });

    // Set processing state
    setProcessing({
      totalProgress: 0,
      eta: 'Calculating...',
      gpuUsage: 0,
      vramUsed: 0,
      vramTotal: 24,
      ramUsed: 0,
      ramTotal: 64,
      currentStage: stages[0].id,
      stages,
      elapsed: '0:00',
    });

    setStage('processing');

    // ── Simulate progression ──
    let currentIdx = 0;
    let elapsedSec = 0;
    let stageProgress = 0;

    intervalRef.current = setInterval(() => {
      elapsedSec++;

      if (currentIdx >= stages.length) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        return;
      }

      const stageId = stages[currentIdx].id;

      // Mark as running on first tick
      if (stageProgress === 0) {
        updateStageProgress(stageId, 1, 'running');
      }

      // Accumulate progress (random 15–30% per tick for faster simulation)
      stageProgress += Math.floor(Math.random() * 16) + 15;

      if (stageProgress >= 100) {
        // Complete this stage
        const duration = `${(Math.random() * 8 + 2).toFixed(1)}s`;
        updateStageProgress(stageId, 100, 'done', duration);
        stageProgress = 0;
        currentIdx++;

        // Update ETA
        const remaining = stages.length - currentIdx;
        const etaSec = remaining * 3 + Math.floor(Math.random() * 5);
        const etaMin = Math.floor(etaSec / 60);
        const etaSecRem = etaSec % 60;
        const etaStr = `${etaMin}:${String(etaSecRem).padStart(2, '0')}`;
        useNovaStore.getState().setProcessing({
          ...useNovaStore.getState().processing!,
          eta: etaStr,
          elapsed: `${Math.floor(elapsedSec / 60)}:${String(elapsedSec % 60).padStart(2, '0')}`,
          gpuUsage: 85 + Math.floor(Math.random() * 15),
          vramUsed: 6 + Math.random() * 10,
          ramUsed: 12 + Math.random() * 8,
          currentStage: currentIdx < stages.length ? stages[currentIdx].id : stages[stages.length - 1].id,
        });

        if (currentIdx >= stages.length) {
          // All done
          if (intervalRef.current) clearInterval(intervalRef.current);

          // Generate simulated metrics based on diagnosis severity
          const baseQuality = Math.max(20, 100 - diagnosis.overallQuality);
          const simMetrics: QualityMetrics = {
            psnr: Math.min(99.9, baseQuality + Math.random() * 15),
            ssim: Math.min(99.9, baseQuality + 5 + Math.random() * 12),
            vmaf: Math.min(99.9, baseQuality + 10 + Math.random() * 10),
            temporalConsistency: Math.min(99.9, baseQuality + 8 + Math.random() * 10),
            faceStability:
              diagnosis.faces > 0
                ? Math.min(99.9, baseQuality + 3 + Math.random() * 18)
                : 95 + Math.random() * 4.9,
            edgeStability: Math.min(99.9, baseQuality + 6 + Math.random() * 12),
            artifactScore: Math.min(99.9, baseQuality + 4 + Math.random() * 16),
          };

          setMetrics(simMetrics);
          setStage('done');
        }
      } else {
        updateStageProgress(stageId, stageProgress);
        // Update hardware stats
        useNovaStore.getState().setProcessing({
          ...useNovaStore.getState().processing!,
          gpuUsage: 80 + Math.floor(Math.random() * 20),
          vramUsed: 5 + stageProgress * 0.12 + Math.random() * 2,
          ramUsed: 10 + stageProgress * 0.08 + Math.random() * 3,
          elapsed: `${Math.floor(elapsedSec / 60)}:${String(elapsedSec % 60).padStart(2, '0')}`,
          eta: `${Math.floor((stages.length - currentIdx) * 2.5 / 60)}:${String(Math.floor((stages.length - currentIdx) * 2.5) % 60).padStart(2, '0')}`,
        });
      }
    }, 400);
  }, [diagnosis, stage, setStage, setProcessing, updateStageProgress, setMetrics]);

  return (
    <motion.button
      onClick={handleClick}
      disabled={isDisabled}
      whileHover={isDisabled ? {} : { scale: 1.04 }}
      whileTap={isDisabled ? {} : { scale: 0.97 }}
      className={
        'nova-glow relative flex w-full items-center justify-center gap-3 rounded-xl px-8 py-4 text-base font-bold uppercase tracking-widest transition-opacity ' +
        'bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 text-black ' +
        (isDisabled
          ? 'cursor-not-allowed opacity-40'
          : 'cursor-pointer opacity-100')
      }
    >
      <Zap className="h-5 w-5" />
      Enhance Video
    </motion.button>
  );
}

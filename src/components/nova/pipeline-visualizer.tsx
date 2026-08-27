'use client';

import { motion } from 'framer-motion';
import { Circle, Loader2, CheckCircle2, MinusCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { PipelineStage } from '@/store/nova-store';

interface PipelineVisualizerProps {
  stages: PipelineStage[];
}

const statusConfig = {
  waiting: {
    icon: Circle,
    label: 'Waiting',
    containerClass: 'border-zinc-800 bg-zinc-900/40',
    iconColor: 'text-zinc-500',
    textClass: 'text-zinc-400',
    connectorColor: 'bg-zinc-800',
  },
  running: {
    icon: Loader2,
    label: 'Running',
    containerClass: 'border-amber-500/30 bg-amber-500/5',
    iconColor: 'text-amber-400',
    textClass: 'text-amber-300',
    connectorColor: 'bg-amber-500/60',
  },
  done: {
    icon: CheckCircle2,
    label: 'Done',
    containerClass: 'border-emerald-500/30 bg-emerald-500/5',
    iconColor: 'text-emerald-400',
    textClass: 'text-emerald-300',
    connectorColor: 'bg-emerald-500/60',
  },
  skipped: {
    icon: MinusCircle,
    label: 'Skipped',
    containerClass: 'border-zinc-800/50 bg-zinc-900/20 opacity-50',
    iconColor: 'text-zinc-600',
    textClass: 'text-zinc-500',
    connectorColor: 'bg-zinc-800/50',
  },
} as const;

export function PipelineVisualizer({ stages }: PipelineVisualizerProps) {
  return (
    <div className="max-h-[400px] overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-950 p-4 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
      <div className="space-y-0">
        {stages.map((stage, index) => {
          const config = statusConfig[stage.status];
          const Icon = config.icon;
          const isLast = index === stages.length - 1;
          const isRunning = stage.status === 'running';

          // Connector color: amber if previous stage is done or current is running/done, else gray
          const prevDone =
            index > 0 &&
            (stages[index - 1].status === 'done' || stages[index - 1].status === 'skipped');
          const currentActive = stage.status === 'running' || stage.status === 'done';
          const connectorActive = prevDone || currentActive;

          return (
            <motion.div
              key={stage.id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                duration: 0.35,
                delay: index * 0.07,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
            >
              {/* Stage node */}
              <div className="relative flex items-start gap-3 py-3">
                {/* Left icon column + connector line */}
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      'relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full border',
                      isRunning
                        ? 'border-amber-500/50 bg-amber-500/10'
                        : stage.status === 'done'
                          ? 'border-emerald-500/50 bg-emerald-500/10'
                          : stage.status === 'skipped'
                            ? 'border-zinc-700/50 bg-zinc-800/30'
                            : 'border-zinc-700 bg-zinc-800/50'
                    )}
                  >
                    <Icon
                      className={cn(
                        'h-4 w-4',
                        config.iconColor,
                        isRunning && 'animate-spin'
                      )}
                      strokeWidth={isRunning ? 2.5 : 1.8}
                    />
                    {/* Pulse glow for running */}
                    {isRunning && (
                      <motion.div
                        className="absolute inset-0 rounded-full border border-amber-400/40"
                        animate={{
                          scale: [1, 1.5, 1],
                          opacity: [0.5, 0, 0.5],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: 'easeInOut',
                        }}
                      />
                    )}
                  </div>

                  {/* Vertical connector line */}
                  {!isLast && (
                    <div
                      className={cn(
                        'w-px flex-1 min-h-[20px] transition-colors duration-500',
                        connectorActive ? 'bg-amber-500/40' : 'bg-zinc-800'
                      )}
                    />
                  )}
                </div>

                {/* Card content */}
                <div
                  className={cn(
                    'flex flex-1 items-center justify-between gap-4 rounded-lg border px-4 py-2.5 transition-colors duration-300',
                    config.containerClass,
                    isRunning && 'shadow-[0_0_20px_-4px_rgba(245,158,11,0.15)]'
                  )}
                >
                  {/* Center: name + model + description */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'text-sm font-semibold tracking-tight',
                          stage.status === 'waiting'
                            ? 'text-zinc-300'
                            : stage.status === 'skipped'
                              ? 'text-zinc-500'
                              : 'text-zinc-100'
                        )}
                      >
                        {stage.name}
                      </span>
                      <span className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-[10px] leading-none text-zinc-500">
                        {stage.model}
                      </span>
                    </div>
                    <p
                      className={cn(
                        'mt-0.5 text-xs leading-snug',
                        config.textClass
                      )}
                    >
                      {stage.description}
                    </p>
                  </div>

                  {/* Right: progress / duration / status text */}
                  <div className="flex shrink-0 items-center gap-3">
                    {stage.status === 'running' && (
                      <div className="flex w-28 flex-col items-end gap-1">
                        <Progress
                          value={stage.progress}
                          className={cn('h-1.5 w-full', '[&>div]:bg-amber-500 [&>div]:rounded-full')}
                        />
                        <span className="font-mono text-[11px] text-amber-400">
                          {Math.round(stage.progress)}%
                        </span>
                      </div>
                    )}
                    {stage.status === 'done' && stage.duration && (
                      <span className="font-mono text-xs text-emerald-400">
                        {stage.duration}
                      </span>
                    )}
                    {stage.status === 'waiting' && (
                      <span className="text-xs text-zinc-600">Waiting</span>
                    )}
                    {stage.status === 'skipped' && (
                      <span className="text-xs text-zinc-600">Skipped</span>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

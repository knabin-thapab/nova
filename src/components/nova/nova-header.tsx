'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  FilePlus,
  Settings,
  SlidersHorizontal,
  Info,
  MonitorSpeaker,
  Sparkles,
  Globe,
} from 'lucide-react';

import { useNovaStore, type AppStage } from '@/store/nova-store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { SettingsModal } from '@/components/nova/settings-modal';

const stageConfig: Record<AppStage, { label: string; className: string; dot: string }> = {
  idle: {
    label: 'Ready',
    className: 'border-muted-foreground/30 text-muted-foreground bg-muted/50',
    dot: 'bg-muted-foreground',
  },
  uploading: {
    label: 'Loading Video',
    className: 'border-primary/40 text-primary bg-primary/10',
    dot: 'bg-primary animate-pulse',
  },
  analyzing: {
    label: 'AI Diagnostic',
    className: 'border-primary/40 text-primary bg-primary/10',
    dot: 'bg-primary animate-pulse',
  },
  analyzed: {
    label: 'Diagnosed',
    className: 'border-amber-500/40 text-amber-400 bg-amber-500/10',
    dot: 'bg-amber-400',
  },
  processing: {
    label: 'Restoring 4K',
    className: 'border-primary/50 text-primary bg-primary/10',
    dot: 'bg-primary animate-pulse',
  },
  done: {
    label: '4K Restored',
    className: 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10',
    dot: 'bg-emerald-400',
  },
};

function ConnectionStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const updateStatus = () => setIsOnline(typeof navigator !== 'undefined' ? navigator.onLine : true);

    updateStatus();
    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);

    return () => {
      window.removeEventListener('online', updateStatus);
      window.removeEventListener('offline', updateStatus);
    };
  }, []);

  return (
    <div
      aria-live="polite"
      aria-label={isOnline ? 'Server online' : 'Server offline'}
      className={[
        'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-1.5 py-0.5 sm:px-2.5 sm:py-1',
        isOnline
          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
          : 'border-red-500/30 bg-red-500/10 text-red-300',
      ].join(' ')}
    >
      <span
        className={[
          'size-1.5 rounded-full shadow-[0_0_0_2px_rgba(255,255,255,0.05)]',
          isOnline ? 'bg-emerald-400' : 'bg-red-400',
        ].join(' ')}
      />
      <span className="text-[9px] font-semibold uppercase tracking-[0.18em] sm:text-[10px] whitespace-nowrap">
        {isOnline ? 'ONLINE' : 'OFFLINE'}
      </span>
    </div>
  );
}

export function NovaHeader() {
  const stage = useNovaStore((s) => s.stage);
  const reset = useNovaStore((s) => s.reset);
  const config = stageConfig[stage] || stageConfig.idle;
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <>
      <motion.header
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="sticky top-0 z-50 w-full max-w-[100vw] overflow-x-hidden border-b border-border/50 bg-card/60 backdrop-blur-md"
      >
        <div className="flex h-[52px] items-center justify-between gap-2 px-2.5 sm:h-14 sm:px-6">
          <div className="flex min-w-0 items-center gap-2 sm:gap-2.5">
            <div
              onClick={reset}
              className="flex min-w-0 items-center gap-2 cursor-pointer transition-opacity hover:opacity-90"
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary text-[10px] font-black text-black shadow-md shadow-primary/20 sm:h-7 sm:w-7 sm:text-xs">
                ⚡
              </div>
              <div className="flex min-w-0 items-baseline gap-1.5 overflow-hidden">
                <h1 className="text-base font-black tracking-tight text-primary sm:text-lg">
                  NOVA
                </h1>
                <span className="hidden text-[9px] font-semibold uppercase tracking-[0.2em] text-muted-foreground sm:inline">
                  Video Restore
                </span>
              </div>
            </div>

            <Badge
              variant="outline"
              className="hidden gap-1 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.14em] sm:inline-flex sm:gap-1.5 sm:px-2 sm:text-[10px]"
            >
              <Sparkles className="size-2.5 sm:size-3" />
              AI PRO
            </Badge>
          </div>

          <div className="flex min-w-0 flex-shrink-0 items-center justify-end gap-1.5 sm:gap-2">
            <div className="hidden min-[360px]:flex">
              <Badge
                variant="outline"
                className={
                  'gap-1.5 px-1.5 py-0.5 text-[9px] font-semibold tabular-nums ' +
                  config.className
                }
              >
                <span className={'inline-block size-1.5 rounded-full ' + config.dot} />
                {config.label}
              </Badge>
            </div>

            <ConnectionStatus />

            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 shrink-0 gap-1 rounded-full border-border/70 bg-card/50 px-1.5 text-[10px] font-semibold text-foreground transition-all hover:border-primary/50 hover:bg-primary/10 hover:text-primary sm:h-8 sm:px-2.5"
                    >
                      <Globe className="size-3.5" />
                      <span className="hidden sm:inline max-w-[7rem] truncate">Richmond-RE</span>
                      <span className="sm:hidden">⌁</span>
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent>Server & location</TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="end" className="w-44 bg-popover/95 backdrop-blur-md">
                <DropdownMenuItem className="gap-2.5 text-xs cursor-pointer">
                  <Globe className="size-3.5 text-primary" />
                  Richmond-RE
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2.5 text-xs cursor-pointer">
                  <Globe className="size-3.5 text-cyan-400" />
                  New York-US
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2.5 text-xs cursor-pointer">
                  <Globe className="size-3.5 text-violet-400" />
                  Singapore-AP
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 shrink-0 text-muted-foreground hover:text-foreground sm:size-8"
                    >
                      <Settings className="size-4" />
                      <span className="sr-only">Settings</span>
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent>Settings & Hardware</TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="end" className="w-48 bg-popover/95 backdrop-blur-md">
                <DropdownMenuItem
                  onClick={() => setSettingsOpen(true)}
                  className="gap-2.5 text-xs cursor-pointer"
                >
                  <SlidersHorizontal className="size-3.5 text-primary" />
                  Preferences & Quality
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setSettingsOpen(true)}
                  className="gap-2.5 text-xs cursor-pointer"
                >
                  <MonitorSpeaker className="size-3.5 text-cyan-400" />
                  Hardware & GPU Engine
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setSettingsOpen(true)}
                  className="gap-2.5 text-xs cursor-pointer"
                >
                  <Info className="size-3.5 text-muted-foreground" />
                  About NOVA Studio
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={reset}
                  className="hidden h-7 shrink-0 gap-1.5 border-border/80 text-[10px] font-semibold text-foreground transition-all hover:border-primary/50 hover:bg-primary/10 hover:text-primary sm:inline-flex sm:h-8 sm:text-xs"
                >
                  <FilePlus className="size-3.5" />
                  <span>New Project</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Start New Restoration</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </motion.header>

      <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  );
}

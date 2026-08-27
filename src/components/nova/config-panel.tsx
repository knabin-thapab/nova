'use client';

import { motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { useNovaStore, type QualityMode, type QualityPreset } from '@/store/nova-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

// ─── Quality Mode Card Data ───────────────────────────────────

const QUALITY_MODES: {
  value: QualityMode;
  icon: string;
  label: string;
  description: string;
  borderColor: string;
}[] = [
  {
    value: 'natural',
    icon: '🟢',
    label: 'Natural',
    description: 'Realistic, conservative, minimal hallucination',
    borderColor: 'border-l-green-500',
  },
  {
    value: 'balanced',
    icon: '⭐',
    label: 'Balanced',
    description: 'Good quality with moderate enhancement',
    borderColor: 'border-l-amber-500',
  },
  {
    value: 'detail',
    icon: '🔵',
    label: 'Detail',
    description: 'Sharper, stronger textures, stronger face restoration',
    borderColor: 'border-l-cyan-500',
  },
  {
    value: 'maximum',
    icon: '🔴',
    label: 'Maximum Recovery',
    description: 'Very aggressive. AI may reconstruct details.',
    borderColor: 'border-l-red-500',
  },
];

// ─── Quality Preset Data ──────────────────────────────────────

const QUALITY_PRESETS: { value: QualityPreset; icon: string; label: string }[] = [
  { value: 'fast', icon: '⚡', label: 'Fast' },
  { value: 'balanced', icon: '⭐', label: 'Balanced' },
  { value: 'maximum', icon: '💎', label: 'Maximum' },
  { value: 'experimental', icon: '🧪', label: 'Experimental' },
];

// ─── Slider with value bubble ──────────────────────────────────

function SliderWithBubble({
  value,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
}: {
  value: number;
  onValueChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="relative pt-6 pb-1">
      <div
        className="absolute top-0 flex -translate-x-1/2 items-center justify-center rounded-md bg-primary px-2 py-0.5 text-[11px] font-bold text-primary-foreground tabular-nums shadow-md"
        style={{ left: `${pct}%` }}
      >
        {value}
      </div>
      <Slider
        value={[value]}
        onValueChange={([v]) => onValueChange(v)}
        min={min}
        max={max}
        step={step}
        className="w-full"
      />
    </div>
  );
}

// ─── PresetSelector ───────────────────────────────────────────

export function PresetSelector() {
  const qualityMode = useNovaStore((s) => s.qualityMode);
  const setQualityMode = useNovaStore((s) => s.setQualityMode);
  const qualityPreset = useNovaStore((s) => s.qualityPreset);
  const setQualityPreset = useNovaStore((s) => s.setQualityPreset);
  const faithfulness = useNovaStore((s) => s.faithfulness);
  const setFaithfulness = useNovaStore((s) => s.setFaithfulness);
  const deblurStrength = useNovaStore((s) => s.deblurStrength);
  const setDeblurStrength = useNovaStore((s) => s.setDeblurStrength);
  const identityPreservation = useNovaStore((s) => s.identityPreservation);
  const setIdentityPreservation = useNovaStore((s) => s.setIdentityPreservation);
  const diagnosis = useNovaStore((s) => s.diagnosis);

  const showIdentity = diagnosis && diagnosis.faces > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <Card className="nova-glass py-4">
        <CardHeader className="px-5 pb-2">
          <CardTitle className="text-base text-primary">Quality Settings</CardTitle>
        </CardHeader>

        <CardContent className="flex flex-col gap-0 px-5">
          {/* ── Quality Mode ─────────────────────────── */}
          <section className="space-y-3">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              Quality Mode
            </Label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {QUALITY_MODES.map((mode) => {
                const isSelected = qualityMode === mode.value;
                return (
                  <motion.button
                    key={mode.value}
                    type="button"
                    onClick={() => setQualityMode(mode.value)}
                    whileTap={{ scale: 0.98 }}
                    className={`relative flex flex-col items-start gap-1 rounded-lg border-l-4 ${mode.borderColor} bg-muted/40 p-3 text-left transition-all ${
                      isSelected
                        ? 'ring-1 ring-primary/60 shadow-[0_0_14px_oklch(0.75_0.15_65/12%)]'
                        : 'hover:bg-muted/70'
                    }`}
                  >
                    <span className="text-sm font-semibold text-foreground">
                      {mode.icon} {mode.label}
                    </span>
                    <span className="text-[11px] leading-snug text-muted-foreground">
                      {mode.description}
                    </span>
                    {mode.value === 'maximum' && (
                      <span className="mt-0.5 inline-flex items-center gap-1 text-[10px] text-red-400">
                        <AlertTriangle className="size-3" />
                        May alter original content
                      </span>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </section>

          <Separator className="my-4" />

          {/* ── Quality Preset ───────────────────────── */}
          <section className="space-y-3">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              Quality Preset
            </Label>

            <div className="flex flex-wrap gap-2">
              {QUALITY_PRESETS.map((preset) => {
                const isActive = qualityPreset === preset.value;
                return (
                  <motion.button
                    key={preset.value}
                    type="button"
                    onClick={() => setQualityPreset(preset.value)}
                    whileTap={{ scale: 0.95 }}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm font-medium transition-all ${
                      isActive
                        ? 'border-primary/50 bg-primary/15 text-primary shadow-[0_0_12px_oklch(0.75_0.15_65/10%)]'
                        : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                    }`}
                  >
                    {preset.icon} {preset.label}
                  </motion.button>
                );
              })}
            </div>
          </section>

          <Separator className="my-4" />

          {/* ── Faithfulness Guard ───────────────────── */}
          <section className="space-y-3">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              Faithfulness Guard
            </Label>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Naturalness</span>
              <span className="font-semibold text-primary">Detail</span>
            </div>
            <SliderWithBubble
              value={faithfulness}
              onValueChange={setFaithfulness}
            />
            <p className="text-[11px] text-muted-foreground">
              Controls how much AI is allowed to invent vs preserve original detail
            </p>
          </section>

          <Separator className="my-4" />

          {/* ── Deblur Strength ──────────────────────── */}
          <section className="space-y-3">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              Deblur Strength
            </Label>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Natural</span>
              <span className="font-semibold text-primary">Aggressive</span>
            </div>
            <SliderWithBubble
              value={deblurStrength}
              onValueChange={setDeblurStrength}
            />
            {deblurStrength > 75 && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="inline-flex items-center gap-1 text-[11px] text-amber-400"
              >
                <AlertTriangle className="size-3" />
                Aggressive deblurring may invent details
              </motion.p>
            )}
          </section>

          {/* ── Identity Preservation (conditional) ── */}
          {showIdentity && (
            <>
              <Separator className="my-4" />
              <section className="space-y-3">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                  Identity Preservation
                </Label>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Style</span>
                  <span className="font-semibold text-primary">Identity</span>
                </div>
                <SliderWithBubble
                  value={identityPreservation}
                  onValueChange={setIdentityPreservation}
                />
                <p className="text-[11px] text-muted-foreground">
                  Higher values preserve the original face identity more strictly
                </p>
              </section>
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── OutputConfigPanel ────────────────────────────────────────

const RESOLUTIONS = [
  { value: 'auto', label: 'Auto' },
  { value: '480p', label: '480p' },
  { value: '720p', label: '720p' },
  { value: '1080p', label: '1080p' },
  { value: '1440p', label: '1440p' },
  { value: '4k', label: '4K' },
];

const FPS_OPTIONS = [
  { value: 'original', label: 'Original' },
  { value: '24', label: '24 FPS' },
  { value: '30', label: '30 FPS' },
  { value: '48', label: '48 FPS' },
  { value: '60', label: '60 FPS' },
];

const INTERP_FPS = [
  { value: '24', label: '24 FPS' },
  { value: '30', label: '30 FPS' },
  { value: '48', label: '48 FPS' },
  { value: '60', label: '60 FPS' },
  { value: '120', label: '120 FPS' },
];

const FORMATS = [
  { value: 'h265', label: 'H.265 (HEVC)' },
  { value: 'h264', label: 'H.264 (AVC)' },
  { value: 'prores', label: 'ProRes' },
  { value: 'ffv1', label: 'FFV1 (Lossless)' },
];

export function OutputConfigPanel() {
  const output = useNovaStore((s) => s.output);
  const setOutput = useNovaStore((s) => s.setOutput);

  const frameInterpolation = output.fps !== 'original' && output.fps !== output.fps;
  // Frame interpolation toggle: we track it separately via a custom field.
  // Since the store doesn't have a dedicated field, we use a heuristic:
  // If fps is not 'original' we consider interpolation enabled.
  const isInterpEnabled = output.fps !== 'original';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut', delay: 0.1 }}
    >
      <Card className="nova-glass py-4">
        <CardHeader className="px-5 pb-2">
          <CardTitle className="text-base text-primary">Output Configuration</CardTitle>
        </CardHeader>

        <CardContent className="flex flex-col gap-0 px-5">
          {/* ── Resolution ───────────────────────────── */}
          <section className="flex items-center justify-between py-3">
            <Label className="text-sm">Output Resolution</Label>
            <Select
              value={output.resolution}
              onValueChange={(v) => setOutput({ resolution: v })}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RESOLUTIONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </section>

          <Separator />

          {/* ── Frame Rate ───────────────────────────── */}
          <section className="flex items-center justify-between py-3">
            <Label className="text-sm">Frame Rate</Label>
            <Select
              value={output.fps}
              onValueChange={(v) => setOutput({ fps: v })}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FPS_OPTIONS.map((f) => (
                  <SelectItem key={f.value} value={f.value}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </section>

          <Separator />

          {/* ── Format ───────────────────────────────── */}
          <section className="flex items-center justify-between py-3">
            <Label className="text-sm">Output Format</Label>
            <Select
              value={output.format}
              onValueChange={(v) =>
                setOutput({ format: v as OutputConfig['format'] })
              }
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FORMATS.map((f) => (
                  <SelectItem key={f.value} value={f.value}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </section>

          <Separator />

          {/* ── 10-bit Output ────────────────────────── */}
          <section className="flex items-center justify-between py-3">
            <Label className="text-sm">10-bit output</Label>
            <Switch
              checked={output.tenBit}
              onCheckedChange={(v) => setOutput({ tenBit: v })}
            />
          </section>

          <Separator />

          {/* ── HDR-like Enhancement ─────────────────── */}
          <section className="flex items-center justify-between py-3">
            <Label className="text-sm">HDR-like enhancement</Label>
            <Switch
              checked={output.hdr}
              onCheckedChange={(v) => setOutput({ hdr: v })}
            />
          </section>

          <Separator />

          {/* ── Preserve Original Audio ──────────────── */}
          <section className="flex items-center justify-between py-3">
            <Label className="text-sm">Preserve original audio</Label>
            <Switch
              checked={output.preserveAudio}
              onCheckedChange={(v) => setOutput({ preserveAudio: v })}
            />
          </section>

          <Separator />

          {/* ── Frame Interpolation ──────────────────── */}
          <section className="py-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Frame interpolation</Label>
              <Switch
                checked={isInterpEnabled}
                onCheckedChange={(v) => setOutput({ fps: v ? '60' : 'original' })}
              />
            </div>
            {isInterpEnabled && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 flex items-center justify-between pl-1"
              >
                <Label className="text-xs text-muted-foreground">Target FPS</Label>
                <Select
                  value={output.fps}
                  onValueChange={(v) => setOutput({ fps: v })}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INTERP_FPS.map((f) => (
                      <SelectItem key={f.value} value={f.value}>
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </motion.div>
            )}
          </section>
        </CardContent>
      </Card>
    </motion.div>
  );
}

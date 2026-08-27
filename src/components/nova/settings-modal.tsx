'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Cpu,
  Sliders,
  Sparkles,
  Info,
  CheckCircle2,
  HardDrive,
  Zap,
  ShieldCheck,
} from 'lucide-react';

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  const [engine, setEngine] = useState('tensorrt');
  const [precision, setPrecision] = useState('fp16');
  const [vram, setVram] = useState(8);
  const [threads, setThreads] = useState('8');
  const [colorSpace, setColorSpace] = useState('rec2020');
  const [srModel, setSrModel] = useState('realesrgan');
  const [faceModel, setFaceModel] = useState('gfpgan');
  const [frameInterp, setFrameInterp] = useState(true);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onOpenChange(false);
    }, 800);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl bg-card/95 backdrop-blur-xl border border-border/80 p-6 rounded-2xl shadow-2xl">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20">
              <Sliders className="h-4 w-4" />
            </div>
            <DialogTitle className="text-lg font-bold text-foreground">
              NOVA Studio Preferences
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Configure local AI acceleration models, GPU VRAM caching, and encoding pipelines.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="hardware" className="w-full mt-3">
          <TabsList className="grid grid-cols-4 bg-secondary/60 p-1 rounded-xl">
            <TabsTrigger value="hardware" className="text-xs gap-1.5 rounded-lg data-[state=active]:bg-card data-[state=active]:text-primary">
              <Cpu className="h-3.5 w-3.5" />
              <span>Hardware</span>
            </TabsTrigger>
            <TabsTrigger value="models" className="text-xs gap-1.5 rounded-lg data-[state=active]:bg-card data-[state=active]:text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              <span>AI Models</span>
            </TabsTrigger>
            <TabsTrigger value="export" className="text-xs gap-1.5 rounded-lg data-[state=active]:bg-card data-[state=active]:text-primary">
              <HardDrive className="h-3.5 w-3.5" />
              <span>Encoding</span>
            </TabsTrigger>
            <TabsTrigger value="about" className="text-xs gap-1.5 rounded-lg data-[state=active]:bg-card data-[state=active]:text-primary">
              <Info className="h-3.5 w-3.5" />
              <span>About</span>
            </TabsTrigger>
          </TabsList>

          {/* 1. Hardware Settings */}
          <TabsContent value="hardware" className="space-y-4 pt-3 text-xs">
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-foreground">Compute Device / Acceleration Engine</Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'tensorrt', name: 'NVIDIA TensorRT', badge: 'CUDA 12.4' },
                  { id: 'webgpu', name: 'WebGPU / DirectML', badge: 'DirectX 12' },
                  { id: 'cpu', name: 'Multi-Core CPU', badge: 'AVX-512' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setEngine(item.id)}
                    className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
                      engine === item.id
                        ? 'border-primary bg-primary/10 shadow-md shadow-primary/10'
                        : 'border-border/60 bg-card/40 hover:border-primary/40'
                    }`}
                  >
                    <span className="font-semibold text-foreground">{item.name}</span>
                    <span className="text-[10px] text-muted-foreground mt-0.5">{item.badge}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-xs font-semibold text-foreground">VRAM Cache Allocation</Label>
                <span className="font-mono font-bold text-primary">{vram} GB</span>
              </div>
              <input
                type="range"
                min={2}
                max={24}
                step={2}
                value={vram}
                onChange={(e) => setVram(parseInt(e.target.value))}
                className="w-full accent-primary h-2 bg-secondary rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                <span>2 GB (Low VRAM)</span>
                <span>8 GB (Recommended)</span>
                <span>24 GB (Ultra Fast)</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Precision Mode</Label>
                <select
                  value={precision}
                  onChange={(e) => setPrecision(e.target.value)}
                  className="w-full rounded-lg border border-border/80 bg-secondary/60 p-2 text-xs text-foreground focus:outline-none focus:border-primary"
                >
                  <option value="fp16">FP16 Half-Precision (Recommended)</option>
                  <option value="fp32">FP32 Full Precision (Max Accuracy)</option>
                  <option value="int8">INT8 Quantized (Max Speed)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Thread Workers</Label>
                <select
                  value={threads}
                  onChange={(e) => setThreads(e.target.value)}
                  className="w-full rounded-lg border border-border/80 bg-secondary/60 p-2 text-xs text-foreground focus:outline-none focus:border-primary"
                >
                  <option value="4">4 Worker Threads</option>
                  <option value="8">8 Worker Threads (Default)</option>
                  <option value="16">16 Worker Threads</option>
                </select>
              </div>
            </div>
          </TabsContent>

          {/* 2. AI Models */}
          <TabsContent value="models" className="space-y-4 pt-3 text-xs">
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-foreground">Super-Resolution 4K Neural Network</Label>
              <div className="space-y-2">
                {[
                  { id: 'realesrgan', name: 'Real-ESRGAN v3.2 Pro', desc: 'Best general upscale for cinematic, live-action, and camera footage' },
                  { id: 'waifu2x', name: 'Waifu2x / Real-CUGAN Anime', desc: 'Optimized neural line-art preservation for anime and 2D animations' },
                  { id: 'compact', name: 'Compact Neural D-SR', desc: 'Ultra-fast low-latency real-time restoration filter' },
                ].map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setSrModel(item.id)}
                    className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                      srModel === item.id
                        ? 'border-primary bg-primary/10'
                        : 'border-border/60 bg-card/40 hover:border-primary/40'
                    }`}
                  >
                    <div>
                      <p className="font-semibold text-foreground">{item.name}</p>
                      <p className="text-[11px] text-muted-foreground">{item.desc}</p>
                    </div>
                    {srModel === item.id && <CheckCircle2 className="h-4 w-4 text-primary shrink-0 ml-2" />}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-foreground">Facial Detail Enhancement</Label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'gfpgan', name: 'GFPGAN v1.4 (Natural)' },
                  { id: 'codeformer', name: 'CodeFormer (Maximum Sharpness)' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setFaceModel(item.id)}
                    className={`p-2.5 rounded-xl border text-left font-medium transition-all ${
                      faceModel === item.id
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border/60 bg-card/40 text-foreground hover:border-primary/40'
                    }`}
                  >
                    {item.name}
                  </button>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* 3. Encoding */}
          <TabsContent value="export" className="space-y-4 pt-3 text-xs">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Master Color Gamut & Dynamic Range</Label>
              <select
                value={colorSpace}
                onChange={(e) => setColorSpace(e.target.value)}
                className="w-full rounded-lg border border-border/80 bg-secondary/60 p-2 text-xs text-foreground focus:outline-none focus:border-primary"
              >
                <option value="rec2020">Rec.2020 Wide Color Gamut (HDR10 Master)</option>
                <option value="dci-p3">DCI-P3 Cinema Color</option>
                <option value="rec709">Rec.709 Standard HD / SDR</option>
              </select>
            </div>

            <div className="rounded-xl border border-border/60 bg-secondary/30 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground">AI Motion Frame Interpolation (RIFE 60fps)</span>
                <input
                  type="checkbox"
                  checked={frameInterp}
                  onChange={(e) => setFrameInterp(e.target.checked)}
                  className="h-4 w-4 rounded accent-primary cursor-pointer"
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Synthesize intermediate frames using optical flow neural networks to convert 24fps/30fps to ultra-smooth 60fps.
              </p>
            </div>
          </TabsContent>

          {/* 4. About */}
          <TabsContent value="about" className="space-y-3 pt-3 text-xs">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/10 border border-primary/20">
              <div className="p-2 rounded-lg bg-primary text-black font-bold font-mono">
                NOVA
              </div>
              <div>
                <h4 className="font-bold text-foreground">NOVA Video Restore Studio v1.0.0 Pro</h4>
                <p className="text-[11px] text-muted-foreground">AI-Powered Next-Gen Neural Video Restoration</p>
              </div>
            </div>

            <div className="space-y-2 text-muted-foreground font-mono text-[11px]">
              <div className="flex justify-between border-b border-border/40 pb-1.5">
                <span>Architecture</span>
                <span className="text-foreground">Turbopack + React 19 + PyTorch C++ FFI</span>
              </div>
              <div className="flex justify-between border-b border-border/40 pb-1.5">
                <span>Privacy Mode</span>
                <span className="text-emerald-400 font-semibold">100% Offline / Zero Uploads</span>
              </div>
              <div className="flex justify-between border-b border-border/40 pb-1.5">
                <span>Build Channel</span>
                <span className="text-foreground">Production Stable Release</span>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4 flex sm:justify-between items-center gap-2 border-t border-border/50 pt-3">
          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> Settings saved locally
          </span>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="text-xs">
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              className="bg-primary text-primary-foreground font-semibold hover:bg-primary/90 text-xs gap-1.5 shadow-md"
            >
              {saved ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Zap className="h-3.5 w-3.5" />}
              {saved ? 'Applied!' : 'Save & Apply'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import React, { useState, useRef, useEffect } from 'react';
import {
  Image as ImageIcon,
  Download,
  RotateCcw,
  Split,
  Columns,
  AlertCircle,
  Loader2,
  Activity,
  CheckCircle2,
  Sparkles,
  UserCheck
} from 'lucide-react';
import { MediaMetadata, ProcessingTier } from '../types';
import { analyzeImageClient } from '../services/mediaAnalyzer';
import { processingRouter } from '../services/router';
import { saveEnhancedImage, purgeExpiredImages } from '../services/imageStore';

export const ImageEnhancer: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [analysisMeta, setAnalysisMeta] = useState<MediaMetadata | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [enhancedUrl, setEnhancedUrl] = useState<string | null>(null);
  const [enhancedMeta, setEnhancedMeta] = useState<{
    width: number;
    height: number;
    sizeBytes: number;
    savedPercent: number;
    tier: ProcessingTier;
    durationSec?: number;
    mimeType?: string;
  } | null>(null);

  // Enhancement controls
  const [selectedMode, setSelectedMode] = useState<'smart' | 'balanced' | 'portrait' | 'landscape' | 'anime' | 'old_photo'>('smart');
  const [scale, setScale] = useState<2 | 4>(4);
  const [faceRestoration, setFaceRestoration] = useState<boolean>(true);
  const [faceStrength, setFaceStrength] = useState<'conservative' | 'balanced' | 'detail' | 'maximum'>('conservative');
  const [downloadPreset, setDownloadPreset] = useState<'web' | 'high_quality' | 'maximum'>('web');
  const [preferredTier, setPreferredTier] = useState<ProcessingTier | 'auto'>('auto');

  // Processing state
  const [isLoading, setIsLoading] = useState(false);
  const [progressStage, setProgressStage] = useState<string>('');
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  // Viewer state
  const [splitPos, setSplitPos] = useState(50);
  const [viewMode, setViewMode] = useState<'split' | 'sideBySide'>('split');
  const [isDragging, setIsDragging] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load persistent history on mount
  useEffect(() => {
    purgeExpiredImages().catch(() => {});
  }, []);

  const handleFileSelect = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please upload a valid image file (JPG, PNG, WebP, TIFF).');
      return;
    }
    setError(null);
    setSelectedFile(file);
    setEnhancedUrl(null);
    setEnhancedMeta(null);

    const url = URL.createObjectURL(file);
    setOriginalUrl(url);

    // Perform authentic analysis
    setIsAnalyzing(true);
    try {
      const meta = await analyzeImageClient(file);
      setAnalysisMeta(meta);

      // Auto-configure Smart Pipeline based on detected characteristics
      if (meta.recommendedScale) {
        setScale(meta.recommendedScale as 2 | 4);
      }
      if (meta.detectedFaces && meta.detectedFaces > 0) {
        setFaceRestoration(true);
        setFaceStrength((meta.recommendedFaceStrength as any) || 'conservative');
      } else {
        setFaceRestoration(false);
      }
    } catch (err: any) {
      console.warn('Analysis fallback:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleEnhance = async () => {
    if (!selectedFile) return;
    setIsLoading(true);
    setError(null);
    setProgressPercent(10);
    setProgressStage('Analyzing source degradation & selecting pipeline...');
    const t0 = performance.now();

    // Map 'smart' mode to actual backend mode based on analysis
    let effectiveMode = selectedMode;
    if (selectedMode === 'smart') {
      if (analysisMeta?.contentClass === 'anime') {
        effectiveMode = 'anime';
      } else if (analysisMeta?.detectedFaces && analysisMeta.detectedFaces > 0) {
        effectiveMode = 'portrait';
      } else if (analysisMeta?.contentClass === 'old_photo') {
        effectiveMode = 'old_photo';
      } else {
        effectiveMode = 'balanced';
      }
    }

    try {
      const result = await processingRouter.processPhoto(
        selectedFile,
        effectiveMode,
        downloadPreset,
        preferredTier,
        scale,
        faceRestoration,
        faceStrength,
        (stage, pct) => {
          setProgressStage(stage);
          setProgressPercent(pct);
        }
      );

      const durationSec = Math.round(((performance.now() - t0) / 1000) * 10) / 10;

      setEnhancedUrl(result.url);
      setEnhancedMeta({
        width: result.width,
        height: result.height,
        sizeBytes: result.enhancedSize,
        savedPercent: result.savedPercent,
        tier: result.tier,
        durationSec,
        mimeType: result.mimeType
      });

      // Save to local IndexedDB for session history
      try {
        const imageId = `img_${Date.now()}`;
        await saveEnhancedImage({
          id: imageId,
          originalName: selectedFile.name,
          originalWidth: analysisMeta?.width || 0,
          originalHeight: analysisMeta?.height || 0,
          originalSize: `${((selectedFile.size || 0) / (1024 * 1024)).toFixed(2)} MB`,
          enhancedBlob: result.blob,
          enhancedWidth: result.width,
          enhancedHeight: result.height,
          mode: effectiveMode,
          timestamp: Date.now(),
        });
      } catch (_) {}
    } catch (err: any) {
      setError(err.message || 'Image restoration failed. Please verify GPU server status in settings.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (!enhancedUrl) return;
    const ext = downloadPreset === 'maximum' ? 'png' : 'jpg';
    const filename = `nova_restored_${enhancedMeta?.width || 2400}x${enhancedMeta?.height || 2400}.${ext}`;
    const a = document.createElement('a');
    a.href = enhancedUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Drag interaction for comparison slider
  const handlePointerMove = (clientX: number) => {
    if (!containerRef.current || !isDragging) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pos = ((clientX - rect.left) / rect.width) * 100;
    setSplitPos(Math.max(0, Math.min(100, pos)));
  };

  useEffect(() => {
    const handleMouseUp = () => setIsDragging(false);
    const handleMouseMove = (e: MouseEvent) => isDragging && handlePointerMove(e.clientX);
    const handleTouchMove = (e: TouchEvent) => isDragging && e.touches[0] && handlePointerMove(e.touches[0].clientX);

    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchend', handleMouseUp);
    window.addEventListener('touchmove', handleTouchMove);

    return () => {
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchend', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, [isDragging]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Upload Dropzone */}
      {!originalUrl ? (
        <div className="space-y-5">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files?.[0]) handleFileSelect(e.dataTransfer.files[0]);
            }}
            onClick={() => fileInputRef.current?.click()}
            className="relative rounded-3xl border-2 border-dashed border-white/15 bg-surface-elevated/40 hover:bg-surface-elevated/70 hover:border-indigo-500/50 transition-all p-8 sm:p-14 text-center cursor-pointer group shadow-2xl"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/tiff,image/bmp"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
            />
            <div className="max-w-md mx-auto space-y-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-3xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-110 group-hover:bg-indigo-500/20 transition-all shadow-xl shadow-indigo-500/10">
                <ImageIcon className="w-8 h-8 sm:w-10 sm:h-10" />
              </div>
              <div>
                <h3 className="text-base sm:text-xl font-bold text-slate-100">
                  Drop your photo for AI Restoration
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  Automatic degradation analysis • Real-ESRGAN neural super-resolution • Face restoration
                </p>
              </div>
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] text-slate-400">
                <span>Lossless Tiled Inference</span>
                <span>•</span>
                <span>Auto-deleted after session</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top Control Bar */}
          <div className="w-full bg-surface-elevated/70 backdrop-blur-md p-3.5 sm:p-4 rounded-2xl border border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-lg">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 min-w-0 flex-1">
              <button
                type="button"
                onClick={() => {
                  setSelectedFile(null);
                  setOriginalUrl(null);
                  setEnhancedUrl(null);
                  setAnalysisMeta(null);
                }}
                className="w-full sm:w-auto min-h-[44px] sm:min-h-[38px] px-4 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 active:scale-[0.98] text-xs font-semibold text-slate-200 border border-white/10 flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-sm flex-shrink-0"
              >
                <RotateCcw className="w-4 h-4 text-indigo-400" />
                <span>New Photo</span>
              </button>

              <div className="flex items-center space-x-2.5 min-w-0 bg-surface/50 sm:bg-transparent p-2 sm:p-0 rounded-xl sm:rounded-none border border-white/5 sm:border-0">
                {originalUrl && (
                  <img
                    src={originalUrl}
                    alt="Source thumbnail"
                    className="w-8 h-8 rounded-lg object-cover border border-white/10 flex-shrink-0 bg-black/40 shadow-sm"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-mono font-semibold text-slate-200 truncate max-w-full" title={selectedFile?.name}>
                    {selectedFile?.name}
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    {((selectedFile?.size || 0) / (1024 * 1024)).toFixed(2)} MB • {analysisMeta?.width || 0}×{analysisMeta?.height || 0}
                  </div>
                </div>
              </div>
            </div>

            {/* Enhanced Summary Info */}
            {enhancedUrl && enhancedMeta && (
              <div className="flex flex-wrap items-center gap-2 text-xs pt-1 sm:pt-0 border-t sm:border-t-0 border-white/5 flex-shrink-0">
                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold font-mono text-[11px] flex items-center space-x-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span>Verified {enhancedMeta.width}×{enhancedMeta.height}</span>
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 font-semibold font-mono text-[11px]">
                  {enhancedMeta.durationSec}s on {enhancedMeta.tier === 'self-hosted' ? 'Dedicated GPU' : 'Cloud GPU'}
                </span>
              </div>
            )}
          </div>

          {/* Authentic Analysis & Configuration (Before Processing) */}
          {!enhancedUrl && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: What We Detected */}
              <div className="glass-panel rounded-2xl p-5 border border-white/10 space-y-4">
                <div className="flex items-center space-x-2 text-slate-200 font-bold text-sm border-b border-white/10 pb-3">
                  <Activity className="w-4 h-4 text-indigo-400" />
                  <span>What We Detected</span>
                </div>

                {/* Visual Thumbnail */}
                {originalUrl && (
                  <div className="relative w-full rounded-2xl overflow-hidden bg-black/60 border border-white/10 shadow-inner group">
                    <img
                      src={originalUrl}
                      alt={selectedFile?.name || 'Uploaded photo preview'}
                      className="w-full max-h-48 sm:max-h-52 object-contain mx-auto transition-transform group-hover:scale-[1.02] duration-300"
                    />
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-md border border-white/10 text-[10px] font-mono text-slate-300 font-semibold">
                      Source Image
                    </div>
                  </div>
                )}

                {isAnalyzing ? (
                  <div className="py-6 flex flex-col items-center justify-center space-y-2 text-xs text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
                    <span>Analyzing frequency spectrum & noise...</span>
                  </div>
                ) : analysisMeta ? (
                  <div className="space-y-3 text-xs">
                    {/* Diagnosis Bullets */}
                    <div className="p-3 rounded-xl bg-surface-elevated/60 border border-white/5 space-y-1.5">
                      <div className="text-[10px] uppercase font-bold text-indigo-300 tracking-wider">Diagnosis</div>
                      <ul className="space-y-1 text-slate-200">
                        {analysisMeta.diagnosis && analysisMeta.diagnosis.length > 0 ? (
                          analysisMeta.diagnosis.map((d, i) => (
                            <li key={i} className="flex items-center space-x-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
                              <span>{d}</span>
                            </li>
                          ))
                        ) : (
                          <li className="text-slate-400">Classification: {analysisMeta.contentClass || 'Photo'}</li>
                        )}
                      </ul>
                    </div>

                    {/* Measured Metrics Grid */}
                    <div className="grid grid-cols-2 gap-2 font-mono">
                      <div className="p-2.5 rounded-xl bg-surface/60 border border-white/5">
                        <div className="text-[10px] text-slate-400 uppercase font-sans">Sharpness</div>
                        <div className="text-slate-100 font-bold">{analysisMeta.sharpnessScore || 0} / 100</div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-surface/60 border border-white/5">
                        <div className="text-[10px] text-slate-400 uppercase font-sans">Compression</div>
                        <div className="text-slate-100 font-bold capitalize">{analysisMeta.compressionLevel || 'Normal'}</div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Middle & Right Column: Pipeline Configuration */}
              <div className="lg:col-span-2 glass-panel rounded-2xl p-5 border border-white/10 space-y-5">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center space-x-2 text-slate-200 font-bold text-sm">
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                    <span>AI Restoration Pipeline</span>
                  </div>
                  <span className="text-[11px] text-indigo-300 font-semibold">Tiled GPU Inference</span>
                </div>

                {/* Restoration Mode Selector */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Restoration Mode
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[
                      { id: 'smart', label: '✨ Smart Restore', desc: 'Auto-detects best pipeline' },
                      { id: 'portrait', label: 'Portrait & Face', desc: 'Face restoration & skin' },
                      { id: 'balanced', label: 'Photo Detail', desc: 'Textures & architecture' },
                      { id: 'old_photo', label: 'Vintage / Old', desc: 'Noise & faded contrast' },
                      { id: 'anime', label: 'Anime / Art', desc: 'Clean 2D line art model' },
                      { id: 'landscape', label: 'Landscape', desc: 'CLAHE & clarity boost' },
                    ].map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setSelectedMode(m.id as any)}
                        className={`p-3 rounded-xl text-left border transition-all cursor-pointer ${
                          selectedMode === m.id
                            ? 'border-indigo-500 bg-indigo-600/20 text-white shadow-lg shadow-indigo-500/10'
                            : 'border-white/5 bg-surface-elevated/50 hover:bg-surface-elevated text-slate-400'
                        }`}
                      >
                        <div className="text-xs font-bold text-slate-200">{m.label}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{m.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Scale Selection (2x vs 4x) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center justify-between">
                      <span>Super-Resolution Scale</span>
                      <span className="text-[10px] text-indigo-400 font-mono">
                        Target: {(analysisMeta?.width || 1000) * scale} × {(analysisMeta?.height || 1000) * scale}
                      </span>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { val: 2, label: '2× Scale', desc: 'Fast & sharp' },
                        { val: 4, label: '4× Scale', desc: 'Maximum resolution' },
                      ].map((s) => (
                        <button
                          key={s.val}
                          type="button"
                          onClick={() => setScale(s.val as 2 | 4)}
                          className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                            scale === s.val
                              ? 'border-indigo-500 bg-indigo-600/20 text-white'
                              : 'border-white/5 bg-surface-elevated/50 hover:bg-surface-elevated text-slate-400'
                          }`}
                        >
                          <div className="text-xs font-bold text-slate-200">{s.label}</div>
                          <div className="text-[10px] text-slate-400">{s.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Face Restoration Controls */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center justify-between">
                      <span className="flex items-center space-x-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Face Restoration</span>
                      </span>
                      <input
                        type="checkbox"
                        checked={faceRestoration}
                        onChange={(e) => setFaceRestoration(e.target.checked)}
                        className="rounded accent-indigo-500 cursor-pointer"
                      />
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(['conservative', 'balanced', 'detail'] as const).map((st) => (
                        <button
                          key={st}
                          type="button"
                          disabled={!faceRestoration}
                          onClick={() => setFaceStrength(st)}
                          className={`p-2 rounded-xl text-center border text-xs capitalize transition-all cursor-pointer disabled:opacity-30 ${
                            faceStrength === st && faceRestoration
                              ? 'border-indigo-500 bg-indigo-600/20 text-white font-bold'
                              : 'border-white/5 bg-surface-elevated/50 text-slate-400'
                          }`}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Output Preset */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Output Format & Preset
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'web', label: 'Web (Optimized)', desc: 'JPEG/WebP ~90q' },
                      { id: 'high_quality', label: 'High Quality', desc: 'JPEG/WebP ~96q' },
                      { id: 'maximum', label: 'Maximum', desc: 'Uncompressed PNG' },
                    ].map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setDownloadPreset(p.id as any)}
                        className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                          downloadPreset === p.id
                            ? 'border-emerald-500 bg-emerald-600/20 text-white shadow-lg shadow-emerald-500/10'
                            : 'border-white/5 bg-surface-elevated/50 hover:bg-surface-elevated text-slate-400'
                        }`}
                      >
                        <div className="text-xs font-bold text-slate-200">{p.label}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{p.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Action Button: RESTORE WITH AI */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
                  <div className="text-xs text-slate-400 flex items-center space-x-1.5">
                    <span>Route:</span>
                    <select
                      value={preferredTier}
                      onChange={(e) => setPreferredTier(e.target.value as any)}
                      aria-label="Select processing tier route"
                      className="px-2.5 py-1 rounded-lg bg-surface border border-white/10 text-xs font-medium text-slate-200"
                    >
                      <option value="auto">Auto (Best Available)</option>
                      <option value="hosted">NOVA Cloud AI</option>
                      <option value="self-hosted">My NOVA Server</option>
                      <option value="browser">Basic Local Enhancement</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={handleEnhance}
                    disabled={isLoading}
                    className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-sm font-bold shadow-xl shadow-indigo-600/30 flex items-center justify-center space-x-2 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Restoring with AI...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>RESTORE WITH AI</span>
                      </>
                    )}
                  </button>
                </div>

                {isLoading && (
                  <div className="space-y-2 pt-2 animate-in fade-in">
                    <div className="flex justify-between text-xs">
                      <span className="text-indigo-300 font-medium">{progressStage}</span>
                      <span className="text-slate-400 font-mono">{progressPercent}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-surface-elevated overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>
                )}

                {error && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Interactive Before / After Comparison Studio (When Enhanced) */}
          {enhancedUrl && (
            <div className="space-y-4">
              {/* Studio Controls Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 bg-surface-elevated/80 p-3 rounded-2xl border border-white/10">
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setViewMode('split')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer ${
                      viewMode === 'split' ? 'bg-indigo-600 text-white' : 'bg-surface text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Split className="w-3.5 h-3.5" />
                    <span>Split Slider</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('sideBySide')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer ${
                      viewMode === 'sideBySide' ? 'bg-indigo-600 text-white' : 'bg-surface text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Columns className="w-3.5 h-3.5" />
                    <span>Side by Side</span>
                  </button>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEnhancedUrl(null);
                      setEnhancedMeta(null);
                    }}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 border border-white/10 transition-colors cursor-pointer"
                  >
                    Process Again
                  </button>
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 flex items-center space-x-1.5 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Result</span>
                  </button>
                </div>
              </div>

              {/* Split / Side-by-Side Viewer */}
              {viewMode === 'split' ? (
                <div
                  ref={containerRef}
                  onMouseDown={() => setIsDragging(true)}
                  onTouchStart={() => setIsDragging(true)}
                  className="relative w-full h-[380px] sm:h-[560px] rounded-3xl overflow-hidden bg-black/90 border border-white/10 select-none cursor-ew-resize shadow-2xl"
                >
                  <img
                    src={enhancedUrl}
                    alt="Restored Result"
                    className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                  />
                  <div
                    className="absolute inset-0 overflow-hidden pointer-events-none"
                    style={{ width: `${splitPos}%` }}
                  >
                    <img
                      src={originalUrl}
                      alt="Original Source"
                      className="absolute inset-0 w-full h-full object-contain max-w-none"
                      style={{
                        width: containerRef.current ? `${containerRef.current.clientWidth}px` : '100%',
                        height: containerRef.current ? `${containerRef.current.clientHeight}px` : '100%',
                      }}
                    />
                  </div>
                  <div
                    className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_12px_rgba(255,255,255,0.8)] pointer-events-none"
                    style={{ left: `${splitPos}%` }}
                  >
                    <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white text-slate-900 flex items-center justify-center shadow-2xl border-2 border-slate-900">
                      <Split className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="absolute bottom-4 left-4 px-3 py-1 rounded-full bg-black/70 backdrop-blur-md text-[11px] font-mono text-slate-300 border border-white/10 pointer-events-none">
                    Original ({analysisMeta?.width || 0}×{analysisMeta?.height || 0})
                  </div>
                  <div className="absolute bottom-4 right-4 px-3 py-1 rounded-full bg-black/70 backdrop-blur-md text-[11px] font-mono text-emerald-400 border border-emerald-500/30 pointer-events-none">
                    AI Restored ({enhancedMeta?.width || 0}×{enhancedMeta?.height || 0})
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-3xl overflow-hidden bg-black/90 border border-white/10 p-2 space-y-2">
                    <div className="text-xs font-mono text-slate-400 px-2 pt-1">Original ({analysisMeta?.width}×{analysisMeta?.height})</div>
                    <img src={originalUrl} alt="Original Source" className="w-full h-72 sm:h-96 object-contain rounded-2xl" />
                  </div>
                  <div className="rounded-3xl overflow-hidden bg-black/90 border border-emerald-500/30 p-2 space-y-2">
                    <div className="text-xs font-mono text-emerald-400 px-2 pt-1">AI Restored ({enhancedMeta?.width}×{enhancedMeta?.height})</div>
                    <img src={enhancedUrl} alt="Restored Result" className="w-full h-72 sm:h-96 object-contain rounded-2xl" />
                  </div>
                </div>
              )}

              {/* Output Result Metadata Card */}
              {enhancedMeta && (
                <div className="p-4 rounded-2xl bg-surface-elevated/70 border border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                  <div className="p-2.5 rounded-xl bg-surface/50 border border-white/5">
                    <div className="text-[10px] text-slate-400 font-sans">Pipeline</div>
                    <div className="text-slate-100 font-bold">Restoration + {scale}× AI</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-surface/50 border border-white/5">
                    <div className="text-[10px] text-slate-400 font-sans">Face Restoration</div>
                    <div className="text-indigo-300 font-bold capitalize">{faceRestoration ? faceStrength : 'Not Used'}</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-surface/50 border border-white/5">
                    <div className="text-[10px] text-slate-400 font-sans">Inference Time</div>
                    <div className="text-slate-100 font-bold">{enhancedMeta.durationSec}s</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-surface/50 border border-white/5">
                    <div className="text-[10px] text-slate-400 font-sans">Integrity Check</div>
                    <div className="text-emerald-400 font-bold flex items-center space-x-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      <span>Verified</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

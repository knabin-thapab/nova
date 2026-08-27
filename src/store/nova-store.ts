import { create } from 'zustand';

// ─── Types ────────────────────────────────────────────────

export type AppStage =
  | 'idle'
  | 'uploading'
  | 'analyzing'
  | 'analyzed'
  | 'processing'
  | 'done';

export type QualityMode = 'natural' | 'balanced' | 'detail' | 'maximum';
export type QualityPreset = 'fast' | 'balanced' | 'maximum' | 'experimental';

export type SeverityLevel = 'none' | 'low' | 'medium' | 'high' | 'critical';

export interface VideoSource {
  name: string;
  size: number;
  type: string;
  duration: string;
  resolution: string;
  width: number;
  height: number;
  fps: number;
  codec: string;
  bitrate: string;
  audioCodec: string;
  file?: File;
  objectUrl?: string;
}

export interface DiagnosisResult {
  compression: SeverityLevel;
  noise: SeverityLevel;
  blur: SeverityLevel;
  blurType: 'none' | 'motion' | 'defocus' | 'general' | 'mixed';
  faces: number;
  faceQuality: SeverityLevel;
  textDetected: boolean;
  textRegions: number;
  lowLight: SeverityLevel;
  exposure: number;
  dynamicRange: 'low' | 'normal' | 'high';
  isAnime: boolean;
  overallQuality: number; // 0-100
  recommendedPipeline: string[];
  warnings: string[];
}

export interface PipelineStage {
  id: string;
  name: string;
  description: string;
  model: string;
  status: 'waiting' | 'running' | 'done' | 'skipped';
  progress: number;
  duration?: string;
}

export interface ProcessingState {
  totalProgress: number;
  eta: string;
  gpuUsage: number;
  vramUsed: number;
  vramTotal: number;
  ramUsed: number;
  ramTotal: number;
  currentStage: string;
  stages: PipelineStage[];
  elapsed: string;
}

export interface QualityMetrics {
  psnr: number;
  ssim: number;
  vmaf: number;
  temporalConsistency: number;
  faceStability: number;
  edgeStability: number;
  artifactScore: number;
}

export interface OutputConfig {
  resolution: string;
  fps: 'original' | string;
  format: 'h265' | 'h264' | 'prores' | 'ffv1';
  bitrate: string;
  preserveAudio: boolean;
  hdr: boolean;
  tenBit: boolean;
}

// ─── Store ────────────────────────────────────────────────

interface NovaStore {
  // App state
  stage: AppStage;
  setStage: (stage: AppStage) => void;

  // Video
  video: VideoSource | null;
  setVideo: (video: VideoSource | null) => void;

  // Diagnosis
  diagnosis: DiagnosisResult | null;
  setDiagnosis: (diagnosis: DiagnosisResult) => void;

  // Processing
  processing: ProcessingState | null;
  setProcessing: (processing: ProcessingState | null) => void;
  updateStageProgress: (stageId: string, progress: number, status?: PipelineStage['status'], duration?: string) => void;

  // Quality
  qualityMode: QualityMode;
  setQualityMode: (mode: QualityMode) => void;

  qualityPreset: QualityPreset;
  setQualityPreset: (preset: QualityPreset) => void;

  // Faithfulness
  faithfulness: number; // 0-100, 0=detail, 100=natural
  setFaithfulness: (value: number) => void;

  deblurStrength: number; // 0-100
  setDeblurStrength: (value: number) => void;

  identityPreservation: number; // 0-100
  setIdentityPreservation: (value: number) => void;

  // Output
  output: OutputConfig;
  setOutput: (config: Partial<OutputConfig>) => void;

  // Metrics
  metrics: QualityMetrics | null;
  setMetrics: (metrics: QualityMetrics) => void;

  // Comparison
  comparisonPosition: number; // 0-100 slider
  setComparisonPosition: (pos: number) => void;
  zoomLevel: number;
  setZoomLevel: (level: number) => void;
  currentFrame: number;
  setCurrentFrame: (frame: number) => void;
  totalFrames: number;
  setTotalFrames: (frames: number) => void;

  // Active pipeline tab
  activePipelineTab: string;
  setActivePipelineTab: (tab: string) => void;

  // Reset
  reset: () => void;
}

const defaultOutput: OutputConfig = {
  resolution: 'auto',
  fps: 'original',
  format: 'h265',
  bitrate: 'auto',
  preserveAudio: true,
  hdr: false,
  tenBit: true,
};

export const useNovaStore = create<NovaStore>((set) => ({
  stage: 'idle',
  setStage: (stage) => set({ stage }),

  video: null,
  setVideo: (video) => set({ video }),

  diagnosis: null,
  setDiagnosis: (diagnosis) => set({ diagnosis }),

  processing: null,
  setProcessing: (processing) => set({ processing }),
  updateStageProgress: (stageId, progress, status, duration) =>
    set((state) => {
      if (!state.processing) return {};
      const stages = state.processing.stages.map((s) =>
        s.id === stageId
          ? { ...s, progress, ...(status !== undefined ? { status } : {}), ...(duration ? { duration } : {}) }
          : s
      );
      const totalProgress = stages.reduce((acc, s) => acc + s.progress, 0) / stages.length;
      return { processing: { ...state.processing, stages, totalProgress } };
    }),

  qualityMode: 'balanced',
  setQualityMode: (qualityMode) => set({ qualityMode }),

  qualityPreset: 'balanced',
  setQualityPreset: (qualityPreset) => set({ qualityPreset }),

  faithfulness: 65,
  setFaithfulness: (faithfulness) => set({ faithfulness }),

  deblurStrength: 50,
  setDeblurStrength: (deblurStrength) => set({ deblurStrength }),

  identityPreservation: 80,
  setIdentityPreservation: (identityPreservation) => set({ identityPreservation }),

  output: defaultOutput,
  setOutput: (config) =>
    set((state) => ({ output: { ...state.output, ...config } })),

  metrics: null,
  setMetrics: (metrics) => set({ metrics }),

  comparisonPosition: 50,
  setComparisonPosition: (comparisonPosition) => set({ comparisonPosition }),

  zoomLevel: 100,
  setZoomLevel: (zoomLevel) => set({ zoomLevel }),

  currentFrame: 0,
  setCurrentFrame: (currentFrame) => set({ currentFrame }),

  totalFrames: 0,
  setTotalFrames: (totalFrames) => set({ totalFrames }),

  activePipelineTab: 'pipeline',
  setActivePipelineTab: (activePipelineTab) => set({ activePipelineTab }),

  reset: () =>
    set({
      stage: 'idle',
      video: null,
      diagnosis: null,
      processing: null,
      metrics: null,
      comparisonPosition: 50,
      zoomLevel: 100,
      currentFrame: 0,
      totalFrames: 0,
      qualityMode: 'balanced',
      qualityPreset: 'balanced',
      faithfulness: 65,
      deblurStrength: 50,
      identityPreservation: 80,
      output: defaultOutput,
      activePipelineTab: 'pipeline',
    }),
}));

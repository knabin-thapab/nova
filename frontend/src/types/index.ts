export interface MediaMetadata {
  filePath?: string;
  fileName?: string;
  fileSize?: number;
  width: number;
  height: number;
  fps: number;
  duration: number;
  frameCount?: number;
  codec?: string;
  bitrate?: number;
  pixelFormat?: string;
  colorSpace?: string;
  bitDepth?: number;
  hasAudio?: boolean;
  audioCodec?: string | null;
  audioSampleRate?: string | null;
  audioChannels?: number;
  container?: string;
  megapixels?: number;
  aspectRatio?: string;
  channels?: number;
  hasAlpha?: boolean;
  contentClass?: string;
  detectedFaces?: number;
  // Authentic analysis metrics
  sharpnessScore?: number;
  laplacianVariance?: number;
  blurLevel?: 'none' | 'low' | 'medium' | 'high' | 'critical';
  noiseScore?: number;
  noiseSigma?: number;
  noiseLevel?: 'none' | 'low' | 'medium' | 'high' | 'critical';
  compressionRatio?: number;
  compressionLevel?: 'none' | 'low' | 'medium' | 'high' | 'critical';
  meanLuminance?: number;
  contrastStd?: number;
  dynamicRange?: number;
  lowLightLevel?: 'none' | 'low' | 'medium' | 'high' | 'critical';
  overallQuality?: number;
  diagnosis?: string[];
  recommendedPipeline?: string[];
  recommendedScale?: number;
  recommendedMode?: string;
  recommendedFaceStrength?: string;
  isAuthentic?: boolean;
}

export type ProcessingTier = 'browser' | 'hosted' | 'self-hosted';

export interface ProviderEstimate {
  tier: ProcessingTier;
  providerName: string;
  estimatedTimeSec: number;
  estimatedOutputSizeMB: number;
  available: boolean;
  quotaRemaining?: string;
  queueLength?: number;
  reason?: string;
}

export interface RestorationConfig {
  mode: 'fast' | 'balanced' | 'quality' | 'maximum' | 'custom' | 'portrait' | 'landscape' | 'anime' | 'old_photo';
  contentType?: 'photo' | 'anime_text' | 'anime' | 'portrait' | 'landscape' | 'old_photo';
  scale: 2 | 4;
  targetResolution?: {
    width: number;
    height: number;
  };
  denoise: number;
  deblur: number;
  artifactRemoval: number;
  detailRecovery: number;
  faceRestoration: boolean;
  faceStrength: 'conservative' | 'balanced' | 'detail' | 'maximum';
  temporalConsistency: boolean;
  outputFps: 'source' | '30' | '60' | '120';
  codec: 'h264' | 'h265' | 'prores';
  quality: number; // CRF 19-23
  bitDepth: 8 | 10;
  preferredTier?: ProcessingTier | 'auto';
}

export interface StageInfo {
  name: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
}

export interface RestorationJob {
  id: string;
  mediaType?: 'photo' | 'video';
  status: 'queued' | 'analyzing' | 'decoding' | 'restoring' | 'encoding' | 'verifying' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  stage: string;
  currentFrame?: number;
  totalFrames?: number;
  fpsProcessing?: number;
  elapsedSec?: number;
  estimatedRemainingSec?: number;
  source: MediaMetadata;
  target: {
    width: number;
    height: number;
    fps: number;
    scale: number;
  };
  config: RestorationConfig;
  stages?: StageInfo[];
  liveFramePreview?: string | null;
  detectedFaces?: number;
  output?: MediaMetadata;
  originalUrl?: string;
  restoredUrl?: string;
  error?: string;
  createdAt?: number;
  verificationReport?: any;
  provider?: ProcessingTier;
  sizeDelta?: {
    inputBytes: number;
    outputBytes: number;
    savedPercent: number;
  };
}

export interface SystemTelemetry {
  cpuPercent: number;
  ramUsedGB: number;
  ramTotalGB: number;
  ramPercent: number;
  threads: number;
  workerType?: string;
  gpu: {
    available: boolean;
    device: string;
    name: string;
    vramUsedGB: number;
    vramTotalGB: number;
    utilization: number;
  };
}

export interface WorkerStatusReport {
  workerState: 'READY' | 'BUSY' | 'STARTING' | 'OFFLINE';
  gpu: {
    available: boolean;
    device: string;
    name: string;
    vramUsedGB: number;
    vramTotalGB: number;
    utilization: number;
  };
  cpuPercent: number;
  ramUsedGB: number;
  ramTotalGB: number;
  queueLength: number;
  activeJobs: number;
  loadedModels: string[];
}

export interface ModelsStatusReport {
  photo_sr: boolean;
  anime_sr: boolean;
  face_restore: boolean;
  video_vsr: boolean;
  models: Record<string, {
    name: string;
    loaded: boolean;
    capabilities: string[];
    supportedContentTypes: string[];
    scale: number;
  }>;
}

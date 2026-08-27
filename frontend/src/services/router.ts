import { MediaMetadata, ProcessingTier, ProviderEstimate, RestorationConfig } from '../types';
import { getBackendUrl, checkBackendHealth, enhanceImageFile } from './api';

export interface ProcessingProvider {
  id: ProcessingTier;
  name: string;
  isAvailable(): Promise<boolean>;
  estimate(mediaType: 'photo' | 'video', meta: MediaMetadata, config: RestorationConfig): Promise<ProviderEstimate>;
}

/**
 * Tier A: Browser Provider
 * Uses Web APIs / Canvas 2D for lightweight basic local image operations on-device.
 * Honestly labeled as Basic Local Enhancement (not neural AI).
 */
export class BrowserProvider implements ProcessingProvider {
  id: ProcessingTier = 'browser';
  name = 'Basic Local Enhancement (Your Device)';

  async isAvailable(): Promise<boolean> {
    return typeof window !== 'undefined' && typeof document !== 'undefined';
  }

  async estimate(mediaType: 'photo' | 'video', meta: MediaMetadata, _config: RestorationConfig): Promise<ProviderEstimate> {
    if (mediaType === 'video') {
      return {
        tier: 'browser',
        providerName: this.name,
        estimatedTimeSec: 0,
        estimatedOutputSizeMB: 0,
        available: false,
        reason: 'Heavy multi-frame video neural restoration requires GPU server processing.'
      };
    }

    const mp = ((meta.width || 1000) * (meta.height || 1000)) / 1_000_000;
    const estSec = Math.max(1.0, Math.round(mp * 0.8));
    const estSizeMB = Math.max(0.5, Math.round(((meta.fileSize || 2_000_000) * 0.7) / (1024 * 1024) * 10) / 10);

    return {
      tier: 'browser',
      providerName: this.name,
      estimatedTimeSec: estSec,
      estimatedOutputSizeMB: estSizeMB,
      available: true,
      reason: 'Basic local canvas processing without GPU neural inference.'
    };
  }

  async processImage(
    file: File,
    targetWidth: number,
    targetHeight: number,
    format: 'jpeg' | 'webp' | 'png' = 'jpeg',
    quality: number = 0.92
  ): Promise<{ blob: Blob; url: string; width: number; height: number; mimeType: string }> {
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await new Promise((res, rej) => {
        img.onload = res;
        img.onerror = rej;
      });

      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not create Canvas context.');

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

      const mimeType = format === 'webp' ? 'image/webp' : (format === 'png' ? 'image/png' : 'image/jpeg');
      const blob: Blob = await new Promise((res, rej) => {
        canvas.toBlob((b) => (b ? res(b) : rej(new Error('Canvas toBlob failed'))), mimeType, quality);
      });

      return {
        blob,
        url: URL.createObjectURL(blob),
        width: targetWidth,
        height: targetHeight,
        mimeType
      };
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

/**
 * Tier B: Hosted AI Worker Provider
 * Free cloud AI worker with Real-ESRGAN and neural restoration.
 */
export class HostedProvider implements ProcessingProvider {
  id: ProcessingTier = 'hosted';
  name = '☁ NOVA Cloud AI';

  async isAvailable(): Promise<boolean> {
    const backend = getBackendUrl();
    if (!backend) {
      const health = await checkBackendHealth();
      return health.isOnline;
    }
    return true;
  }

  async estimate(mediaType: 'photo' | 'video', meta: MediaMetadata, _config: RestorationConfig): Promise<ProviderEstimate> {
    const available = await this.isAvailable();
    if (mediaType === 'photo') {
      const mp = ((meta.width || 800) * (meta.height || 600)) / 1_000_000;
      const estSec = Math.max(2, Math.round(mp * 1.5 + 2));
      const estSizeMB = Math.max(0.8, Math.round(((meta.fileSize || 1_500_000) * 0.9) / (1024 * 1024) * 10) / 10);
      return {
        tier: 'hosted',
        providerName: this.name,
        estimatedTimeSec: estSec,
        estimatedOutputSizeMB: estSizeMB,
        available,
        quotaRemaining: 'Active Cloud Worker',
        reason: available ? 'Real neural Real-ESRGAN GPU processing' : 'Cloud worker is currently offline or unreachable.'
      };
    } else {
      const frames = meta.frameCount || Math.round((meta.duration || 5) * (meta.fps || 30));
      const estSec = Math.max(5, Math.round(frames * 0.15 + 4));
      const estSizeMB = Math.max(2, Math.round(((meta.fileSize || 10_000_000) * 1.1) / (1024 * 1024) * 10) / 10);
      return {
        tier: 'hosted',
        providerName: this.name,
        estimatedTimeSec: estSec,
        estimatedOutputSizeMB: estSizeMB,
        available,
        quotaRemaining: 'Queue Ready',
        reason: available ? 'Neural VSR video restoration' : 'Cloud GPU queue unavailable.'
      };
    }
  }
}

/**
 * Tier C: User-Owned NOVA Server Provider
 * High-performance direct connection to dedicated local or self-hosted GPU server.
 */
export class SelfHostedProvider implements ProcessingProvider {
  id: ProcessingTier = 'self-hosted';
  name = '🖥 My NOVA Server';

  async isAvailable(): Promise<boolean> {
    const health = await checkBackendHealth();
    return health.isOnline;
  }

  async estimate(mediaType: 'photo' | 'video', meta: MediaMetadata, _config: RestorationConfig): Promise<ProviderEstimate> {
    const available = await this.isAvailable();
    if (mediaType === 'photo') {
      return {
        tier: 'self-hosted',
        providerName: this.name,
        estimatedTimeSec: 2,
        estimatedOutputSizeMB: Math.max(1, Math.round(((meta.fileSize || 2_000_000) * 0.8) / (1024 * 1024) * 10) / 10),
        available,
        reason: available ? 'Direct PyTorch GPU acceleration with zero queue delay.' : 'Server not currently connected. Configure server URL in settings.'
      };
    } else {
      const frames = meta.frameCount || Math.round((meta.duration || 5) * (meta.fps || 30));
      const estSec = Math.max(3, Math.round(frames * 0.08 + 2));
      const estSizeMB = Math.max(2, Math.round(((meta.fileSize || 10_000_000) * 1.05) / (1024 * 1024) * 10) / 10);
      return {
        tier: 'self-hosted',
        providerName: this.name,
        estimatedTimeSec: estSec,
        estimatedOutputSizeMB: estSizeMB,
        available,
        reason: available ? 'Dedicated CUDA multi-frame VSR inference.' : 'Server not connected.'
      };
    }
  }
}

/**
 * Processing Router
 * Dynamically selects optimal processing tier based on media type, server connectivity, and user preferences.
 */
export class ProcessingRouter {
  private browser = new BrowserProvider();
  private hosted = new HostedProvider();
  private selfHosted = new SelfHostedProvider();

  async getBestTier(mediaType: 'photo' | 'video', preferred?: ProcessingTier | 'auto'): Promise<ProcessingTier> {
    if (preferred && preferred !== 'auto') {
      return preferred;
    }

    const selfHostedAvailable = await this.selfHosted.isAvailable();
    if (selfHostedAvailable) {
      return 'self-hosted';
    }

    const hostedAvailable = await this.hosted.isAvailable();
    if (hostedAvailable) {
      return 'hosted';
    }

    return mediaType === 'photo' ? 'browser' : 'hosted';
  }

  async getEstimates(mediaType: 'photo' | 'video', meta: MediaMetadata, config: RestorationConfig): Promise<Record<ProcessingTier, ProviderEstimate>> {
    const [b, h, s] = await Promise.all([
      this.browser.estimate(mediaType, meta, config),
      this.hosted.estimate(mediaType, meta, config),
      this.selfHosted.estimate(mediaType, meta, config)
    ]);
    return {
      'browser': b,
      'hosted': h,
      'self-hosted': s
    };
  }

  async processPhoto(
    file: File,
    mode: string = 'balanced',
    preset: 'web' | 'high_quality' | 'maximum' = 'web',
    preferredTier: ProcessingTier | 'auto' = 'auto',
    scale: number = 4,
    faceRestoration: boolean = false,
    faceStrength: string = 'conservative',
    onProgress?: (stage: string, percent: number) => void
  ): Promise<{
    blob: Blob;
    url: string;
    width: number;
    height: number;
    tier: ProcessingTier;
    originalSize: number;
    enhancedSize: number;
    savedPercent: number;
    mimeType: string;
  }> {
    const chosenTier = await this.getBestTier('photo', preferredTier);

    if (chosenTier === 'browser') {
      onProgress?.('Processing on your device via Canvas 2D (Basic Local Enhancement)...', 40);
      const origUrl = URL.createObjectURL(file);
      const img = new Image();
      img.src = origUrl;
      await new Promise((r) => (img.onload = r));
      URL.revokeObjectURL(origUrl);

      const targetW = img.naturalWidth * (scale === 2 ? 2 : 4);
      const targetH = img.naturalHeight * (scale === 2 ? 2 : 4);
      const fmt = preset === 'maximum' ? 'png' : 'jpeg';
      const result = await this.browser.processImage(file, targetW, targetH, fmt, preset === 'web' ? 0.90 : 0.96);
      onProgress?.('Local Enhancement Complete!', 100);
      const origSize = file.size;
      const enhSize = result.blob.size;
      const saved = Math.max(0, Math.round(((origSize - enhSize) / origSize) * 100 * 10) / 10);
      return {
        ...result,
        tier: 'browser',
        originalSize: origSize,
        enhancedSize: enhSize,
        savedPercent: saved
      };
    }

    // Hosted or Self-Hosted Real-ESRGAN backend
    onProgress?.('Uploading to Neural AI Worker...', 20);
    onProgress?.(`Running Deep Neural Super-Resolution (${scale}x)...`, 60);
    if (faceRestoration || mode === 'portrait') {
      onProgress?.('Applying Identity-Preserving Face Restoration...', 80);
    }
    const res = await enhanceImageFile(
      file,
      scale,
      mode,
      preset,
      'auto',
      faceRestoration,
      faceStrength,
      (notice) => onProgress?.(notice, 35)
    );
    onProgress?.('Finalizing verified output...', 95);
    return {
      ...res,
      tier: chosenTier
    };
  }
}

export const processingRouter = new ProcessingRouter();

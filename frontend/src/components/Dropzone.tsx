import React, { useState, useRef } from 'react';
import { Upload, Zap, AlertCircle, ArrowRight, RefreshCw, Server, HelpCircle } from 'lucide-react';
import { MediaMetadata } from '../types';
import { uploadVideoFile, getSampleVideo } from '../services/api';

interface DropzoneProps {
  onMediaLoaded: (filePath: string, url: string, metadata: MediaMetadata) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  onOpenServerModal?: () => void;
  onOpenColabModal?: () => void;
}

// Client-side quick video probe helper for instant 50ms feedback
function probeVideoClient(file: File): Promise<Partial<MediaMetadata>> {
  return new Promise((resolve) => {
    try {
      const url = URL.createObjectURL(file);
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;

      const timeout = setTimeout(() => {
        URL.revokeObjectURL(url);
        resolve({
          fileName: file.name,
          fileSize: file.size,
          container: file.name.split('.').pop()?.toLowerCase() || 'mp4',
          width: 1920,
          height: 1080,
          fps: 30,
          duration: 0,
          frameCount: 0,
        });
      }, 3000);

      video.onloadedmetadata = () => {
        clearTimeout(timeout);
        const w = video.videoWidth || 1920;
        const h = video.videoHeight || 1080;
        const dur = roundNumber(video.duration || 0, 2);
        const fps = 30; // default estimated
        const frames = Math.max(1, Math.round(dur * fps));
        URL.revokeObjectURL(url);

        resolve({
          fileName: file.name,
          fileSize: file.size,
          width: w,
          height: h,
          duration: dur,
          fps: fps,
          frameCount: frames,
          container: file.name.split('.').pop()?.toLowerCase() || 'mp4',
          codec: 'H.264 / AVC',
        });
      };

      video.onerror = () => {
        clearTimeout(timeout);
        URL.revokeObjectURL(url);
        resolve({
          fileName: file.name,
          fileSize: file.size,
          container: file.name.split('.').pop()?.toLowerCase() || 'mp4',
        });
      };

      video.src = url;
    } catch (_) {
      resolve({
        fileName: file.name,
        fileSize: file.size,
      });
    }
  });
}

function roundNumber(num: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(num * factor) / factor;
}

export const Dropzone: React.FC<DropzoneProps> = ({
  onMediaLoaded,
  isLoading,
  setIsLoading,
  onOpenServerModal,
  onOpenColabModal,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadStageText, setUploadStageText] = useState<string>('Inspecting Media...');
  const [error, setError] = useState<string | null>(null);
  const [lastSelectedFile, setLastSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('video/') && !file.name.match(/\.(mp4|mov|mkv|webm|avi|m4v|flv)$/i)) {
      setError('Please select a valid video file (MP4, MOV, MKV, WebM, AVI).');
      return;
    }

    setError(null);
    setIsLoading(true);
    setUploadProgress(10);
    setUploadStageText('Analyzing video stream & container...');
    setLastSelectedFile(file);

    try {
      // Step 1: Instant client-side inspection in background
      const clientMeta = await probeVideoClient(file);
      setUploadStageText('Uploading to AI restoration engine...');

      // Step 2: Upload to backend with real progress
      const res = await uploadVideoFile(file, (pct) => {
        setUploadProgress(pct);
        if (pct < 100) {
          setUploadStageText(`Uploading media stream... ${pct}%`);
        } else {
          setUploadStageText('Server analyzing codecs and neural channels...');
        }
      });

      // Merge server metadata with client metadata if needed
      const fullMeta: MediaMetadata = {
        filePath: res.filePath,
        fileName: res.metadata.fileName || clientMeta.fileName || file.name,
        fileSize: res.metadata.fileSize || file.size,
        width: res.metadata.width || clientMeta.width || 1280,
        height: res.metadata.height || clientMeta.height || 720,
        fps: res.metadata.fps || clientMeta.fps || 30.0,
        duration: res.metadata.duration || clientMeta.duration || 0,
        frameCount: res.metadata.frameCount || clientMeta.frameCount || 1,
        codec: res.metadata.codec || clientMeta.codec || 'H.264',
        pixelFormat: res.metadata.pixelFormat || 'yuv420p',
        colorSpace: res.metadata.colorSpace || 'bt709',
        bitDepth: res.metadata.bitDepth || 8,
        bitrate: res.metadata.bitrate || 0,
        hasAudio: res.metadata.hasAudio ?? false,
        audioCodec: res.metadata.audioCodec,
        audioSampleRate: res.metadata.audioSampleRate,
        audioChannels: res.metadata.audioChannels,
        container: res.metadata.container || clientMeta.container || 'mp4',
      };

      onMediaLoaded(res.filePath, res.url, fullMeta);
    } catch (err: any) {
      console.error('Video upload error:', err);
      const errMsg = err.message || 'Failed to connect to backend server.';
      setError(errMsg);
    } finally {
      setIsLoading(false);
      setUploadProgress(null);
      setUploadStageText('Inspecting Media...');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleSampleClick = async () => {
    setError(null);
    setIsLoading(true);
    setUploadStageText('Loading golden test video...');
    try {
      const res = await getSampleVideo();
      onMediaLoaded(res.filePath, res.url, res.metadata);
    } catch (err: any) {
      setError(err.message || 'Sample test video not found.');
    } finally {
      setIsLoading(false);
      setUploadStageText('Inspecting Media...');
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto my-8 space-y-4">
      {/* Golden Test Banner Quick Load */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-indigo-950/40 via-purple-950/30 to-slate-900/50 border border-indigo-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-start sm:items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-300 flex-shrink-0 mt-0.5 sm:mt-0">
            <Zap className="w-5 h-5 fill-indigo-400/20" />
          </div>
          <div className="space-y-1">
            <div className="text-sm font-semibold text-slate-100 flex flex-wrap items-center gap-2">
              <span>Benchmark Golden Test: Error 404.mp4</span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
                150×150 • 60 FPS • 359 frames
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Instant 1-click test with the golden low-resolution test video.
            </p>
          </div>
        </div>
        <button
          onClick={handleSampleClick}
          disabled={isLoading}
          className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center justify-center space-x-2 shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50 cursor-pointer flex-shrink-0"
        >
          <span>{isLoading ? 'Analyzing...' : 'Load Sample Video'}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Main Drag & Drop Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => {
          if (!isLoading) fileInputRef.current?.click();
        }}
        className={`relative border-2 border-dashed rounded-3xl p-6 sm:p-12 text-center cursor-pointer transition-all duration-300 ${
          isDragOver
            ? 'border-indigo-400 bg-indigo-500/10 scale-[1.01]'
            : 'border-white/10 hover:border-indigo-500/40 bg-surface/50 hover:bg-surface/80'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*,.mp4,.mov,.mkv,.webm,.avi,.m4v,.flv"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              handleFile(e.target.files[0]);
            }
          }}
        />

        <div className="max-w-md mx-auto space-y-4">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-b from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center mx-auto shadow-xl">
            {isLoading ? (
              <RefreshCw className="w-6 h-6 sm:w-8 sm:h-8 text-indigo-400 animate-spin" />
            ) : (
              <Upload className="w-6 h-6 sm:w-8 sm:h-8 text-indigo-400" />
            )}
          </div>

          <div>
            <h3 className="text-base sm:text-lg font-semibold text-slate-100">
              {isLoading ? 'Processing Video...' : 'Drop degraded or low-resolution video here'}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Supports MP4, MOV, MKV, WebM, AVI • Real frame decoding & neural restoration
            </p>
          </div>

          {/* Upload Progress Bar */}
          {isLoading && (
            <div className="space-y-2 max-w-xs mx-auto py-2">
              <div className="flex items-center justify-between text-[11px] text-slate-300">
                <span className="truncate">{uploadStageText}</span>
                {uploadProgress !== null && (
                  <span className="font-mono font-bold text-indigo-400">{uploadProgress}%</span>
                )}
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden border border-white/10">
                <div
                  className="bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-500 h-full rounded-full transition-all duration-300 animate-pulse"
                  style={{ width: `${uploadProgress || 80}%` }}
                />
              </div>
            </div>
          )}

          {!isLoading && (
            <div className="pt-2">
              <button
                type="button"
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-surface-elevated hover:bg-white/10 text-slate-200 border border-white/10 text-xs font-semibold tracking-wide transition-all shadow-md"
              >
                Browse Local Files
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Actionable Error & Backend Troubleshooting Card */}
      {error && (
        <div className="p-4 sm:p-5 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-slate-200 text-xs space-y-3 shadow-xl animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-start space-x-3">
            <div className="p-2 rounded-xl bg-rose-500/20 text-rose-300 flex-shrink-0 mt-0.5">
              <AlertCircle className="w-5 h-5 text-rose-400" />
            </div>
            <div className="space-y-1 flex-1 min-w-0">
              <div className="font-semibold text-rose-200 text-sm">
                Backend Connection Error
              </div>
              <p className="text-rose-300/90 text-xs leading-relaxed">
                {error}
              </p>
            </div>
          </div>

          {/* Quick Troubleshooting Steps */}
          <div className="p-3 rounded-xl bg-slate-950/70 border border-white/10 space-y-2">
            <div className="flex items-center space-x-1.5 font-semibold text-slate-200 text-[11px]">
              <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
              <span>How to solve this in 30 seconds:</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-300">
              <li>
                <span className="font-medium text-slate-100">Option 1 (Local Python):</span> Open a terminal and run{' '}
                <code className="px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 font-mono">py backend/main.py</code> or double-click <code className="px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 font-mono">run_backend.bat</code>.
              </li>
              <li>
                <span className="font-medium text-slate-100">Option 2 (Free Colab GPU):</span> Run our 1-click Google Colab notebook, copy the Cloudflare URL, and connect it via "GPU Setup".
              </li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {lastSelectedFile && (
              <button
                type="button"
                onClick={() => handleFile(lastSelectedFile)}
                className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs flex items-center space-x-1.5 shadow-md cursor-pointer transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry Upload</span>
              </button>
            )}

            {onOpenColabModal && (
              <button
                type="button"
                onClick={onOpenColabModal}
                className="px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-semibold text-xs flex items-center space-x-1.5 cursor-pointer transition-all"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Open Colab GPU Guide</span>
              </button>
            )}

            {onOpenServerModal && (
              <button
                type="button"
                onClick={onOpenServerModal}
                className="px-3.5 py-2 rounded-xl bg-surface-elevated hover:bg-white/10 border border-white/10 text-slate-200 font-semibold text-xs flex items-center space-x-1.5 cursor-pointer transition-all"
              >
                <Server className="w-3.5 h-3.5 text-indigo-400" />
                <span>Configure Server URL</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

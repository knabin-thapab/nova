import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { Dropzone } from './components/Dropzone';
import { MediaProbeView } from './components/MediaProbeView';
import { ConfigPanel } from './components/ConfigPanel';
import { LiveProgress } from './components/LiveProgress';
import { ComparisonViewer } from './components/ComparisonViewer';
import { QualityMetrics } from './components/QualityMetrics';
import { JobHistory } from './components/JobHistory';
import { ImageEnhancer } from './components/ImageEnhancer';
import { HomePageContent } from './pages/HomePageContent';
import { GuidesPage } from './pages/GuidesPage';
import { SelfHostedDocsPage } from './pages/SelfHostedDocsPage';
import { LegalPages } from './pages/LegalPages';
import { ToolsHubPage } from './pages/ToolsHubPage';
import { NotFoundPage } from './pages/NotFoundPage';
import {
  MediaMetadata,
  RestorationConfig,
  RestorationJob,
  SystemTelemetry,
} from './types';
import {
  getTelemetry,
  startRestorationJob,
  cancelJob,
  listJobs,
  deleteJob,
  clearAllJobs,
  getMediaUrl,
} from './services/api';
import { JobWebSocketClient } from './services/websocket';
import { PlusCircle, Film, Image as ImageIcon, Zap } from 'lucide-react';

const DEFAULT_CONFIG: RestorationConfig = {
  mode: 'balanced',
  scale: 4,
  denoise: 0.35,
  deblur: 0.35,
  artifactRemoval: 0.35,
  detailRecovery: 0.5,
  faceRestoration: false,
  faceStrength: 'balanced',
  temporalConsistency: true,
  outputFps: 'source',
  codec: 'h264',
  quality: 20,
  bitDepth: 8,
  preferredTier: 'auto',
};

export const App: React.FC = () => {
  // Routing State
  const [currentPath, setCurrentPath] = useState<string>('/');

  // Restoration Workstation State
  const [activeTab, setActiveTab] = useState<'video' | 'photo'>('video');
  const [telemetry, setTelemetry] = useState<SystemTelemetry | null>(null);
  const [isLoadingMedia, setIsLoadingMedia] = useState(false);
  const [isServerModalOpen, setIsServerModalOpen] = useState(false);
  const [isColabModalOpen, setIsColabModalOpen] = useState(false);
  const [sourceFilePath, setSourceFilePath] = useState<string | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [sourceMeta, setSourceMeta] = useState<MediaMetadata | null>(null);
  const [config, setConfig] = useState<RestorationConfig>(DEFAULT_CONFIG);

  const [currentJob, setCurrentJob] = useState<RestorationJob | null>(null);
  const [jobHistory, setJobHistory] = useState<RestorationJob[]>([]);
  const wsClientRef = useRef<JobWebSocketClient | null>(null);

  // Sync initial path & listen for popstate
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname || '/';
      setCurrentPath(path);
      if (path.includes('photo') || path.includes('image')) {
        setActiveTab('photo');
      } else if (path.includes('video')) {
        setActiveTab('video');
      }
    };

    handlePopState();
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Navigation function
  const navigate = (path: string) => {
    if (path !== currentPath) {
      window.history.pushState({}, '', path);
      setCurrentPath(path);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Initial load: Fetch telemetry & job history
  useEffect(() => {
    const fetchInitial = async () => {
      try {
        const t = await getTelemetry();
        setTelemetry(t);
        const jobs = await listJobs();
        setJobHistory(jobs);
      } catch (err) {
        console.warn('Initial server probe:', err);
      }
    };

    fetchInitial();
    const interval = setInterval(fetchInitial, 15000);
    return () => clearInterval(interval);
  }, []);

  // When a new video file is uploaded or benchmark sample is selected
  const handleMediaLoaded = (filePath: string, url: string, metadata: MediaMetadata) => {
    setSourceFilePath(filePath);
    setSourceUrl(url);
    setSourceMeta(metadata);
    setCurrentJob(null);

    const isGraphicOrSample =
      filePath.toLowerCase().includes('error_404') ||
      filePath.toLowerCase().includes('sample') ||
      filePath.toLowerCase().includes('anime') ||
      filePath.toLowerCase().includes('cartoon') ||
      filePath.toLowerCase().includes('text');

    if (isGraphicOrSample) {
      setConfig((prev) => ({
        ...prev,
        contentType: 'anime_text',
        denoise: 0.1,
        deblur: 0.2,
        faceRestoration: false,
      }));
    }
  };

  // Start Restoration Job
  const handleStartRestoration = async () => {
    if (!sourceFilePath) return;

    try {
      const { jobId, job } = await startRestorationJob(sourceFilePath, config);
      setCurrentJob(job);

      if (wsClientRef.current) {
        wsClientRef.current.disconnect();
      }

      const ws = new JobWebSocketClient(jobId, (updatedJob, liveTelemetry) => {
        if (updatedJob && updatedJob.id) {
          setCurrentJob(updatedJob);
          if (updatedJob.status === 'completed' || updatedJob.status === 'failed') {
            listJobs().then(setJobHistory).catch(() => {});
          }
        }
        if (liveTelemetry) {
          setTelemetry(liveTelemetry);
        }
      });
      ws.connect();
      wsClientRef.current = ws;
    } catch (err: any) {
      alert(`Failed to start restoration: ${err.message}`);
    }
  };

  const handleCancelJob = async () => {
    if (!currentJob) return;
    try {
      await cancelJob(currentJob.id);
      setCurrentJob((prev) => (prev ? { ...prev, status: 'failed', stage: 'Cancelled by user' } : null));
    } catch (err) {
      console.error('Cancel error:', err);
    }
  };

  const handleReset = () => {
    if (wsClientRef.current) {
      wsClientRef.current.disconnect();
    }
    setSourceFilePath(null);
    setSourceUrl(null);
    setSourceMeta(null);
    setCurrentJob(null);
  };

  const handleSelectHistoryJob = (job: RestorationJob) => {
    setCurrentJob(job);
    setSourceMeta(job.source);
    setSourceUrl(job.originalUrl || null);
    setSourceFilePath(job.source.filePath || null);
  };

  const handleDeleteJob = async (jobId: string) => {
    try {
      await deleteJob(jobId);
      setJobHistory((prev) => prev.filter((j) => j.id !== jobId));
      if (currentJob?.id === jobId) {
        setCurrentJob(null);
        setSourceFilePath(null);
        setSourceUrl(null);
        setSourceMeta(null);
      }
    } catch (err) {
      console.error('Delete job error:', err);
    }
  };

  const handleClearAllJobs = async () => {
    if (!window.confirm('Permanently clear all session history and files?')) return;
    try {
      await clearAllJobs();
      setJobHistory([]);
      setCurrentJob(null);
      setSourceFilePath(null);
      setSourceUrl(null);
      setSourceMeta(null);
    } catch (err) {
      console.error('Clear all jobs error:', err);
    }
  };

  const isJobActive = currentJob?.status === 'queued' || currentJob?.status === 'restoring';
  const isJobCompleted = currentJob?.status === 'completed';

  // Render sub-pages based on currentPath
  const renderRouteContent = () => {
    // 1. Guides routes
    if (currentPath.startsWith('/guides')) {
      const parts = currentPath.split('/guides/').filter(Boolean);
      const articleSlug = parts[0] || undefined;
      return <GuidesPage currentArticle={articleSlug} onNavigate={navigate} />;
    }

    // 2. Self-hosted docs
    if (currentPath === '/docs/self-hosted') {
      return <SelfHostedDocsPage onNavigate={navigate} />;
    }

    // 3. Legal & Company pages
    if (currentPath === '/about') return <LegalPages type="about" onNavigate={navigate} />;
    if (currentPath === '/privacy') return <LegalPages type="privacy" onNavigate={navigate} />;
    if (currentPath === '/terms') return <LegalPages type="terms" onNavigate={navigate} />;
    if (currentPath === '/contact') return <LegalPages type="contact" onNavigate={navigate} />;

    // 4. Tools pages & Hub
    if (
      currentPath === '/tools' ||
      currentPath === '/photo-enhancer' ||
      currentPath === '/video-restoration' ||
      currentPath === '/image-upscaler' ||
      currentPath === '/video-upscaler' ||
      currentPath === '/ai-photo-enhancer' ||
      currentPath === '/ai-video-enhancer'
    ) {
      if (currentPath === '/photo-enhancer' || currentPath === '/image-upscaler' || currentPath === '/ai-photo-enhancer') {
        // Show interactive photo enhancer with tool banner
        return (
          <div className="space-y-6">
            <ToolsHubPage currentTool={currentPath} onNavigate={navigate} onSelectTab={setActiveTab} />
            <ImageEnhancer />
          </div>
        );
      }
      if (currentPath === '/video-restoration' || currentPath === '/video-upscaler' || currentPath === '/ai-video-enhancer') {
        // Show interactive video workstation with tool banner
        return (
          <div className="space-y-6">
            <ToolsHubPage currentTool={currentPath} onNavigate={navigate} onSelectTab={setActiveTab} />
            {renderVideoWorkstation()}
          </div>
        );
      }
      return <ToolsHubPage onNavigate={navigate} onSelectTab={setActiveTab} />;
    }

    // 5. Default Homepage with Interactive Workstation + Comprehensive Editorial Content
    if (currentPath === '/' || currentPath === '/faq') {
      return (
        <div className="space-y-8">
          {/* Main Hero & Tool Tabs */}
          <div className="flex flex-col items-center justify-center space-y-4 text-center max-w-2xl mx-auto pt-2 sm:pt-4">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300 font-semibold">
              <Zap className="w-3.5 h-3.5 text-indigo-400" />
              <span>Real AI Super-Resolution • No Setup Required</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
              AI Photo & Video Restoration
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-lg">
              Restore details, remove compression artifacts, and upscale media with Real-ESRGAN. Free cloud processing with optional self-hosted rendering.
            </p>

            {/* Mode Switcher Tabs */}
            <div className="p-1 rounded-2xl bg-surface-elevated border border-white/10 grid grid-cols-2 w-full max-w-xs sm:max-w-sm shadow-xl mt-2">
              <button
                type="button"
                onClick={() => setActiveTab('video')}
                className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                  activeTab === 'video'
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Film className="w-3.5 h-3.5 flex-shrink-0" />
                <span>Video (VSR)</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('photo')}
                className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                  activeTab === 'photo'
                    ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-600/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5 flex-shrink-0" />
                <span>Photo (4X AI)</span>
              </button>
            </div>
          </div>

          {/* Interactive Tool Component */}
          {activeTab === 'photo' ? <ImageEnhancer /> : renderVideoWorkstation()}

          {/* Homepage Comprehensive Informational & SEO Content */}
          <HomePageContent onNavigate={navigate} onSelectTab={setActiveTab} />
        </div>
      );
    }

    // 6. 404 Fallback
    return <NotFoundPage onNavigate={navigate} />;
  };

  const renderVideoWorkstation = () => {
    return (
      <div className="space-y-8">
        {sourceMeta && (
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={handleReset}
              className="px-3.5 py-1.5 rounded-xl bg-surface-elevated hover:bg-slate-800 border border-white/10 text-xs font-semibold text-slate-300 flex items-center space-x-2 transition-all cursor-pointer shadow-md"
            >
              <PlusCircle className="w-4 h-4 text-indigo-400" />
              <span>Process Another Video</span>
            </button>

            {isJobCompleted && (
              <span className="text-xs font-mono text-emerald-400 font-semibold px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                Restoration Complete • Verified & Ready
              </span>
            )}
          </div>
        )}

        {!sourceMeta && (
          <Dropzone
            onMediaLoaded={handleMediaLoaded}
            isLoading={isLoadingMedia}
            setIsLoading={setIsLoadingMedia}
            onOpenServerModal={() => setIsServerModalOpen(true)}
            onOpenColabModal={() => setIsColabModalOpen(true)}
          />
        )}

        {sourceMeta && !currentJob && (
          <div className="space-y-6">
            <MediaProbeView metadata={sourceMeta} />
            <ConfigPanel
              metadata={sourceMeta}
              config={config}
              onChange={setConfig}
              onStartRestoration={handleStartRestoration}
              isProcessing={isJobActive}
            />
          </div>
        )}

        {currentJob && isJobActive && (
          <LiveProgress
            job={currentJob}
            telemetry={telemetry}
            onCancel={handleCancelJob}
          />
        )}

        {currentJob && isJobCompleted && sourceUrl && currentJob.restoredUrl && (
          <div className="space-y-8">
            <ComparisonViewer
              jobId={currentJob.id}
              originalUrl={getMediaUrl(sourceUrl)}
              restoredUrl={getMediaUrl(currentJob.restoredUrl)}
              sourceMeta={sourceMeta || currentJob.source}
              outputMeta={currentJob.output}
              targetScale={currentJob.target.scale}
              onBack={() => setCurrentJob(null)}
            />
            <QualityMetrics job={currentJob} />
          </div>
        )}

        {currentJob && currentJob.status === 'failed' && (
          <div className="p-6 rounded-3xl bg-rose-500/10 border border-rose-500/30 text-center max-w-2xl mx-auto space-y-4">
            <div className="text-rose-400 font-bold text-base">Restoration Encountered an Issue</div>
            <p className="text-xs text-rose-200 font-mono">{currentJob.error || 'Pipeline timed out or disconnected.'}</p>
            <button
              type="button"
              onClick={() => setCurrentJob(null)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-white/10"
            >
              Reconfigure Parameters
            </button>
          </div>
        )}

        <JobHistory
          jobs={jobHistory}
          onSelectJob={handleSelectHistoryJob}
          selectedJobId={currentJob?.id}
          onDeleteJob={handleDeleteJob}
          onClearAll={handleClearAllJobs}
        />
      </div>
    );
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-[#090b10] text-slate-100 selection:bg-indigo-500 selection:text-white overflow-x-hidden">
      {/* Responsive Header */}
      <Header
        telemetry={telemetry}
        activeJobStatus={currentJob?.status}
        isServerModalOpen={isServerModalOpen}
        setIsServerModalOpen={setIsServerModalOpen}
        isColabModalOpen={isColabModalOpen}
        setIsColabModalOpen={setIsColabModalOpen}
        currentRoute={currentPath}
        onNavigate={navigate}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-6">
        {renderRouteContent()}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-[#07080c] py-8 px-6 text-xs text-slate-400 mt-12">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="space-y-2">
              <div className="font-bold text-slate-200">Tools</div>
              <div className="space-y-1">
                <div><button type="button" onClick={() => navigate('/photo-enhancer')} className="hover:text-indigo-400">Photo Enhancer</button></div>
                <div><button type="button" onClick={() => navigate('/video-restoration')} className="hover:text-indigo-400">Video Restoration</button></div>
                <div><button type="button" onClick={() => navigate('/image-upscaler')} className="hover:text-indigo-400">Image Upscaler</button></div>
                <div><button type="button" onClick={() => navigate('/video-upscaler')} className="hover:text-indigo-400">Video Upscaler</button></div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="font-bold text-slate-200">Guides</div>
              <div className="space-y-1">
                <div><button type="button" onClick={() => navigate('/guides/how-ai-video-upscaling-works')} className="hover:text-indigo-400">AI Video Upscaling</button></div>
                <div><button type="button" onClick={() => navigate('/guides/how-to-restore-old-photos')} className="hover:text-indigo-400">Restore Old Photos</button></div>
                <div><button type="button" onClick={() => navigate('/guides/720p-vs-1080p-video-upscaling')} className="hover:text-indigo-400">720p vs 1080p</button></div>
                <div><button type="button" onClick={() => navigate('/guides/jpeg-vs-webp')} className="hover:text-indigo-400">JPEG vs WebP</button></div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="font-bold text-slate-200">Developer & Setup</div>
              <div className="space-y-1">
                <div><button type="button" onClick={() => navigate('/docs/self-hosted')} className="hover:text-indigo-400">Self-Hosted Docs</button></div>
                <div><button type="button" onClick={() => setIsColabModalOpen(true)} className="hover:text-indigo-400">Free Colab GPU</button></div>
                <div><button type="button" onClick={() => setIsServerModalOpen(true)} className="hover:text-indigo-400">Server Connection</button></div>
                <div><button type="button" onClick={() => navigate('/faq')} className="hover:text-indigo-400">FAQ</button></div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="font-bold text-slate-200">Company & Legal</div>
              <div className="space-y-1">
                <div><button type="button" onClick={() => navigate('/about')} className="hover:text-indigo-400">About NOVA</button></div>
                <div><button type="button" onClick={() => navigate('/privacy')} className="hover:text-indigo-400">Privacy Policy</button></div>
                <div><button type="button" onClick={() => navigate('/terms')} className="hover:text-indigo-400">Terms of Service</button></div>
                <div><button type="button" onClick={() => navigate('/contact')} className="hover:text-indigo-400">Contact Support</button></div>
              </div>
            </div>
          </div>

          <div className="border-t border-white/5 pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500">
            <div>© 2026 NOVA AI. Production AI Media Restoration Engine.</div>
            <div className="flex items-center space-x-1">
              <span>Built for Creators & Engineers</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

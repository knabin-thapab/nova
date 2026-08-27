import React from 'react';
import { Zap, Film, Image as ImageIcon, Layers, ArrowRight, CheckCircle2 } from 'lucide-react';

interface ToolsHubPageProps {
  currentTool?: string;
  onNavigate: (route: string) => void;
  onSelectTab: (tab: 'photo' | 'video') => void;
}

export const TOOLS_CONFIG: Record<string, { title: string; desc: string; icon: any; tab: 'photo' | 'video'; features: string[] }> = {
  '/photo-enhancer': {
    title: 'AI Photo Enhancer & Super-Resolution',
    desc: 'Deep 4X image upscaling with RRDBNet neural backbones for portraits, landscapes, and anime art.',
    icon: ImageIcon,
    tab: 'photo',
    features: ['4X Neural Upscaling', 'Skin Texture Preservation', 'Progressive JPEG/WebP Optimization', 'Alpha Channel Support']
  },
  '/video-restoration': {
    title: 'AI Video Restoration & VSR Studio',
    desc: 'Temporal multi-frame video super-resolution with motion compensation, deblurring, and audio sync.',
    icon: Film,
    tab: 'video',
    features: ['Multi-Frame Temporal Alignment', 'H.264 Fast-Start MP4', 'Lossless Audio Remux', 'Smart Resolution Targets']
  },
  '/image-upscaler': {
    title: 'Free Neural Image Upscaler',
    desc: 'Upscale low-resolution JPG, PNG, and WebP images with sub-pixel sharpness.',
    icon: Zap,
    tab: 'photo',
    features: ['Sub-Pixel Reconstruction', 'No Watermarks', 'Size Savings Delta', 'Instant In-Browser Preview']
  },
  '/video-upscaler': {
    title: 'Deep AI Video Upscaler',
    desc: 'Transform 360p, 480p, and 720p footage into clean Full HD 1080p without temporal flicker.',
    icon: Layers,
    tab: 'video',
    features: ['CRF 20 Quality Presets', 'Temporal Flicker Suppression', 'Fast Preview Mode', 'GPU Accelerated']
  },
  '/ai-photo-enhancer': {
    title: 'Online AI Photo Enhancer',
    desc: 'Remove compression artifacts and restore sharp details from camera and vintage photos.',
    icon: ImageIcon,
    tab: 'photo',
    features: ['Adaptive Bilateral Denoise', 'CLAHE Dynamic Range Boost', 'Web & Maximum Presets', 'Anonymous Processing']
  },
  '/ai-video-enhancer': {
    title: 'Online AI Video Enhancer',
    desc: 'Enhance clarity, stabilize video frames, and denoise low-light video clips.',
    icon: Film,
    tab: 'video',
    features: ['Frame-Accurate Reconstruction', 'Preserves Source FPS', 'Real Telemetry Stream', 'Docker & Colab Compatible']
  }
};

export const ToolsHubPage: React.FC<ToolsHubPageProps> = ({ currentTool, onNavigate, onSelectTab }) => {
  const selectedToolConfig = currentTool ? TOOLS_CONFIG[currentTool] : null;

  if (selectedToolConfig) {
    const Icon = selectedToolConfig.icon;
    return (
      <div className="max-w-4xl mx-auto space-y-8 py-6">
        <div className="glass-panel p-6 sm:p-10 rounded-3xl border border-white/10 space-y-6">
          <div className="flex items-center space-x-3 border-b border-white/10 pb-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Icon className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-100">{selectedToolConfig.title}</h1>
              <p className="text-xs text-slate-400">{selectedToolConfig.desc}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            {selectedToolConfig.features.map((feat, idx) => (
              <div key={idx} className="flex items-center space-x-2 text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>{feat}</span>
              </div>
            ))}
          </div>

          <div className="pt-4 flex flex-col sm:flex-row items-center gap-3">
            <button
              type="button"
              onClick={() => {
                onSelectTab(selectedToolConfig.tab);
                onNavigate('/');
              }}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 flex items-center justify-center space-x-2 transition-all cursor-pointer"
            >
              <span>Launch {selectedToolConfig.tab === 'photo' ? 'Photo AI' : 'Video VSR'} Now</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onNavigate('/tools')}
              className="w-full sm:w-auto px-4 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-white/10 transition-colors"
            >
              Explore All Tools
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 py-6">
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-100">
          NOVA AI Restoration Tools Suite
        </h1>
        <p className="text-xs sm:text-sm text-slate-400">
          Explore specialized AI super-resolution and restoration utilities built with Real-ESRGAN and VSR.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Object.entries(TOOLS_CONFIG).map(([route, tool]) => {
          const Icon = tool.icon;
          return (
            <div
              key={route}
              onClick={() => onNavigate(route)}
              className="glass-panel p-6 rounded-3xl border border-white/10 hover:border-indigo-500/40 transition-all cursor-pointer group space-y-3"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-100 group-hover:text-indigo-300 transition-colors">
                    {tool.title}
                  </h2>
                  <span className="text-[10px] font-mono text-indigo-400 uppercase font-bold">
                    {tool.tab === 'photo' ? 'Photo Engine' : 'Video VSR Engine'}
                  </span>
                </div>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                {tool.desc}
              </p>
              <div className="text-xs font-semibold text-indigo-400 flex items-center space-x-1 pt-1">
                <span>View Tool Details</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

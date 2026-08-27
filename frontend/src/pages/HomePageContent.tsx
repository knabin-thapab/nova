import React from 'react';
import {
  Zap,
  Layers,
  HardDrive,
  Cpu,
  ArrowRight,
  HelpCircle,
  BookOpen,
  Lock
} from 'lucide-react';

interface HomePageContentProps {
  onNavigate: (route: string) => void;
  onSelectTab?: (tab: 'photo' | 'video') => void;
}

export const HomePageContent: React.FC<HomePageContentProps> = ({ onNavigate }) => {
  return (
    <div className="space-y-16 py-8 border-t border-white/10 mt-12">
      {/* SECTION 1: How NOVA Works */}
      <section className="space-y-6">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-100">
            How NOVA Restores Photos & Videos
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            NOVA combines spatial neural super-resolution (Real-ESRGAN RRDBNet) with multi-frame temporal alignment to reconstruct authentic texture without artificial blurring.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-panel p-6 rounded-3xl space-y-3 border border-white/5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold">
              1
            </div>
            <h3 className="text-sm sm:text-base font-bold text-slate-200">Authentic Media Analysis</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Every file is measured on upload for Laplacian variance, high-pass noise standard deviation, and container stream properties. No fake or randomized scores are ever displayed.
            </p>
          </div>

          <div className="glass-panel p-6 rounded-3xl space-y-3 border border-white/5">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 font-bold">
              2
            </div>
            <h3 className="text-sm sm:text-base font-bold text-slate-200">Neural Super-Resolution</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              23-block residual-in-residual dense networks synthesize high-frequency structural edges, text geometry, and natural photographic surfaces on CUDA-accelerated tensor cores.
            </p>
          </div>

          <div className="glass-panel p-6 rounded-3xl space-y-3 border border-white/5">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold">
              3
            </div>
            <h3 className="text-sm sm:text-base font-bold text-slate-200">Smart Resolution & Size Optimization</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Photos are saved in progressive JPEG/WebP (saving up to 65% file size), while videos are encoded in H.264 MP4 with preserved synchronized audio and optimal CRF bitrate.
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 2: Three-Tier Processing Model */}
      <section className="glass-panel p-6 sm:p-10 rounded-3xl border border-white/10 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-100">
              Free-First Multi-Tier Architecture
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Zero mandatory server configuration, with self-hosted control available for power users.
            </p>
          </div>
          <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
            Honest Quota & Capacity
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-surface-elevated/60 border border-white/5 space-y-2">
            <div className="flex items-center space-x-2 text-indigo-300 font-bold">
              <Zap className="w-4 h-4" />
              <span>Tier A: Browser Processing</span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Lightweight format conversions, client-side progressive optimization, and canvas metrics calculation execute directly on your device without upload.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-surface-elevated/60 border border-white/5 space-y-2">
            <div className="flex items-center space-x-2 text-purple-300 font-bold">
              <Cpu className="w-4 h-4" />
              <span>Tier B: Hosted Free AI</span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Our cloud AI worker handles heavy Real-ESRGAN super-resolution automatically for visitors with transparent queue status.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-surface-elevated/60 border border-white/5 space-y-2">
            <div className="flex items-center space-x-2 text-cyan-300 font-bold">
              <HardDrive className="w-4 h-4" />
              <span>Tier C: Self-Hosted Server</span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Connect a private PyTorch backend or free Google Colab GPU for unlimited rendering speeds, custom CRF settings, and maximum privacy.
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 3: Supported Formats & Privacy Assurance */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-panel p-6 rounded-3xl border border-white/5 space-y-4">
          <div className="flex items-center space-x-2 text-slate-200 font-bold text-sm">
            <Layers className="w-4 h-4 text-indigo-400" />
            <span>Supported Media Containers</span>
          </div>
          <div className="space-y-3 text-xs text-slate-400">
            <div>
              <strong className="text-slate-200">Photos:</strong> JPG, JPEG, PNG (with alpha support), WebP, BMP, TIFF, and AVIF.
            </div>
            <div>
              <strong className="text-slate-200">Videos:</strong> MP4 (H.264/H.265), MOV (ProRes/AVC), MKV, WebM (VP9), and AVI.
            </div>
            <div>
              <strong className="text-slate-200">Audio:</strong> Lossless pass-through and synchronized AAC multiplexing.
            </div>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-3xl border border-white/5 space-y-4">
          <div className="flex items-center space-x-2 text-slate-200 font-bold text-sm">
            <Lock className="w-4 h-4 text-emerald-400" />
            <span>Privacy & Ephemeral Storage</span>
          </div>
          <div className="space-y-2 text-xs text-slate-400 leading-relaxed">
            <p>
              NOVA uses an ephemeral storage model. Uploaded files and rendered outputs are stored temporarily in isolated worker memory and automatically purged within 1 hour.
            </p>
            <p>
              No user accounts or signups are required for standard anonymous restoration.
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 4: Frequently Asked Questions */}
      <section className="space-y-6">
        <div className="text-center max-w-xl mx-auto">
          <h2 className="text-xl font-bold text-slate-100">Frequently Asked Questions</h2>
          <p className="text-xs text-slate-400 mt-1">Common questions about AI media restoration and output policies</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-2">
            <h4 className="font-bold text-slate-200 flex items-center space-x-2">
              <HelpCircle className="w-4 h-4 text-indigo-400" />
              <span>Does NOVA invent fake AI details?</span>
            </h4>
            <p className="text-slate-400 leading-relaxed">
              NOVA uses trained structural priors from the Real-ESRGAN and VSR datasets to restore natural high-frequency textures (such as hair, fabric, and sharp architectural edges) while minimizing temporal flicker.
            </p>
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-2">
            <h4 className="font-bold text-slate-200 flex items-center space-x-2">
              <HelpCircle className="w-4 h-4 text-indigo-400" />
              <span>Why does the output have a smaller file size?</span>
            </h4>
            <p className="text-slate-400 leading-relaxed">
              Traditional upscalers export uncompressed raw PNGs or massive unconstrained bitrates. NOVA applies smart progressive compression (JPEG 90q or WebP) and CRF 20 H.264 encoding to deliver superior visual quality per megabyte.
            </p>
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-2">
            <h4 className="font-bold text-slate-200 flex items-center space-x-2">
              <HelpCircle className="w-4 h-4 text-indigo-400" />
              <span>Can I use my own NVIDIA GPU?</span>
            </h4>
            <p className="text-slate-400 leading-relaxed">
              Yes! You can run our Docker container locally or use the free Google Colab T4 GPU notebook. Enter your server URL in the header to get dedicated high-speed processing.
            </p>
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-2">
            <h4 className="font-bold text-slate-200 flex items-center space-x-2">
              <HelpCircle className="w-4 h-4 text-indigo-400" />
              <span>Is my uploaded media stored permanently?</span>
            </h4>
            <p className="text-slate-400 leading-relaxed">
              No. Temporary uploads and outputs are automatically deleted from server disks after 1 hour. You can also click &ldquo;Clear All History&rdquo; to delete files immediately.
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 5: Educational Guides Links */}
      <section className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <BookOpen className="w-5 h-5 text-indigo-400" />
            <h3 className="text-base font-bold text-slate-100">Educational Restoration Guides</h3>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('/guides')}
            className="text-xs text-indigo-300 hover:underline flex items-center space-x-1"
          >
            <span>View All Guides</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
          {[
            {
              route: '/guides/how-ai-video-upscaling-works',
              title: 'How AI Video Upscaling Works',
              desc: 'Understanding temporal alignment, RRDBNet backbones, and artifact removal.'
            },
            {
              route: '/guides/how-to-restore-old-photos',
              title: 'How to Restore Old & Blurry Photos',
              desc: 'Best practices for scanning, deblurring, and natural skin detail preservation.'
            },
            {
              route: '/guides/720p-vs-1080p-video-upscaling',
              title: '720p vs 1080p Video Upscaling',
              desc: 'Optimal resolution scaling targets and bitrates for web streaming.'
            },
          ].map((guide) => (
            <button
              key={guide.route}
              type="button"
              onClick={() => onNavigate(guide.route)}
              className="p-4 rounded-2xl bg-surface-elevated/40 hover:bg-surface-elevated text-left border border-white/5 space-y-1.5 transition-all cursor-pointer group"
            >
              <div className="font-semibold text-slate-200 group-hover:text-indigo-300 transition-colors">
                {guide.title}
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                {guide.desc}
              </p>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
};

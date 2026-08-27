import React from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';

interface GuidesPageProps {
  currentArticle?: string;
  onNavigate: (route: string) => void;
}

export const ARTICLES: Record<string, { title: string; category: string; readTime: string; summary: string; content: React.ReactNode }> = {
  'how-ai-video-upscaling-works': {
    title: 'How AI Video Upscaling Works: A Deep Dive into Neural VSR',
    category: 'Video Engineering',
    readTime: '6 min read',
    summary: 'Explore how deep convolutional backbones and multi-frame temporal alignment reconstruct sub-pixel details without flickering.',
    content: (
      <div className="space-y-6 text-sm text-slate-300 leading-relaxed">
        <p>
          Traditional interpolation methods like bilinear or bicubic scaling calculate new pixels by simply averaging surrounding pixels. While fast, this creates muddy, soft edges and magnifies compression blockiness.
        </p>
        <h3 className="text-base font-bold text-slate-100">1. Spatial Neural Super-Resolution (Real-ESRGAN)</h3>
        <p>
          NOVA leverages <strong>RRDBNet (Residual-in-Residual Dense Block Network)</strong> backbones. Instead of predicting pixels directly, the model maps low-resolution feature tensors across 23 residual blocks, extracting high-frequency gradient information such as hair texture, text sharpness, and fabric weaves.
        </p>
        <h3 className="text-base font-bold text-slate-100">2. Multi-Frame Temporal Consistency (VSR)</h3>
        <p>
          When processing video, enhancing frames independently causes &ldquo;temporal flickering&rdquo; as pixels shift between frames. Video Super-Resolution (VSR) analyzes a sliding window of adjacent frames, utilizing optical flow and feature warping to maintain coherent edge geometry over time.
        </p>
        <h3 className="text-base font-bold text-slate-100">3. Optimized CRF Encoding</h3>
        <p>
          After super-resolution, NOVA encodes the output using H.264 CRF (Constant Rate Factor) encoding with fast-start streaming headers, ensuring the final video maintains pristine visual fidelity without blowing up bandwidth.
        </p>
      </div>
    )
  },
  'how-to-restore-old-photos': {
    title: 'How to Restore Old & Blurry Photos: Complete Workflow',
    category: 'Photo Restoration',
    readTime: '5 min read',
    summary: 'A step-by-step guide to scanning, pre-filtering, and neural super-resolution for vintage and degraded photographs.',
    content: (
      <div className="space-y-6 text-sm text-slate-300 leading-relaxed">
        <p>
          Vintage photographs often suffer from physical grain, color fading, lens defocus blur, and JPEG compression degradation.
        </p>
        <h3 className="text-base font-bold text-slate-100">1. Proper Digital Ingestion</h3>
        <p>
          Scan original physical prints at 300 to 600 DPI in uncompressed PNG or lossless TIFF format. Avoid scanning with aggressive scanner auto-sharpening, as this creates halo artifacts.
        </p>
        <h3 className="text-base font-bold text-slate-100">2. Adaptive Pre-Filtering</h3>
        <p>
          NOVA applies an adaptive bilateral filter to smooth film grain while locking onto high-contrast structural edges. For portrait photos, skin texture is preserved while suppressing sensor noise.
        </p>
        <h3 className="text-base font-bold text-slate-100">3. Real-ESRGAN 4X Super-Resolution</h3>
        <p>
          The neural network synthesizes authentic high-frequency details. Finally, progressive JPEG or WebP optimization produces a lightweight, razor-sharp output file ready for archival and printing.
        </p>
      </div>
    )
  },
  '720p-vs-1080p-video-upscaling': {
    title: '720p vs 1080p Video Upscaling: Smart Target Policies',
    category: 'Video Encoding',
    readTime: '4 min read',
    summary: 'Why blindly upscaling every video to 4K or 8K hurts performance, and how smart resolution targets deliver the best experience.',
    content: (
      <div className="space-y-6 text-sm text-slate-300 leading-relaxed">
        <p>
          A common mistake in video processing is upscaling low-resolution sources directly to 4K or 8K. Upscaling a 360p video 4× produces 1440p, but upscaling a 1080p video 4× results in 4320p (8K)—which creates massive files that mobile devices cannot smoothly decode.
        </p>
        <h3 className="text-base font-bold text-slate-100">NOVA Smart Resolution Targets:</h3>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>360p (640×360)</strong> → Scaled 2× to 720p HD</li>
          <li><strong>480p (854×480)</strong> → Scaled 2× to 960p / 720p</li>
          <li><strong>720p (1280×720)</strong> → Scaled 1.5× to 1080p Full HD</li>
          <li><strong>1080p (1920×1080)</strong> → Enhanced at 1080p with detail refinement or 1440p master</li>
        </ul>
        <p>
          By maintaining source frame rates and targeted spatial dimensions, NOVA preserves battery life and delivers instantaneous video playback.
        </p>
      </div>
    )
  },
  'jpeg-vs-webp': {
    title: 'JPEG vs WebP for AI Restored Photos: Compression Analysis',
    category: 'Image Formats',
    readTime: '5 min read',
    summary: 'Comparing compression efficiency, progressive loading, and perceptual quality metrics for web media delivery.',
    content: (
      <div className="space-y-6 text-sm text-slate-300 leading-relaxed">
        <p>
          After running neural super-resolution, saving images as uncompressed raw PNGs results in massive 15–30 MB files.
        </p>
        <h3 className="text-base font-bold text-slate-100">Why NOVA Uses Progressive JPEG and WebP:</h3>
        <p>
          <strong>Progressive JPEG (Quality 90):</strong> Compresses photographic data efficiently while enabling progressive multipass rendering in web browsers. File sizes decrease by 50–70% with zero perceptible detail loss.
        </p>
        <p>
          <strong>WebP (Quality 88–94):</strong> Supports predictive block compression and full alpha transparency channels, making it ideal for illustrations, 2D art, and transparent overlays.
        </p>
      </div>
    )
  },
  'reduce-video-size-without-losing-quality': {
    title: 'How to Reduce Video Size Without Losing Quality',
    category: 'Compression & Codecs',
    readTime: '5 min read',
    summary: 'Understanding H.264 CRF encoding, temporal prediction, and audio stream pass-through for optimal bandwidth.',
    content: (
      <div className="space-y-6 text-sm text-slate-300 leading-relaxed">
        <p>
          File size in digital video is determined by duration and average bitrate, not resolution alone.
        </p>
        <h3 className="text-base font-bold text-slate-100">1. Constant Rate Factor (CRF)</h3>
        <p>
          Constant Bitrate (CBR) wastes bandwidth on static scenes while starving complex motion scenes. NOVA uses <strong>CRF 19–22</strong>, dynamically allocating bits where detail is needed while compressing uniform backgrounds.
        </p>
        <h3 className="text-base font-bold text-slate-100">2. Fast-Start Container Flags</h3>
        <p>
          By writing the container metadata index (<code>moov atom</code>) at the start of the MP4 file (<code>-movflags +faststart</code>), videos start playing immediately without waiting for the full file to download.
        </p>
      </div>
    )
  }
};

export const GuidesPage: React.FC<GuidesPageProps> = ({ currentArticle, onNavigate }) => {
  const article = currentArticle ? ARTICLES[currentArticle] : null;

  if (article && currentArticle) {
    return (
      <div className="max-w-3xl mx-auto space-y-8 py-6">
        <button
          type="button"
          onClick={() => onNavigate('/guides')}
          className="flex items-center space-x-2 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Guides</span>
        </button>

        <article className="glass-panel p-6 sm:p-10 rounded-3xl border border-white/10 space-y-6">
          <div className="space-y-2 border-b border-white/10 pb-4">
            <div className="flex items-center space-x-2 text-xs">
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 font-semibold border border-indigo-500/20">
                {article.category}
              </span>
              <span className="text-slate-400 font-mono">{article.readTime}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-100 leading-tight">
              {article.title}
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              {article.summary}
            </p>
          </div>

          <div className="pt-2">{article.content}</div>

          {/* Interactive CTA to try tool */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-950/50 to-purple-950/50 border border-indigo-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="font-bold text-slate-100 text-xs sm:text-sm">Try NOVA AI Media Restoration</div>
              <p className="text-[11px] text-slate-400">Enhance your photos and videos with real AI processing now.</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('/')}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 flex items-center space-x-1.5 transition-all"
            >
              <span>Open Tool</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </article>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 py-6">
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-100">
          Media Restoration & Upscaling Guides
        </h1>
        <p className="text-xs sm:text-sm text-slate-400">
          In-depth technical guides covering neural super-resolution, video temporal consistency, and size optimization.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Object.entries(ARTICLES).map(([slug, item]) => (
          <div
            key={slug}
            onClick={() => onNavigate(`/guides/${slug}`)}
            className="glass-panel p-6 rounded-3xl border border-white/10 hover:border-indigo-500/40 transition-all cursor-pointer group space-y-3"
          >
            <div className="flex items-center justify-between text-xs">
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 font-semibold border border-indigo-500/20">
                {item.category}
              </span>
              <span className="text-slate-400 font-mono text-[11px]">{item.readTime}</span>
            </div>
            <h2 className="text-base font-bold text-slate-100 group-hover:text-indigo-300 transition-colors">
              {item.title}
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              {item.summary}
            </p>
            <div className="text-xs font-semibold text-indigo-400 flex items-center space-x-1 pt-1">
              <span>Read Guide</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

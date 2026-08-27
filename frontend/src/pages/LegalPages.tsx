import React from 'react';
import { Mail, FileText, Info, Lock } from 'lucide-react';

interface LegalPageProps {
  type: 'about' | 'privacy' | 'terms' | 'contact';
  onNavigate?: (route: string) => void;
}

export const LegalPages: React.FC<LegalPageProps> = ({ type }) => {
  if (type === 'about') {
    return (
      <div className="max-w-3xl mx-auto space-y-8 py-6">
        <div className="glass-panel p-6 sm:p-10 rounded-3xl border border-white/10 space-y-6">
          <div className="flex items-center space-x-3 border-b border-white/10 pb-4">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Info className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-100">About NOVA AI</h1>
              <p className="text-xs text-slate-400">Production AI Photo & Video Restoration Platform</p>
            </div>
          </div>

          <div className="space-y-4 text-xs sm:text-sm text-slate-300 leading-relaxed">
            <p>
              NOVA was engineered to bridge the gap between high-end academic neural restoration models and consumer accessibility. Our platform provides genuine super-resolution and temporal video restoration with a free-first, privacy-respecting architecture.
            </p>
            <h3 className="text-sm sm:text-base font-bold text-slate-100">Our Core Principles:</h3>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Authentic Processing:</strong> We do not use simulated or fake random metrics. All analysis is mathematically calculated from input media.</li>
              <li><strong>Zero Mandatory Setup:</strong> Standard users can enhance media immediately using browser and hosted cloud tiers without server configurations.</li>
              <li><strong>Power User Freedom:</strong> Creators and engineers can connect their own NVIDIA GPU servers for unlimited rendering and complete private control.</li>
              <li><strong>Ephemeral Privacy:</strong> Uploaded media is processed in temporary worker storage and purged automatically within 1 hour.</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  if (type === 'privacy') {
    return (
      <div className="max-w-3xl mx-auto space-y-8 py-6">
        <div className="glass-panel p-6 sm:p-10 rounded-3xl border border-white/10 space-y-6">
          <div className="flex items-center space-x-3 border-b border-white/10 pb-4">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-100">Privacy Policy</h1>
              <p className="text-xs text-slate-400">Last updated: August 2026</p>
            </div>
          </div>

          <div className="space-y-4 text-xs sm:text-sm text-slate-300 leading-relaxed">
            <h3 className="text-sm sm:text-base font-bold text-slate-100">1. Temporary Media Handling</h3>
            <p>
              When you upload photos or videos to NOVA for AI restoration, files are saved to ephemeral storage solely for the duration of inference and downloading. Uploaded media is automatically purged after 1 hour. You may also click &ldquo;Clear All History&rdquo; in the application at any time to trigger immediate deletion.
            </p>

            <h3 className="text-sm sm:text-base font-bold text-slate-100">2. No Account or Personal Data Requirement</h3>
            <p>
              Standard restoration services operate anonymously without requiring user registration, email addresses, or personal profiling.
            </p>

            <h3 className="text-sm sm:text-base font-bold text-slate-100">3. Cookies and Advertising Disclosure</h3>
            <p>
              NOVA may use essential browser storage (such as LocalStorage and IndexedDB) strictly to store user preferences and temporary session history on your device. Third-party partners, including Google AdSense and analytics providers, may serve cookies to analyze traffic and display relevant, non-intrusive advertisements in compliance with standard publisher guidelines.
            </p>

            <h3 className="text-sm sm:text-base font-bold text-slate-100">4. Third-Party Neural Workers</h3>
            <p>
              When using hosted free AI processing tiers, media requests are processed through secured, transient inference containers. Media is never used for training models without explicit consent.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (type === 'terms') {
    return (
      <div className="max-w-3xl mx-auto space-y-8 py-6">
        <div className="glass-panel p-6 sm:p-10 rounded-3xl border border-white/10 space-y-6">
          <div className="flex items-center space-x-3 border-b border-white/10 pb-4">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-100">Terms of Service</h1>
              <p className="text-xs text-slate-400">Last updated: August 2026</p>
            </div>
          </div>

          <div className="space-y-4 text-xs sm:text-sm text-slate-300 leading-relaxed">
            <h3 className="text-sm sm:text-base font-bold text-slate-100">1. Acceptable Use</h3>
            <p>
              You agree not to use NOVA to process, generate, or upscale illegal, abusive, infringing, or harmful media. Automated abuse or denial-of-service attempts against public GPU workers is strictly prohibited.
            </p>

            <h3 className="text-sm sm:text-base font-bold text-slate-100">2. Disclaimers & AI Reconstructions</h3>
            <p>
              AI super-resolution synthesizes high-frequency details based on neural network models. NOVA is provided &ldquo;as is&rdquo; without warranties of exact historical or forensic pixel accuracy.
            </p>

            <h3 className="text-sm sm:text-base font-bold text-slate-100">3. Intellectual Property</h3>
            <p>
              You retain all rights and ownership of your original uploaded media and the resulting restored outputs.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 py-6">
      <div className="glass-panel p-6 sm:p-10 rounded-3xl border border-white/10 space-y-6">
        <div className="flex items-center space-x-3 border-b border-white/10 pb-4">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-100">Contact NOVA Support</h1>
            <p className="text-xs text-slate-400">Get in touch with our engineering & support team</p>
          </div>
        </div>

        <div className="space-y-4 text-xs sm:text-sm text-slate-300 leading-relaxed">
          <p>
            Have questions about self-hosting, GPU worker integrations, API licensing, or privacy compliance?
          </p>
          <div className="p-4 rounded-2xl bg-surface-elevated/60 border border-white/5 space-y-2">
            <div className="text-slate-400 text-xs">General & Support Inquiries:</div>
            <div className="font-mono text-sm text-indigo-300 font-bold">support@novarestore.ai</div>
            <div className="text-slate-400 text-xs mt-2">Open-Source Repository & Issues:</div>
            <div className="font-mono text-xs text-slate-300">github.com/novarestore/nova</div>
          </div>
        </div>
      </div>
    </div>
  );
};

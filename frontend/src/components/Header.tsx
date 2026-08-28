import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Globe,
  Zap,
  Server,
  Menu,
  X,
  BookOpen,
  HelpCircle,
  Info,
  Shield,
  Layers,
  Image as ImageIcon,
  RotateCcw,
  CheckCircle2
} from 'lucide-react';
import { SystemTelemetry } from '../types';
import { getBackendUrl, setCustomBackendUrl, checkBackendHealth } from '../services/api';
import { ColabGuideModal } from './ColabGuideModal';

interface HeaderProps {
  telemetry?: SystemTelemetry | null;
  activeJobStatus?: string;
  onServerChange?: () => void;
  isServerModalOpen?: boolean;
  setIsServerModalOpen?: (open: boolean) => void;
  isColabModalOpen?: boolean;
  setIsColabModalOpen?: (open: boolean) => void;
  currentRoute?: string;
  onNavigate?: (route: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  onServerChange,
  isServerModalOpen: extServerModalOpen,
  setIsServerModalOpen: extSetServerModalOpen,
  isColabModalOpen: extColabModalOpen,
  setIsColabModalOpen: extSetColabModalOpen,
  currentRoute = '/',
  onNavigate,
}) => {
  const [internalServerModalOpen, setInternalServerModalOpen] = useState(false);
  const [internalColabModalOpen, setInternalColabModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isServerModalOpen = extServerModalOpen !== undefined ? extServerModalOpen : internalServerModalOpen;
  const setIsServerModalOpen = extSetServerModalOpen || setInternalServerModalOpen;

  const isColabModalOpen = extColabModalOpen !== undefined ? extColabModalOpen : internalColabModalOpen;
  const setIsColabModalOpen = extSetColabModalOpen || setInternalColabModalOpen;

  const [serverUrlInput, setServerUrlInput] = useState('');
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const currentUrl = getBackendUrl();

  useEffect(() => {
    setServerUrlInput(currentUrl);
    checkBackendHealth().then((h) => {
      setBackendStatus(h.isOnline ? 'online' : 'offline');
    });
  }, [currentUrl, isServerModalOpen]);

  const handleSaveServer = (e: React.FormEvent) => {
    e.preventDefault();
    setCustomBackendUrl(serverUrlInput);
    setIsServerModalOpen(false);
    if (onServerChange) {
      onServerChange();
    } else {
      window.location.reload();
    }
  };

  const handleResetToDefault = () => {
    setCustomBackendUrl(null);
    setServerUrlInput('');
    setIsServerModalOpen(false);
    if (onServerChange) {
      onServerChange();
    } else {
      window.location.reload();
    }
  };

  const navLinks = [
    { id: '/', label: 'Restoration', icon: Zap },
    { id: '/photo-enhancer', label: 'Photo AI', icon: ImageIcon },
    { id: '/video-restoration', label: 'Video VSR', icon: Layers },
    { id: '/tools', label: 'Tools', icon: Layers },
    { id: '/guides', label: 'Guides', icon: BookOpen },
    { id: '/docs/self-hosted', label: 'Self-Hosted', icon: Server },
    { id: '/faq', label: 'FAQ', icon: HelpCircle },
    { id: '/about', label: 'About', icon: Info },
  ];

  return (
    <>
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#090b10]/95 backdrop-blur-xl px-3 sm:px-6 py-2.5 sm:py-3 w-full">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4 w-full">
        {/* Brand Logo & Title */}
        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-shrink-0">
          <button
            type="button"
            onClick={() => onNavigate?.('/')}
            className="flex items-center space-x-2 sm:space-x-2.5 text-left cursor-pointer group"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-cyan-500 p-0.5 shadow-lg shadow-indigo-500/25 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-[#090b10] rounded-[10px] flex items-center justify-center">
                <Zap className="w-4 h-4 text-indigo-400 fill-indigo-400/20" />
              </div>
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-1.5">
                <span className="text-base sm:text-lg font-black tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent leading-none">
                  NOVA
                </span>
                <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 leading-none">
                  AI
                </span>
              </div>
              <p className="hidden md:block text-[10px] text-slate-400 truncate mt-0.5">
                Real AI Photo & Video Restoration
              </p>
            </div>
          </button>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center space-x-1 text-xs">
          {navLinks.map((link) => {
            const isActive = currentRoute === link.id;
            return (
              <button
                key={link.id}
                type="button"
                onClick={() => onNavigate?.(link.id)}
                className={`px-2.5 py-1.5 rounded-lg transition-colors font-medium cursor-pointer ${
                  isActive
                    ? 'text-indigo-300 bg-indigo-500/10 border border-indigo-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                {link.label}
              </button>
            );
          })}
        </nav>

        {/* Right Section: Status Indicator, Server Connect, Mobile Menu Toggle */}
        <div className="flex items-center space-x-1.5 sm:space-x-2 flex-shrink-0">
          {/* Status Badge */}
          <div
            className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-surface-elevated border border-white/5 text-[11px] font-medium cursor-pointer hover:bg-white/5 transition-colors"
            onClick={() => setIsServerModalOpen(true)}
            title={backendStatus === 'online' ? 'NOVA AI Backend Connected' : 'Free Hosted AI Mode Active'}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                backendStatus === 'online' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`}
            />
            <span className="text-slate-300 text-[11px]">
              {backendStatus === 'online' ? 'AI Ready' : 'Connecting'}
            </span>
          </div>

          {/* Colab / Free GPU Modal Trigger */}
          <button
            type="button"
            onClick={() => setIsColabModalOpen(true)}
            className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-500/10 to-orange-500/10 hover:from-amber-500/20 hover:to-orange-500/20 border border-amber-500/30 text-[11px] text-amber-300 font-semibold transition-all cursor-pointer"
            title="Free Google Colab T4 GPU Script"
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Colab GPU</span>
          </button>

          {/* Server Config Modal Trigger */}
          <button
            type="button"
            onClick={() => setIsServerModalOpen(true)}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-surface-elevated hover:bg-white/10 border border-white/10 text-[11px] text-slate-300 transition-all cursor-pointer"
            title="Configure Backend Server URL"
          >
            <Globe className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Server</span>
          </button>

          {/* Mobile Hamburger Menu Button */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-1.5 rounded-lg bg-surface-elevated hover:bg-white/10 border border-white/10 text-slate-300"
            aria-label="Toggle navigation menu"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden border-t border-white/10 mt-2.5 pt-3 pb-2 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="grid grid-cols-2 gap-1.5">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = currentRoute === link.id;
              return (
                <button
                  key={link.id}
                  type="button"
                  onClick={() => {
                    onNavigate?.(link.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`flex items-center space-x-2 px-3 py-2.5 rounded-xl text-xs font-medium text-left cursor-pointer transition-all ${
                    isActive
                      ? 'bg-indigo-600/20 border border-indigo-500/30 text-indigo-200'
                      : 'bg-surface-elevated/60 text-slate-300 hover:bg-surface-elevated'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                  <span className="truncate">{link.label}</span>
                </button>
              );
            })}
          </div>

          <div className="pt-2 flex items-center justify-between border-t border-white/5 text-[11px] text-slate-400">
            <button
              type="button"
              onClick={() => {
                setIsServerModalOpen(true);
                setIsMobileMenuOpen(false);
              }}
              className="text-indigo-300 hover:underline flex items-center space-x-1"
            >
              <Globe className="w-3 h-3" />
              <span>Server Settings</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setIsColabModalOpen(true);
                setIsMobileMenuOpen(false);
              }}
              className="text-amber-400 hover:underline flex items-center space-x-1"
            >
              <Zap className="w-3 h-3" />
              <span>Free Colab GPU</span>
            </button>
          </div>
        </div>
      )}

      {/* Colab Modal */}
      {isColabModalOpen && (
        <ColabGuideModal isOpen={isColabModalOpen} onClose={() => setIsColabModalOpen(false)} />
      )}
    </header>

    {/* Server Config Modal — rendered via portal to document.body so it is never clipped
        by the header's backdrop-filter stacking context */}
    {isServerModalOpen && typeof document !== 'undefined' && createPortal(
      <div
        className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        onClick={() => setIsServerModalOpen(false)}
      >
        {/* Mobile bottom-sheet / Desktop centered panel */}
        <div
          className="w-full sm:max-w-md bg-[#0f1219] sm:rounded-2xl rounded-t-2xl p-5 pb-8 sm:p-6 space-y-5 border-t sm:border border-white/10 shadow-2xl overflow-y-auto animate-in fade-in sm:zoom-in-95 slide-in-from-bottom-4 sm:slide-in-from-bottom-0 duration-200"
          style={{
            maxHeight: 'calc(100dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 16px)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Drag Handle (Mobile only) */}
          <div className="flex justify-center sm:hidden">
            <div className="w-10 h-1 rounded-full bg-white/20" />
          </div>

          {/* Header Row */}
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center text-indigo-400 flex-shrink-0">
                <Server className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">AI Backend Server</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Connect your AI processing backend</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsServerModalOpen(false)}
              className="p-2 -mr-1 -mt-1 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer flex-shrink-0"
              aria-label="Close server config"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSaveServer} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 block">
                Backend Server URL
              </label>
              <input
                type="url"
                value={serverUrlInput}
                onChange={(e) => setServerUrlInput(e.target.value)}
                placeholder="https://username-spacename.hf.space"
                className="w-full px-4 py-3 rounded-xl bg-[#1a1f2e] border border-white/10 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 focus:outline-none text-sm font-mono text-slate-200 placeholder:text-slate-600 transition-colors"
              />
              <p className="text-[11px] text-slate-400 leading-relaxed">
                💡 <b>Hugging Face Spaces:</b> Use <code className="text-indigo-300 font-mono">https://username-spacename.hf.space</code>. Make sure Space visibility is <b>Public</b> in Space Settings (Private Spaces return 403 Forbidden).
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-2.5">
              <button
                type="submit"
                id="server-modal-save-btn"
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-sm font-bold shadow-lg shadow-indigo-600/25 transition-all cursor-pointer flex items-center justify-center space-x-2 active:scale-[0.98]"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Save &amp; Connect</span>
              </button>
              <button
                type="button"
                id="server-modal-reset-btn"
                onClick={handleResetToDefault}
                className="w-full py-3 px-4 rounded-xl bg-[#1a1f2e] hover:bg-[#222838] text-slate-300 text-sm font-semibold border border-white/10 transition-colors flex items-center justify-center space-x-2 cursor-pointer active:scale-[0.98]"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reset to Default</span>
              </button>
            </div>
          </form>

          {/* Status Info & Mobile Share */}
          <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/20 space-y-2.5">
            <div className="flex items-start space-x-3">
              <Shield className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <div className="font-semibold text-emerald-200 text-xs">Free Cloud AI Active</div>
                <p className="text-slate-400 text-[11px] leading-relaxed mt-0.5 break-all">
                  Connected: <span className="text-emerald-300 font-mono">{serverUrlInput || 'Default Cloud AI'}</span>
                </p>
              </div>
            </div>

            {serverUrlInput && (
              <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-2 text-[11px]">
                <span className="text-slate-400">Share to phone:</span>
                <button
                  type="button"
                  onClick={() => {
                    const shareUrl = `${window.location.origin}?backend=${encodeURIComponent(serverUrlInput)}`;
                    navigator.clipboard.writeText(shareUrl);
                    alert('Copied! Open this URL on your mobile browser to connect automatically.');
                  }}
                  className="px-2.5 py-1 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/30 font-medium cursor-pointer transition-colors"
                >
                  Copy Mobile Share Link
                </button>
              </div>
            )}
          </div>
        </div>
      </div>,
      document.body
    )}
  </>
  );
};

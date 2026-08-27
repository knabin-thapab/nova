import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Terminal, Copy, Check, ExternalLink, X, Zap, ShieldCheck, Server, RefreshCw, AlertCircle } from 'lucide-react';
import { getBackendUrl, setCustomBackendUrl } from '../services/api';

interface ColabGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnected?: () => void;
}

export const COLAB_GPU_CODE = `# =========================================================
#   NOVA AI Ultra-Fast Tesla GPU Cloud Backend Launcher
#   (100% Free • Zero Setup • Real Real-ESRGAN & VSR AI)
# =========================================================

# 1. Install dependencies & clone NOVA repository
!pip install -q fastapi "uvicorn[standard]" websockets python-multipart opencv-python-headless pillow imageio imageio-ffmpeg psutil
!rm -rf /content/nova && git clone https://github.com/knabin-thapab/nova.git /content/nova
!mkdir -p /content/nova/backend/pipeline/weights

# 2. Download official Real-ESRGAN weights (Photo & Anime)
!wget -q -nc -O /content/nova/backend/pipeline/weights/RealESRGAN_x4plus.pth https://github.com/xinntao/Real-ESRGAN/releases/download/v0.1.0/RealESRGAN_x4plus.pth
!wget -q -nc -O /content/nova/backend/pipeline/weights/RealESRGAN_x4plus_anime_6B.pth https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.2.4/RealESRGAN_x4plus_anime_6B.pth

# 3. Install Cloudflare Tunnel client
!wget -q -nc https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb && dpkg -i cloudflared-linux-amd64.deb > /dev/null 2>&1

# 4. Launch FastAPI Backend on GPU
import os
import sys
import time
import subprocess
import re
import urllib.request

print("\\n🚀 Starting NOVA GPU AI Backend...")
server = subprocess.Popen(
    [sys.executable, "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"],
    cwd="/content/nova/backend"
)

# 5. Verify local health
time.sleep(3)
for _ in range(15):
    try:
        urllib.request.urlopen("http://127.0.0.1:8000/api/health", timeout=2)
        print("✅ NOVA GPU Engine is ONLINE!")
        break
    except Exception:
        time.sleep(1)

# 6. Start Cloudflare Public Tunnel
print("🌐 Opening Cloudflare Public Tunnel...")
tunnel = subprocess.Popen(
    ["cloudflared", "tunnel", "--url", "http://127.0.0.1:8000"],
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    bufsize=1
)

# 7. Print Live URL clearly
for line in iter(tunnel.stderr.readline, ""):
    match = re.search(r'https://[a-zA-Z0-9-]+\\.trycloudflare\\.com', line)
    if match:
        full_url = match.group(0)
        print("\\n" + "="*58)
        print(f"🎉 YOUR LIVE BACKEND URL:\\n👉 {full_url}")
        print("="*58 + "\\n")
        print("Copy the URL above and paste it into the NOVA web app!")
        break

server.wait()
`;

export const ColabGuideModal: React.FC<ColabGuideModalProps> = ({ isOpen, onClose, onConnected }) => {
  const [copied, setCopied] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const currentBackend = getBackendUrl();

  useEffect(() => {
    if (isOpen) {
      setUrlInput(currentBackend || '');
      setTestResult(null);
    }
  }, [isOpen, currentBackend]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(COLAB_GPU_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleConnectUrl = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = urlInput.trim().replace(/\/$/, '');
    if (!clean) {
      setTestResult({ success: false, message: 'Please enter a valid URL (e.g. https://xxx.trycloudflare.com)' });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(`${clean}/api/health`, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        setCustomBackendUrl(clean);
        setTestResult({ success: true, message: 'GPU Server Connected Successfully!' });
        setTimeout(() => {
          if (onConnected) {
            onConnected();
          } else {
            window.location.reload();
          }
        }, 800);
      } else {
        setTestResult({ success: false, message: `Server responded with HTTP ${res.status}. Check if Colab is still running.` });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: 'Could not reach server. Verify that your Google Colab cell is currently active (▶ running).'
      });
    } finally {
      setIsTesting(false);
    }
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md flex items-center justify-center overflow-y-auto"
      style={{
        padding: 'max(12px, env(safe-area-inset-top)) max(12px, env(safe-area-inset-right)) max(12px, env(safe-area-inset-bottom)) max(12px, env(safe-area-inset-left))',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative bg-[#0d121f] border border-white/15 rounded-3xl p-5 sm:p-7 max-w-2xl w-full shadow-2xl space-y-4 overflow-y-auto animate-in fade-in zoom-in-95 duration-200"
        style={{
          maxHeight: 'calc(100dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 24px)',
        }}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-white/10 pb-3.5">
          <div className="flex items-start space-x-3 min-w-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 flex-shrink-0 shadow-lg shadow-amber-500/10">
              <Zap className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-slate-100 leading-snug">
                  Free Google Colab GPU Setup
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold">
                  100% FREE • Tesla T4 GPU
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
                Supercharge video & photo restoration with free cloud GPU
              </p>
            </div>
          </div>

          {/* Prominent Cross Button */}
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 border border-transparent hover:border-white/10 transition-all cursor-pointer flex-shrink-0 ml-2"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3 Simple Steps */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
          <div className="p-3 rounded-2xl bg-surface-elevated/80 border border-white/5 space-y-1">
            <div className="font-bold text-indigo-400 flex items-center space-x-1.5">
              <span className="w-5 h-5 rounded-full bg-indigo-500/20 flex items-center justify-center text-[11px]">1</span>
              <span>Open Colab</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Select <b>T4 GPU</b> runtime in Google Colab.
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-surface-elevated/80 border border-white/5 space-y-1">
            <div className="font-bold text-amber-400 flex items-center space-x-1.5">
              <span className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center text-[11px]">2</span>
              <span>Paste & Run</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Paste script below & click <b>Run (▶)</b>.
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-surface-elevated/80 border border-white/5 space-y-1">
            <div className="font-bold text-emerald-400 flex items-center space-x-1.5">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-[11px]">3</span>
              <span>Connect URL</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Paste the Cloudflare URL below & connect.
            </p>
          </div>
        </div>

        {/* Direct Connect URL Form */}
        <div className="p-3.5 rounded-2xl bg-indigo-950/30 border border-indigo-500/20 space-y-2.5">
          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-200">
            <Server className="w-4 h-4 text-indigo-400" />
            <span>Connect Live Colab Cloudflare URL</span>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="e.g. https://xxx.trycloudflare.com"
              className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-slate-100 text-xs font-mono focus:outline-none focus:border-indigo-500"
            />
            <button
              type="button"
              disabled={isTesting}
              onClick={() => handleConnectUrl()}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-95 text-white font-semibold text-xs flex items-center justify-center space-x-1.5 shadow-lg shadow-indigo-600/30 disabled:opacity-50 cursor-pointer flex-shrink-0"
            >
              {isTesting ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              <span>{isTesting ? 'Testing...' : 'Save & Connect'}</span>
            </button>
          </div>

          {testResult && (
            <div
              className={`p-2.5 rounded-xl text-xs flex items-center space-x-2 ${
                testResult.success
                  ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-semibold'
                  : 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
              }`}
            >
              {testResult.success ? (
                <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              )}
              <span>{testResult.message}</span>
            </div>
          )}

          {/* Share Connection Link (e.g. Laptop to Mobile) */}
          <div className="pt-1 flex flex-wrap items-center justify-between gap-2 border-t border-white/5 text-[11px] text-slate-400">
            <span>Share connected backend to phone:</span>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => {
                  const shareUrl = `${window.location.origin}?backend=${encodeURIComponent(urlInput.trim() || currentBackend || '')}`;
                  navigator.clipboard.writeText(shareUrl);
                  alert('Shareable link copied! Open this on your phone to connect automatically.');
                }}
                className="px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 font-medium cursor-pointer transition-colors"
              >
                Copy Mobile Link
              </button>
              <a
                href={`https://api.whatsapp.com/send?text=${encodeURIComponent('Open NOVA with Colab GPU connected: ' + window.location.origin + '?backend=' + encodeURIComponent(urlInput.trim() || currentBackend || ''))}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/20 font-medium cursor-pointer transition-colors"
              >
                Send via WhatsApp
              </a>
            </div>
          </div>
        </div>

        {/* Code Snippet Box with 1-Click Copy */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-xs font-semibold text-slate-300">
              <Terminal className="w-4 h-4 text-cyan-400" />
              <span>One-Click Colab Script</span>
            </div>
            <button
              onClick={handleCopy}
              className={`px-3.5 py-1.5 rounded-xl font-semibold text-xs flex items-center space-x-1.5 transition-all cursor-pointer shadow-lg ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30'
              }`}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied to Clipboard!' : 'Copy Script'}</span>
            </button>
          </div>

          <div className="relative rounded-2xl bg-[#06080e] border border-white/10 p-3.5 max-h-[170px] overflow-y-auto font-mono text-[11px] text-slate-300 leading-relaxed scrollbar-thin">
            <pre className="whitespace-pre-wrap">{COLAB_GPU_CODE}</pre>
          </div>
        </div>

        {/* Security & Privacy Guarantee */}
        <div className="p-3 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 flex items-start space-x-2.5 text-xs text-emerald-400">
          <ShieldCheck className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-semibold text-emerald-300">100% Safe & Cloud-Accelerated:</span>
            <p className="text-[11px] text-slate-400 leading-normal">
              Processes your media on a dedicated GPU instance. No data is stored or logged.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-1">
          <a
            href="https://colab.research.google.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-surface-elevated hover:bg-white/10 text-slate-200 border border-white/10 text-xs font-semibold flex items-center justify-center space-x-2 transition-all cursor-pointer"
          >
            <span>Open Google Colab</span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
          </a>

          <button
            onClick={handleCopy}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 via-orange-600 to-indigo-600 hover:opacity-95 text-white text-xs font-bold flex items-center justify-center space-x-2 shadow-xl shadow-orange-600/20 cursor-pointer"
          >
            <Zap className="w-4 h-4 fill-white/20" />
            <span>{copied ? 'Code Copied!' : 'Copy Script & Start'}</span>
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
};

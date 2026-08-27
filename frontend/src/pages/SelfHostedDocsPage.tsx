import React, { useState } from 'react';
import { Server, Terminal, Cpu, Shield, Check, Copy } from 'lucide-react';

interface SelfHostedDocsPageProps {
  onNavigate?: (route: string) => void;
}

export const SelfHostedDocsPage: React.FC<SelfHostedDocsPageProps> = () => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedSection(id);
    setTimeout(() => setCopiedSection(null), 2500);
  };

  const dockerCommand = `docker run -d \\
  --gpus all \\
  -p 8000:8000 \\
  -v nova_storage:/app/storage \\
  --name nova-ai-worker \\
  ghcr.io/novarestore/nova-backend:latest`;

  const localPythonCommand = `# 1. Clone & create virtual environment
git clone https://github.com/novarestore/nova.git
cd nova/backend
python -m venv venv
source venv/bin/activate  # Or .\\venv\\Scripts\\activate on Windows

# 2. Install PyTorch & dependencies
pip install -r requirements.txt

# 3. Launch FastAPI backend
uvicorn main:app --host 0.0.0.0 --port 8000`;

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-6">
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <div className="w-10 h-10 mx-auto rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
          <Server className="w-5 h-5" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-100">
          Self-Hosted NOVA AI Server Setup
        </h1>
        <p className="text-xs sm:text-sm text-slate-400">
          Deploy your own private GPU inference server for dedicated rendering speeds, higher limits, and complete data sovereignty.
        </p>
      </div>

      {/* Hardware Requirements */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 space-y-4">
        <h2 className="text-base font-bold text-slate-100 flex items-center space-x-2">
          <Cpu className="w-4 h-4 text-cyan-400" />
          <span>Recommended Hardware Specifications</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-3.5 rounded-2xl bg-surface-elevated/60 border border-white/5 space-y-1">
            <div className="text-slate-400 font-medium">GPU (NVIDIA CUDA)</div>
            <div className="font-bold text-slate-200">RTX 3060 / T4 (6GB+ VRAM)</div>
            <div className="text-[11px] text-slate-400">FP16 tensor core acceleration</div>
          </div>
          <div className="p-3.5 rounded-2xl bg-surface-elevated/60 border border-white/5 space-y-1">
            <div className="text-slate-400 font-medium">System RAM</div>
            <div className="font-bold text-slate-200">8 GB – 16 GB+</div>
            <div className="text-[11px] text-slate-400">For multi-frame video caching</div>
          </div>
          <div className="p-3.5 rounded-2xl bg-surface-elevated/60 border border-white/5 space-y-1">
            <div className="text-slate-400 font-medium">CPU Fallback</div>
            <div className="font-bold text-slate-200">4+ Cores (AVX2)</div>
            <div className="text-[11px] text-slate-400">PyTorch multi-threading supported</div>
          </div>
        </div>
      </div>

      {/* Option A: Docker */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-100 flex items-center space-x-2">
            <Terminal className="w-4 h-4 text-indigo-400" />
            <span>Option 1: Docker Deployment (Recommended)</span>
          </h2>
          <button
            type="button"
            onClick={() => copyCode(dockerCommand, 'docker')}
            className="px-3 py-1 rounded-xl bg-surface-elevated hover:bg-slate-800 border border-white/10 text-xs text-slate-300 flex items-center space-x-1"
          >
            {copiedSection === 'docker' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedSection === 'docker' ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
        <pre className="p-4 rounded-2xl bg-black/80 text-indigo-300 font-mono text-xs overflow-x-auto border border-white/5">
          {dockerCommand}
        </pre>
      </div>

      {/* Option B: Local Python */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-100 flex items-center space-x-2">
            <Terminal className="w-4 h-4 text-purple-400" />
            <span>Option 2: Native Python Setup</span>
          </h2>
          <button
            type="button"
            onClick={() => copyCode(localPythonCommand, 'python')}
            className="px-3 py-1 rounded-xl bg-surface-elevated hover:bg-slate-800 border border-white/10 text-xs text-slate-300 flex items-center space-x-1"
          >
            {copiedSection === 'python' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedSection === 'python' ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
        <pre className="p-4 rounded-2xl bg-black/80 text-purple-300 font-mono text-xs overflow-x-auto border border-white/5">
          {localPythonCommand}
        </pre>
      </div>

      {/* Connecting Back to Frontend */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 space-y-4">
        <h2 className="text-base font-bold text-slate-100 flex items-center space-x-2">
          <Shield className="w-4 h-4 text-emerald-400" />
          <span>Connecting Your Server to the Web Interface</span>
        </h2>
        <ol className="list-decimal pl-5 space-y-2 text-xs text-slate-300 leading-relaxed">
          <li>Ensure your server is accessible via LAN or a secure tunnel (e.g., <code>ngrok http 8000</code> or Cloudflare Tunnel).</li>
          <li>Click &ldquo;Server Setup&rdquo; in the NOVA top navigation bar.</li>
          <li>Paste your public or local server URL (e.g., <code>https://xxxx.ngrok-free.app</code> or <code>http://127.0.0.1:8000</code>) and click &ldquo;Save & Connect Server&rdquo;.</li>
          <li>The live hardware telemetry widget in NOVA will immediately reflect your GPU and VRAM metrics.</li>
        </ol>
      </div>
    </div>
  );
};

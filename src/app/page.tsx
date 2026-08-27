"use client";

import { useNovaStore } from "@/store/nova-store";
import { NovaHeader } from "@/components/nova/nova-header";
import { VideoDropzone } from "@/components/nova/video-dropzone";
import DiagnosisPanel from "@/components/nova/diagnosis-panel";
import { PipelineVisualizer } from "@/components/nova/pipeline-visualizer";
import ProcessingMonitor from "@/components/nova/processing-monitor";
import { ComparisonViewer } from "@/components/nova/comparison-viewer";
import { PresetSelector, OutputConfigPanel } from "@/components/nova/config-panel";
import { QualityMetricsPanel, EnhanceButton } from "@/components/nova/quality-metrics";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Brain, FileVideo2 } from "lucide-react";

function AnalyzingState() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-6"
      >
        <div className="relative">
          <div className="w-24 h-24 rounded-full border-2 border-primary/20 flex items-center justify-center">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
          </div>
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-primary/40"
            animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Analyzing Video</h2>
          <p className="text-muted-foreground text-sm max-w-md">
            Running AI diagnosis to detect compression artifacts, noise, blur, faces,
            text regions, and lighting conditions...
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
          <Brain className="w-3.5 h-3.5 text-primary" />
          <span>Multi-frame analysis engine active</span>
        </div>
      </motion.div>
    </div>
  );
}

function UploadingState() {
  const video = useNovaStore((s) => s.video);
  return (
    <div className="flex-1 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-6"
      >
        <div className="w-24 h-24 rounded-full border-2 border-primary/20 flex items-center justify-center">
          <FileVideo2 className="w-10 h-10 text-primary" />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Loading Video</h2>
          <p className="text-muted-foreground text-sm">
            {video?.name ?? "Preparing..."}
          </p>
        </div>
      </motion.div>
    </div>
  );
}

function AnalyzedView() {
  const processing = useNovaStore((s) => s.processing);
  const stages = processing?.stages ?? [];

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column - Diagnosis + Config */}
          <div className="lg:col-span-2 space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <DiagnosisPanel />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              <PresetSelector />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
            >
              <OutputConfigPanel />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex justify-center pt-2 pb-4"
            >
              <EnhanceButton />
            </motion.div>
          </div>

          {/* Right column - Pipeline Preview */}
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <PipelineVisualizer stages={stages} />
            </motion.div>

            {/* Architecture diagram card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.35 }}
              className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm p-4 space-y-3"
            >
              <h3 className="text-sm font-semibold text-primary uppercase tracking-wider">
                Smart Model Router
              </h3>
              <div className="space-y-2 text-xs text-muted-foreground">
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                  <span>Conditional pipeline — only runs models that address detected issues</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                  <span>Saves VRAM, time, and prevents unnecessary artifact introduction</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 shrink-0" />
                  <span>Multi-frame temporal consistency enforced at every stage</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProcessingView() {
  const processing = useNovaStore((s) => s.processing);
  const stages = processing?.stages ?? [];

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left - Processing Monitor */}
          <motion.div
            className="lg:col-span-2"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <ProcessingMonitor />
          </motion.div>

          {/* Right - Pipeline Visualizer */}
          <motion.div
            className="lg:col-span-3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <PipelineVisualizer stages={stages} />
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function DoneView() {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left - Comparison Viewer */}
          <div className="lg:col-span-2 space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <ComparisonViewer />
            </motion.div>
          </div>

          {/* Right - Quality Metrics */}
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 }}
            >
              <QualityMetricsPanel />
            </motion.div>

            {/* Output info card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm p-4 space-y-3"
            >
              <h3 className="text-sm font-semibold text-primary uppercase tracking-wider">
                Output Summary
              </h3>
              <div className="space-y-2 text-xs font-mono text-muted-foreground">
                <div className="flex justify-between">
                  <span>Resolution</span>
                  <span className="text-foreground">1920 × 1080</span>
                </div>
                <div className="flex justify-between">
                  <span>Codec</span>
                  <span className="text-foreground">H.265 10-bit</span>
                </div>
                <div className="flex justify-between">
                  <span>Audio</span>
                  <span className="text-emerald-400">Preserved (original)</span>
                </div>
                <div className="flex justify-between">
                  <span>Pipeline</span>
                  <span className="text-foreground">Intelligent</span>
                </div>
                <div className="flex justify-between">
                  <span>Processing</span>
                  <span className="text-foreground">100% Local</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function NovaPage() {
  const stage = useNovaStore((s) => s.stage);

  return (
    <div className="min-h-screen flex flex-col nova-bg-pattern">
      <NovaHeader />

      <main className="flex-1 flex flex-col relative">
        <AnimatePresence mode="wait">
          {stage === "idle" && (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="flex-1 flex flex-col"
            >
              <VideoDropzone />
            </motion.div>
          )}

          {stage === "uploading" && (
            <motion.div
              key="uploading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex-1 flex flex-col"
            >
              <UploadingState />
            </motion.div>
          )}

          {stage === "analyzing" && (
            <motion.div
              key="analyzing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex-1 flex flex-col"
            >
              <AnalyzingState />
            </motion.div>
          )}

          {stage === "analyzed" && (
            <motion.div
              key="analyzed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="flex-1 flex flex-col"
            >
              <AnalyzedView />
            </motion.div>
          )}

          {stage === "processing" && (
            <motion.div
              key="processing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="flex-1 flex flex-col"
            >
              <ProcessingView />
            </motion.div>
          )}

          {stage === "done" && (
            <motion.div
              key="done"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="flex-1 flex flex-col"
            >
              <DoneView />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Sticky Footer */}
      <footer className="border-t border-border/50 bg-card/30 backdrop-blur-sm mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="text-primary font-semibold font-mono">NOVA</span>
              <span>Video Restore v1.0.0</span>
              <span className="hidden sm:inline">·</span>
              <span className="hidden sm:inline">AI-Powered Video Restoration Studio</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                100% Local Processing
              </span>
              <span className="hidden sm:inline">·</span>
              <span className="hidden sm:inline">No cloud. No uploads. Your footage stays private.</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

'use client';

import { useEffect, useRef } from 'react';

interface FilmCanvasProps {
  type: 'cyberpunk' | 'vintage' | 'anime' | 'vhs' | 'custom';
  mode: 'before' | 'after';
  time: number;
  isPlaying: boolean;
  className?: string;
}

export function FilmCanvasEngine({ type, mode, time, isPlaying, className }: FilmCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frameCount = Math.floor(time * 30);

    const render = () => {
      const w = canvas.width;
      const h = canvas.height;
      const t = time + (isPlaying ? (performance.now() / 1000) % 60 : 0);

      ctx.clearRect(0, 0, w, h);

      // Draw background scene based on type
      if (type === 'cyberpunk') {
        // Cyberpunk Night City
        const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
        skyGrad.addColorStop(0, '#060714');
        skyGrad.addColorStop(0.6, '#130924');
        skyGrad.addColorStop(1, '#02040a');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, w, h);

        // Neon Skyscrapers
        for (let i = 0; i < 16; i++) {
          const bx = (i * 85 + (t * 20) % 85) % (w + 100) - 50;
          const bh = 180 + (Math.sin(i * 1.7) * 90);
          const by = h - bh - 60;
          const bw = 65;

          // Building body
          ctx.fillStyle = '#0b0d1b';
          ctx.fillRect(bx, by, bw, bh);

          // Windows / Hologram lines
          ctx.fillStyle = i % 2 === 0 ? 'rgba(236, 72, 153, 0.4)' : 'rgba(6, 182, 212, 0.4)';
          for (let wy = by + 10; wy < by + bh - 10; wy += 14) {
            for (let wx = bx + 6; wx < bx + bw - 6; wx += 12) {
              if (Math.sin(wx * wy + i) > 0.1) {
                ctx.fillRect(wx, wy, 6, 8);
              }
            }
          }

          // Top Neon Light
          ctx.fillStyle = i % 3 === 0 ? '#f59e0b' : i % 2 === 0 ? '#06b6d4' : '#ec4899';
          ctx.fillRect(bx, by - 4, bw, 4);
        }

        // Cyberpunk Highway & Flying Vehicles
        ctx.fillStyle = '#05070e';
        ctx.fillRect(0, h - 80, w, 80);

        // Light trails
        const carX = (t * 220) % (w + 200) - 100;
        ctx.fillStyle = '#06b6d4';
        ctx.fillRect(carX, h - 50, 45, 6);
        ctx.fillStyle = 'rgba(6, 182, 212, 0.2)';
        ctx.fillRect(carX - 60, h - 49, 60, 4);

        const car2X = w - ((t * 180) % (w + 200)) + 100;
        ctx.fillStyle = '#ec4899';
        ctx.fillRect(car2X, h - 35, 45, 6);
        ctx.fillStyle = 'rgba(236, 72, 153, 0.2)';
        ctx.fillRect(car2X + 45, h - 34, 60, 4);

        // Neon Billboard
        const billX = w * 0.45;
        const billY = h * 0.25;
        ctx.fillStyle = 'rgba(251, 191, 36, 0.9)';
        ctx.font = 'bold 24px monospace';
        ctx.fillText('NOVA 4K AI STUDIO', billX, billY);

      } else if (type === 'vintage') {
        // 1920s Archival Film Scene (Sepia / B&W)
        const filmGrad = ctx.createLinearGradient(0, 0, 0, h);
        if (mode === 'after') {
          // Colorized & Pristine
          filmGrad.addColorStop(0, '#78909c');
          filmGrad.addColorStop(0.5, '#cfd8dc');
          filmGrad.addColorStop(1, '#37474f');
        } else {
          // Sepia & Dark
          filmGrad.addColorStop(0, '#3e2723');
          filmGrad.addColorStop(0.5, '#5d4037');
          filmGrad.addColorStop(1, '#1b0000');
        }
        ctx.fillStyle = filmGrad;
        ctx.fillRect(0, 0, w, h);

        // Vintage Tram & Classic Street Architecture
        ctx.fillStyle = mode === 'after' ? '#8d6e63' : '#2b1b17';
        ctx.fillRect(w * 0.2, h * 0.35, w * 0.6, h * 0.4);

        // Windows
        ctx.fillStyle = mode === 'after' ? '#fff9c4' : '#6d4c41';
        for (let x = w * 0.25; x < w * 0.75; x += 55) {
          ctx.fillRect(x, h * 0.4, 40, 50);
        }

        // Archival Timestamp / Film counter
        ctx.fillStyle = mode === 'after' ? '#fbbf24' : '#a1887f';
        ctx.font = '16px monospace';
        ctx.fillText(`SCENE 1928_REV_B · ${Math.floor(t * 18)} FRAMES`, 30, 40);

      } else if (type === 'anime') {
        // Classic Anime Remaster (Sky, Clouds, Cherry Blossoms)
        const sky = ctx.createLinearGradient(0, 0, 0, h);
        sky.addColorStop(0, '#1e3a8a');
        sky.addColorStop(0.5, '#3b82f6');
        sky.addColorStop(1, '#93c5fd');
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, w, h);

        // Anime Clouds
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        for (let i = 0; i < 4; i++) {
          const cx = ((i * 260 + t * 15) % (w + 300)) - 100;
          const cy = 60 + i * 40;
          ctx.beginPath();
          ctx.arc(cx, cy, 50, 0, Math.PI * 2);
          ctx.arc(cx + 40, cy - 10, 60, 0, Math.PI * 2);
          ctx.arc(cx + 80, cy, 45, 0, Math.PI * 2);
          ctx.fill();
        }

        // Anime Character Silhouette / Vector Sharpness Demo
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        const charX = w * 0.5 + Math.sin(t * 2) * 10;
        ctx.arc(charX, h * 0.55, 36, 0, Math.PI * 2); // Head
        ctx.fill();
        ctx.fillRect(charX - 35, h * 0.6, 70, 90); // Torso

        // Anime text title
        ctx.fillStyle = mode === 'after' ? '#fbbf24' : '#ffffff';
        ctx.font = 'bold 22px sans-serif';
        ctx.fillText('NEURAL VECTOR 4K REMASTER', 40, h - 40);

      } else {
        // VHS Camcorder 1994
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, w, h);

        // Living room / Beach setting
        const beach = ctx.createLinearGradient(0, 0, 0, h);
        beach.addColorStop(0, '#0284c7');
        beach.addColorStop(0.6, '#38bdf8');
        beach.addColorStop(0.7, '#fde047');
        beach.addColorStop(1, '#ca8a04');
        ctx.fillStyle = beach;
        ctx.fillRect(0, 0, w, h);

        // Sun
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(w * 0.75, h * 0.3, 45, 0, Math.PI * 2);
        ctx.fill();

        // 1994 VHS OSD Menu
        ctx.fillStyle = '#22c55e';
        ctx.font = 'bold 20px monospace';
        ctx.fillText('SP 0:00:00', 40, 50);
        ctx.fillText('PLAY ►', 40, 80);
        ctx.fillText('JUL. 14 1994  PM 03:42', w - 280, h - 40);
      }

      // ─── DEGRADATION / RESTORATION POST-PROCESSING ───
      if (mode === 'before') {
        // 1. Heavy Noise / Grain
        const imgData = ctx.getImageData(0, 0, w, h);
        const data = imgData.data;
        const noiseAmount = type === 'vintage' ? 45 : type === 'vhs' ? 35 : 25;

        for (let i = 0; i < data.length; i += 4) {
          const rand = (Math.random() - 0.5) * noiseAmount;
          data[i] = Math.min(255, Math.max(0, data[i] + rand));
          data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + rand));
          data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + rand));
        }
        ctx.putImageData(imgData, 0, 0);

        // 2. VHS / Film Scanlines & Scratches
        if (type === 'vhs') {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
          for (let y = 0; y < h; y += 3) {
            ctx.fillRect(0, y, w, 1);
          }
          // Tape tracking noise glitch line
          const glitchY = (t * 80) % h;
          ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
          ctx.fillRect(0, glitchY, w, 6);
        }

        if (type === 'vintage') {
          // Dust & Scratches
          ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
          for (let s = 0; s < 5; s++) {
            const sx = Math.random() * w;
            ctx.fillRect(sx, 0, 1.5, h);
          }
        }
      } else {
        // AFTER: 4K Crisp Edge Highlight & Clean Vignette
        const vignette = ctx.createRadialGradient(w / 2, h / 2, w * 0.3, w / 2, h / 2, w * 0.6);
        vignette.addColorStop(0, 'rgba(0,0,0,0)');
        vignette.addColorStop(1, 'rgba(0,0,0,0.25)');
        ctx.fillStyle = vignette;
        ctx.fillRect(0, 0, w, h);
      }

      if (isPlaying) {
        animFrameRef.current = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [type, mode, time, isPlaying]);

  return (
    <canvas
      ref={canvasRef}
      width={960}
      height={540}
      className={`h-full w-full object-cover ${className || ''}`}
    />
  );
}

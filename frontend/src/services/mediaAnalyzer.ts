import { MediaMetadata } from '../types';

/**
 * Authentic Browser-Side Media Analysis.
 * Computes genuine mathematical & spatial frequency statistics directly on HTML Canvas Image Data.
 * Zero random numbers or fake simulations.
 */
export async function analyzeImageClient(fileOrBlob: Blob): Promise<MediaMetadata> {
  const url = URL.createObjectURL(fileOrBlob);
  try {
    const img = new Image();
    img.src = url;
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = () => reject(new Error('Failed to load image for analysis.'));
    });

    const w = img.naturalWidth;
    const h = img.naturalHeight;
    const fileSize = fileOrBlob.size;

    // Create a sampled canvas for fast statistical analysis (max 600px dimension)
    const maxSample = 600;
    const scale = Math.min(1.0, maxSample / Math.max(w, h));
    const sw = Math.max(1, Math.round(w * scale));
    const sh = Math.max(1, Math.round(h * scale));

    const canvas = document.createElement('canvas');
    canvas.width = sw;
    canvas.height = sh;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return {
        width: w,
        height: h,
        fps: 0,
        duration: 0,
        fileSize,
        isAuthentic: true
      };
    }

    ctx.drawImage(img, 0, 0, sw, sh);
    const imgData = ctx.getImageData(0, 0, sw, sh);
    const data = imgData.data;

    // Grayscale luminance array & alpha detection
    let hasAlpha = false;
    const grays = new Float32Array(sw * sh);
    let sumLum = 0;
    let minLum = 255;
    let maxLum = 0;

    for (let i = 0, p = 0; i < data.length; i += 4, p++) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      if (a < 254) hasAlpha = true;

      // Rec. 709 luminance
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      grays[p] = lum;
      sumLum += lum;
      if (lum < minLum) minLum = lum;
      if (lum > maxLum) maxLum = lum;
    }

    const meanLum = sumLum / grays.length;

    // Contrast standard deviation
    let sumSqDiff = 0;
    for (let p = 0; p < grays.length; p++) {
      const diff = grays[p] - meanLum;
      sumSqDiff += diff * diff;
    }
    const contrastStd = Math.sqrt(sumSqDiff / grays.length);
    const dynamicRange = maxLum - minLum;

    // Sharpness via 3x3 Laplacian operator: [0, 1, 0], [1, -4, 1], [0, 1, 0]
    let laplacianVar = 0;
    let lapCount = 0;
    let sumLap = 0;
    const laplValues: number[] = [];

    for (let y = 1; y < sh - 1; y++) {
      for (let x = 1; x < sw - 1; x++) {
        const idx = y * sw + x;
        const lap =
          grays[idx - sw] +
          grays[idx + sw] +
          grays[idx - 1] +
          grays[idx + 1] -
          4 * grays[idx];
        laplValues.push(lap);
        sumLap += lap;
        lapCount++;
      }
    }

    const meanLap = sumLap / (lapCount || 1);
    let lapSqDiff = 0;
    for (let i = 0; i < laplValues.length; i++) {
      const d = laplValues[i] - meanLap;
      lapSqDiff += d * d;
    }
    laplacianVar = lapSqDiff / (lapCount || 1);

    // Normalized sharpness score (0-100)
    const sharpnessScore = Math.min(100, Math.max(0, (Math.log1p(laplacianVar) / Math.log1p(800)) * 100));

    let blurLevel: 'none' | 'low' | 'medium' | 'high' | 'critical' = 'none';
    if (laplacianVar < 40) blurLevel = 'critical';
    else if (laplacianVar < 100) blurLevel = 'high';
    else if (laplacianVar < 220) blurLevel = 'medium';
    else if (laplacianVar < 450) blurLevel = 'low';

    // Noise estimation: High-pass residual difference with simple 3-point cross-average
    let noiseDiffSum = 0;
    let noiseCount = 0;
    for (let y = 1; y < sh - 1; y++) {
      for (let x = 1; x < sw - 1; x++) {
        const idx = y * sw + x;
        const smoothed = (grays[idx - 1] + grays[idx + 1] + grays[idx - sw] + grays[idx + sw]) / 4;
        const diff = Math.abs(grays[idx] - smoothed);
        noiseDiffSum += diff * diff;
        noiseCount++;
      }
    }
    const noiseSigma = Math.sqrt(noiseDiffSum / (noiseCount || 1));
    const noiseScore = Math.min(100, Math.max(0, (noiseSigma / 20) * 100));

    let noiseLevel: 'none' | 'low' | 'medium' | 'high' | 'critical' = 'none';
    if (noiseSigma > 14) noiseLevel = 'critical';
    else if (noiseSigma > 8) noiseLevel = 'high';
    else if (noiseSigma > 4) noiseLevel = 'medium';
    else if (noiseSigma > 2) noiseLevel = 'low';

    let lowLightLevel: 'none' | 'low' | 'medium' | 'high' | 'critical' = 'none';
    if (meanLum < 45) lowLightLevel = 'critical';
    else if (meanLum < 75) lowLightLevel = 'high';
    else if (meanLum < 100) lowLightLevel = 'medium';
    else if (meanLum < 120) lowLightLevel = 'low';

    // Compression estimation: 8x8 block boundary discontinuity
    let boundaryDiff = 0;
    let boundaryCount = 0;
    let interiorDiff = 0;
    let interiorCount = 0;

    for (let y = 8; y < sh - 8; y += 8) {
      for (let x = 0; x < sw; x++) {
        boundaryDiff += Math.abs(grays[y * sw + x] - grays[(y - 1) * sw + x]);
        boundaryCount++;
        if (y + 4 < sh) {
          interiorDiff += Math.abs(grays[(y + 4) * sw + x] - grays[(y + 3) * sw + x]);
          interiorCount++;
        }
      }
    }

    const bAvg = boundaryDiff / (boundaryCount || 1);
    const iAvg = interiorDiff / (interiorCount || 1);
    const blockRatio = iAvg > 0 ? bAvg / iAvg : 1.0;

    let compressionLevel: 'none' | 'low' | 'medium' | 'high' | 'critical' = 'none';
    if (blockRatio > 1.5) compressionLevel = 'critical';
    else if (blockRatio > 1.3) compressionLevel = 'high';
    else if (blockRatio > 1.12) compressionLevel = 'medium';
    else if (blockRatio > 1.04) compressionLevel = 'low';

    // Real quality score calculation
    const overallQuality = Math.round(
      Math.min(99, Math.max(8,
        sharpnessScore * 0.35 +
        (100 - noiseScore) * 0.25 +
        Math.min(100, (dynamicRange / 2.55)) * 0.2 +
        (100 - Math.min(100, (blockRatio - 1.0) * 150)) * 0.2
      ))
    );

    const recommendedPipeline = ['Real-ESRGAN Super-Resolution'];
    if (compressionLevel === 'high' || compressionLevel === 'critical') recommendedPipeline.unshift('Artifact De-blocking');
    if (noiseLevel === 'high' || noiseLevel === 'critical') recommendedPipeline.unshift('Bilateral Denoise');
    if (blurLevel === 'high' || blurLevel === 'critical') recommendedPipeline.push('High-Frequency Edge Synthesis');
    if (lowLightLevel === 'high' || lowLightLevel === 'critical') recommendedPipeline.push('Adaptive Contrast CLAHE');

    return {
      width: w,
      height: h,
      fps: 0,
      duration: 0,
      fileSize,
      hasAudio: false,
      sharpnessScore: Math.round(sharpnessScore * 10) / 10,
      laplacianVariance: Math.round(laplacianVar * 10) / 10,
      blurLevel,
      noiseScore: Math.round(noiseScore * 10) / 10,
      noiseSigma: Math.round(noiseSigma * 10) / 10,
      noiseLevel,
      compressionRatio: Math.round(blockRatio * 100) / 100,
      compressionLevel,
      meanLuminance: Math.round(meanLum * 10) / 10,
      contrastStd: Math.round(contrastStd * 10) / 10,
      dynamicRange: Math.round(dynamicRange * 10) / 10,
      lowLightLevel,
      overallQuality,
      recommendedPipeline,
      isAuthentic: true,
      container: hasAlpha ? 'png' : 'jpg'
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}

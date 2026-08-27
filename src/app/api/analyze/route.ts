import { NextRequest, NextResponse } from 'next/server';

const severities = ['none', 'low', 'medium', 'high', 'critical'] as const;
const blurTypes = ['none', 'motion', 'defocus', 'general', 'mixed'] as const;

function randSeverity(weights: number[] = [0.05, 0.25, 0.4, 0.2, 0.1]) {
  const r = Math.random();
  let acc = 0;
  for (let i = 0; i < weights.length; i++) {
    acc += weights[i];
    if (r < acc) return severities[i];
  }
  return 'medium';
}

function randFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { width, height } = body;

  // Simulate processing delay
  await new Promise((resolve) => setTimeout(resolve, 1500 + Math.random() * 1000));

  const compression = randSeverity([0.02, 0.1, 0.3, 0.4, 0.18]);
  const noise = randSeverity([0.05, 0.35, 0.35, 0.2, 0.05]);
  const blur = randSeverity([0.1, 0.35, 0.35, 0.15, 0.05]);
  const blurType = blur === 'none' ? 'none' : randFrom(['motion', 'defocus', 'general', 'mixed']);
  const faces = Math.random() > 0.4 ? Math.floor(Math.random() * 5) + 1 : 0;
  const faceQuality = faces > 0 ? randSeverity([0.02, 0.2, 0.4, 0.3, 0.08]) : 'none';
  const textDetected = Math.random() > 0.6;
  const textRegions = textDetected ? Math.floor(Math.random() * 4) + 1 : 0;
  const lowLight = randSeverity([0.3, 0.35, 0.2, 0.1, 0.05]);
  const exposure = Math.floor(Math.random() * 80) + 20;
  const dynamicRange = randFrom(['low', 'normal', 'normal', 'normal', 'high']);
  const isAnime = Math.random() > 0.8;

  // Calculate overall quality (0-100) based on issues
  const severityScore = (s: string) => {
    const idx = severities.indexOf(s as typeof severities[number]);
    return (4 - idx) * 20; // none=80, low=60, medium=40, high=20, critical=0
  };
  const overallQuality = Math.round(
    (severityScore(compression) * 0.2 +
      severityScore(noise) * 0.15 +
      severityScore(blur) * 0.2 +
      severityScore(lowLight) * 0.15 +
      (faces > 0 ? severityScore(faceQuality) * 0.15 : 75 * 0.15) +
      (100 - (textDetected ? 10 : 0)) * 0.15) as number
  );

  // Build recommended pipeline
  const pipeline: string[] = ['Temporal VSR (BasicVSR++)', 'Super Resolution'];
  if (compression !== 'none' && compression !== 'low') pipeline.unshift('Artifact Removal');
  if (blur !== 'none' && blur !== 'low') pipeline.unshift('Deblurring');
  if (faces > 0 && faceQuality !== 'none') pipeline.push('Face Restoration (CodeFormer)');
  if (textDetected) pipeline.push('Text Restoration');
  if (lowLight !== 'none' && lowLight !== 'low') pipeline.push('Low-Light Enhancement');
  pipeline.push('Temporal Validation', 'Quality Check');

  // Warnings
  const warnings: string[] = [];
  if (blur === 'critical') {
    warnings.push('Severe degradation detected. Some details may be AI-reconstructed rather than recovered from the source.');
  }
  if (compression === 'critical') {
    warnings.push('Extreme compression artifacts. Maximum artifact removal will be applied.');
  }
  if (faces > 0 && faceQuality === 'critical') {
    warnings.push('Face quality is severely degraded. Identity preservation is set to conservative by default.');
  }
  if (lowLight === 'high' || lowLight === 'critical') {
    warnings.push('Very low light conditions detected. Noise amplification may occur during enhancement.');
  }

  return NextResponse.json({
    compression,
    noise,
    blur,
    blurType,
    faces,
    faceQuality,
    textDetected,
    textRegions,
    lowLight,
    exposure,
    dynamicRange,
    isAnime,
    overallQuality: Math.min(100, Math.max(5, overallQuality)),
    recommendedPipeline: pipeline,
    warnings,
  });
}

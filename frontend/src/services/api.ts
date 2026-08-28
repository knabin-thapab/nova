import {
  MediaMetadata,
  RestorationConfig,
  RestorationJob,
  SystemTelemetry,
  WorkerStatusReport,
  ModelsStatusReport,
} from '../types';

export function normalizeBackendUrl(rawUrl: string): string {
  let url = rawUrl.trim().replace(/\/+$/, '');
  if (!url) return '';

  // Auto-convert Hugging Face Space UI URLs: https://huggingface.co/spaces/USER/SPACE -> https://USER-SPACE.hf.space
  const hfMatch = url.match(/^https?:\/\/huggingface\.co\/spaces\/([^\/]+)\/([^\/]+)/i);
  if (hfMatch) {
    const user = hfMatch[1].toLowerCase().replace(/_/g, '-');
    const space = hfMatch[2].toLowerCase().replace(/_/g, '-');
    url = `https://${user}-${space}.hf.space`;
  }

  // Remove accidental trailing /api or /docs
  url = url.replace(/\/api$/, '').replace(/\/docs$/, '').replace(/\/+$/, '');
  return url;
}

// Auto-detect backend URL from ?backend= query parameter and save to localStorage
function syncBackendFromUrl(): void {
  if (typeof window === 'undefined') return;
  try {
    const params = new URLSearchParams(window.location.search);
    const backendParam = params.get('backend');
    if (backendParam && backendParam.trim()) {
      const cleanUrl = normalizeBackendUrl(backendParam);
      localStorage.setItem('nova_custom_backend_url', cleanUrl);
      params.delete('backend');
      const cleanSearch = params.toString();
      const newUrl = window.location.pathname + (cleanSearch ? `?${cleanSearch}` : '');
      window.history.replaceState({}, '', newUrl);
    }
  } catch (_) { /* ignore in SSR or restricted environments */ }
}
syncBackendFromUrl();

export function getBackendUrl(): string {
  const custom = typeof window !== 'undefined' ? localStorage.getItem('nova_custom_backend_url') : null;
  if (custom && custom.trim()) {
    return normalizeBackendUrl(custom);
  }
  return import.meta.env.VITE_API_URL
    ? normalizeBackendUrl(import.meta.env.VITE_API_URL)
    : '';
}

export function getShareableUrl(): string {
  const backend = getBackendUrl();
  if (!backend) return window.location.origin;
  return `${window.location.origin}?backend=${encodeURIComponent(backend)}`;
}

export function setCustomBackendUrl(url: string | null) {
  if (typeof window !== 'undefined') {
    if (url && url.trim()) {
      localStorage.setItem('nova_custom_backend_url', normalizeBackendUrl(url));
    } else {
      localStorage.removeItem('nova_custom_backend_url');
    }
  }
}

export function getApiBase(): string {
  const backend = getBackendUrl();
  return backend ? `${backend}/api` : '/api';
}

export function getMediaUrl(path?: string | null): string {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
    return path;
  }
  const backend = getBackendUrl();
  return `${backend}${path}`;
}

/**
 * Resilient fetcher with exponential backoff for free cloud workers (e.g. Hugging Face Spaces waking up from sleep).
 */
export async function resilientFetch(
  url: string,
  options: RequestInit = {},
  retries = 2,
  backoffMs = 3000,
  onRetryNotice?: (notice: string) => void
): Promise<Response> {
  let lastError: any = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, options);

      // Hugging Face cold-start sleeping space detection (403, 502, 503, 504 during wake-up)
      if ((res.status === 403 || res.status === 502 || res.status === 503 || res.status === 504) && attempt < retries) {
        onRetryNotice?.(`Waking up free AI engine (cold start, standby ~${Math.round((backoffMs * (attempt + 1)) / 1000)}s)...`);
        await new Promise((r) => setTimeout(r, backoffMs * (attempt + 1)));
        continue;
      }

      return res;
    } catch (err: any) {
      lastError = err;
      if (attempt < retries) {
        onRetryNotice?.(`Connecting to AI worker (attempt ${attempt + 1}/${retries + 1})...`);
        await new Promise((r) => setTimeout(r, backoffMs * (attempt + 1)));
      }
    }
  }

  throw lastError || new Error(`Network request failed after ${retries + 1} attempts`);
}

export async function checkBackendHealth(): Promise<{ isOnline: boolean; error?: string; info?: any }> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(`${getApiBase()}/health`, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.ok) {
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await res.json().catch(() => ({ status: 'online' }));
        return { isOnline: true, info: data };
      }
      return { isOnline: true, info: { status: 'online' } };
    }
    if (res.status === 403) {
      return {
        isOnline: false,
        error: 'Hugging Face Space returned 403 Forbidden. Please verify: 1) Space visibility is set to "Public" in Space Settings (Private spaces block unauthenticated API requests), 2) Use the direct endpoint format https://username-spacename.hf.space.'
      };
    }
    if (res.status === 502 || res.status === 503 || res.status === 504) {
      return { isOnline: false, error: 'Free AI Space is waking up. Please wait a few seconds and refresh.' };
    }
    return { isOnline: false, error: `Server responded with status ${res.status}` };
  } catch (err: any) {
    const backend = getBackendUrl() || 'http://localhost:8000';
    return {
      isOnline: false,
      error: `Cannot connect to AI Backend at ${backend}. Please ensure the server is online.`
    };
  }
}

export async function checkWorkerReady(): Promise<{ ready: boolean; workerState?: string }> {
  try {
    const res = await fetch(`${getApiBase()}/ready`);
    if (!res.ok) return { ready: false, workerState: 'OFFLINE' };
    const data = await res.json();
    return { ready: data.ready, workerState: data.workerState };
  } catch {
    return { ready: false, workerState: 'OFFLINE' };
  }
}

export async function getModelsStatus(): Promise<ModelsStatusReport | null> {
  try {
    const res = await fetch(`${getApiBase()}/models`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function getWorkerStatus(): Promise<WorkerStatusReport | null> {
  try {
    const res = await fetch(`${getApiBase()}/worker-status`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function getTelemetry(): Promise<SystemTelemetry | null> {
  try {
    const res = await fetch(`${getApiBase()}/telemetry`);
    if (!res.ok) return null;
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function getSampleVideo(): Promise<{ filePath: string; url: string; metadata: MediaMetadata }> {
  try {
    const res = await fetch(`${getApiBase()}/sample-video`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || err.message || 'Failed to load sample video');
    }
    return res.json();
  } catch (err: any) {
    if (err.message && err.message.includes('fetch')) {
      const backend = getBackendUrl() || 'http://localhost:8000';
      throw new Error(`Cannot reach Backend server at ${backend}. Please verify connection in settings.`);
    }
    throw err;
  }
}

export async function uploadVideoFile(
  file: File,
  onProgress?: (percent: number) => void
): Promise<{ filePath: string; url: string; metadata: MediaMetadata }> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('file', file);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${getApiBase()}/upload`);

    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          onProgress(percent);
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          resolve(data);
        } catch (e) {
          reject(new Error('Invalid response received from server.'));
        }
      } else {
        try {
          const errData = JSON.parse(xhr.responseText);
          reject(new Error(errData.detail || errData.message || `Upload failed with HTTP ${xhr.status}`));
        } catch (_) {
          reject(new Error(`Upload failed with HTTP ${xhr.status}`));
        }
      }
    };

    xhr.onerror = () => {
      const backend = getBackendUrl() || 'http://localhost:8000';
      reject(new Error(`Failed to connect to AI Backend at ${backend}. Please ensure the server is online.`));
    };

    xhr.ontimeout = () => {
      reject(new Error('Upload request timed out. Please check your network connection.'));
    };

    xhr.send(formData);
  });
}

export async function startRestorationJob(sourcePath: string, config: RestorationConfig): Promise<{ jobId: string; job: RestorationJob }> {
  const res = await fetch(`${getApiBase()}/jobs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sourcePath, config }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || errorData.message || 'Failed to start job');
  }
  return res.json();
}

export async function getJob(jobId: string): Promise<RestorationJob> {
  const res = await fetch(`${getApiBase()}/jobs/${jobId}`);
  if (!res.ok) throw new Error('Job not found');
  return res.json();
}

export async function cancelJob(jobId: string): Promise<void> {
  await fetch(`${getApiBase()}/jobs/${jobId}/cancel`, { method: 'POST' });
}

export async function listJobs(): Promise<RestorationJob[]> {
  try {
    const res = await fetch(`${getApiBase()}/jobs`);
    if (!res.ok) return [];
    return res.json();
  } catch (_) {
    return [];
  }
}

export async function deleteJob(jobId: string): Promise<void> {
  await fetch(`${getApiBase()}/jobs/${jobId}`, { method: 'DELETE' });
}

export async function clearAllJobs(): Promise<void> {
  await fetch(`${getApiBase()}/jobs`, { method: 'DELETE' });
}

export function getDownloadUrl(jobId: string): string {
  return `${getApiBase()}/download/${jobId}`;
}

export async function analyzeMediaApi(file: File): Promise<MediaMetadata> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${getApiBase()}/analyze`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || errorData.message || 'Analysis request failed.');
  }
  return res.json();
}

export async function enhanceImageFile(
  file: File,
  scale: number = 4,
  mode: string = 'balanced',
  preset: 'web' | 'high_quality' | 'maximum' = 'web',
  format: string = 'auto',
  faceRestoration: boolean = false,
  faceStrength: string = 'conservative',
  onNotice?: (msg: string) => void
): Promise<{
  blob: Blob;
  url: string;
  width: number;
  height: number;
  originalSize: number;
  enhancedSize: number;
  savedPercent: number;
  mimeType: string;
}> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('scale', scale.toString());
  formData.append('mode', mode);
  formData.append('preset', preset);
  formData.append('format', format);
  formData.append('face_restoration', faceRestoration.toString());
  formData.append('face_strength', faceStrength);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 180000);

  try {
    const res = await resilientFetch(
      `${getApiBase()}/enhance-image`,
      {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      },
      2,
      4000,
      onNotice
    );
    clearTimeout(timeoutId);

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.detail || errorData.message || `Server responded with error ${res.status}`);
    }

    const origSize = parseInt(res.headers.get('X-Original-Size') || `${file.size}`, 10);
    const enhWidth = parseInt(res.headers.get('X-Enhanced-Width') || '0', 10);
    const enhHeight = parseInt(res.headers.get('X-Enhanced-Height') || '0', 10);
    const savedPct = parseFloat(res.headers.get('X-Saved-Percent') || '0');
    const mimeType = res.headers.get('Content-Type') || 'image/jpeg';

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const enhSize = blob.size;

    let width = enhWidth;
    let height = enhHeight;

    if (!width || !height) {
      const img = new Image();
      img.src = url;
      await new Promise((resolve) => {
        img.onload = resolve;
      });
      width = img.naturalWidth;
      height = img.naturalHeight;
    }

    const calculatedSaved = origSize > 0 ? Math.max(0, Math.round(((origSize - enhSize) / origSize) * 100 * 10) / 10) : savedPct;

    return {
      blob,
      url,
      width,
      height,
      originalSize: origSize,
      enhancedSize: enhSize,
      savedPercent: calculatedSaved,
      mimeType
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Enhancement request timed out. Please check GPU status in settings.');
    }
    if (err.message && err.message.includes('fetch')) {
      const backend = getBackendUrl() || 'http://localhost:8000';
      throw new Error(`Cannot connect to AI Backend at ${backend}. Please ensure the server is online.`);
    }
    throw err;
  }
}

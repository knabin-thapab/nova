import { RestorationJob, SystemTelemetry } from '../types';
import { getBackendUrl, getJob, getTelemetry } from './api';

export type JobUpdateCallback = (job: RestorationJob, telemetry?: SystemTelemetry) => void;

export class JobWebSocketClient {
  private ws: WebSocket | null = null;
  private jobId: string;
  private onUpdate: JobUpdateCallback;
  private isClosedManually = false;
  private pollingTimer: any = null;
  private hasReceivedWsMessage = false;

  constructor(jobId: string, onUpdate: JobUpdateCallback) {
    this.jobId = jobId;
    this.onUpdate = onUpdate;
  }

  connect() {
    this.isClosedManually = false;
    this.hasReceivedWsMessage = false;
    let wsUrl: string;
    const backend = getBackendUrl();

    if (backend) {
      const wsBase = backend.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:');
      wsUrl = `${wsBase}/ws/jobs/${this.jobId}`;
    } else {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      wsUrl = `${protocol}//${window.location.host}/ws/jobs/${this.jobId}`;
    }

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        // WebSocket connected
      };

      this.ws.onmessage = (event) => {
        try {
          this.hasReceivedWsMessage = true;
          this.stopPolling();
          const data = JSON.parse(event.data);
          if (data.type === 'heartbeat') {
            if (data.telemetry) {
              this.onUpdate({} as RestorationJob, data.telemetry);
            }
          } else {
            this.onUpdate(data as RestorationJob, data.telemetry);
          }
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };

      this.ws.onerror = (err) => {
        console.warn('WebSocket connection error, starting HTTP fallback polling:', err);
        this.startPollingFallback();
      };

      this.ws.onclose = () => {
        if (!this.isClosedManually) {
          this.startPollingFallback();
          setTimeout(() => {
            if (!this.isClosedManually) {
              this.connect();
            }
          }, 3000);
        }
      };
    } catch (_) {
      this.startPollingFallback();
    }

    // Safety fallback: If no WS message after 2.5 seconds, start HTTP poll
    setTimeout(() => {
      if (!this.hasReceivedWsMessage && !this.isClosedManually) {
        this.startPollingFallback();
      }
    }, 2500);
  }

  private startPollingFallback() {
    if (this.pollingTimer || this.isClosedManually) return;
    this.pollingTimer = setInterval(async () => {
      if (this.isClosedManually) {
        this.stopPolling();
        return;
      }
      try {
        const job = await getJob(this.jobId);
        const telemetry = (await getTelemetry().catch(() => null)) || undefined;
        this.onUpdate(job, telemetry);
        if (job.status === 'completed' || job.status === 'failed') {
          this.stopPolling();
        }
      } catch (_) {
        // Ignore polling errors
      }
    }, 1200);
  }

  private stopPolling() {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
  }

  disconnect() {
    this.isClosedManually = true;
    this.stopPolling();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

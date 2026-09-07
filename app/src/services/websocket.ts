import type { WsMessage, StatusUpdate, AnalysisResult, SessionSummary } from '@/src/types';
import { useAletheiaStore, WebSocketRef } from '@/src/store/aletheiaStore';
import { WS_BASE_URL, HTTP_BASE_URL } from '@/src/config';

export class AletheiaWebSocket {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private autoReconnect = true;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  onAnalysis: ((msg: WsMessage) => void) | null = null;
  onStatus: ((msg: WsMessage) => void) | null = null;
  onOpen: (() => void) | null = null;
  onClose: (() => void) | null = null;
  onError: ((error: Event) => void) | null = null;

  constructor(sessionId: string) {
    this.url = `${WS_BASE_URL}/ws/${sessionId}`;
  }

  connect(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) return;

    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.startHeartbeat();
      const store = useAletheiaStore.getState();
      store.setConnected(true);
      store.setSession({ session_id: this.sessionId(), ws_url: this.url, created_at: '' });
      this.onOpen?.();
    };

    this.ws.onmessage = (event) => {
      try {
        const msg: WsMessage = JSON.parse(event.data);
        const store = useAletheiaStore.getState();
        if (msg.type === 'analysis_result' && msg.data && 'incongruence_score' in msg.data) {
          const analysis = msg.data as AnalysisResult;
          store.setAnalysis(analysis);
          store.setSessionStatus(analysis.alert_level);
          store.pushTimeline(analysis.incongruence_score);
          if (
            analysis.alert_level === 'warning' ||
            analysis.alert_level === 'critical'
          ) {
            store.pushAlert(analysis.incongruence_score, analysis.alert_level);
          }
          this.onAnalysis?.(msg);
        } else if (msg.type === 'status_update') {
          if (msg.data && 'total_frames' in msg.data) {
            store.setStatusUpdate(msg.data as StatusUpdate);
          }
          this.onStatus?.(msg);
        }
      } catch {
        // ignore malformed frames
      }
    };

    this.ws.onclose = () => {
      this.stopHeartbeat();
      const store = useAletheiaStore.getState();
      store.setConnected(false);
      this.onClose?.();
      if (this.autoReconnect) this.scheduleReconnect();
    };

    this.ws.onerror = (event) => {
      this.onError?.(event);
    };

    WebSocketRef.instance.sendFrame = (payload: object) => this.sendFrame(payload);
  }

  private sessionId(): string {
    return this.url.split('/').pop() ?? '';
  }

  private scheduleReconnect(): void {
    if (!this.autoReconnect) return;
    if (this.reconnectAttempts >= this.maxReconnectAttempts) return;

    const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 15000);
    this.reconnectAttempts += 1;

    setTimeout(() => {
      if (this.autoReconnect) this.connect();
    }, delay);
  }

  sendFrame(payload: object): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    }
  }

  sendPing(): void {
    this.sendFrame({ type: 'ping' });
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => this.sendPing(), 30000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  close(): void {
    this.autoReconnect = false;
    this.stopHeartbeat();
    WebSocketRef.instance.sendFrame = () => {};
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export async function createSession(
  participantId: string,
  sessionName: string,
): Promise<string> {
  const response = await fetch(`${HTTP_BASE_URL}/session/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      participant_id: participantId,
      session_name: sessionName,
    }),
  });

  if (!response.ok) {
    throw new Error(`Falha ao iniciar sessao: ${response.status}`);
  }

  const data = await response.json();
  return data.session_id;
}

export async function stopSession(sessionId: string): Promise<SessionSummary> {
  const response = await fetch(`${HTTP_BASE_URL}/session/${sessionId}/stop`, {
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error(`Falha ao terminar sessao: ${response.status}`);
  }

  const data = await response.json();
  return data.session_id
    ? (data as SessionSummary)
    : { session_id: sessionId, status: 'completed', metrics: data.summary };
}
import { create } from 'zustand';
import type { AlertLevel, AnalysisResult, SessionInfo, SessionSummary, StatusUpdate } from '@/src/types';

export class WebSocketRef {
  static instance: { sendFrame: (payload: object) => void; connected: boolean } = {
    sendFrame: () => {},
    connected: false,
  };
}

export interface ReportData {
  summary: SessionSummary | null;
  timeline: Array<{ score: number; ts: number }>;
}

interface AletheiaState {
  session: SessionInfo | null;
  connected: boolean;
  captureActive: boolean;
  analysis: AnalysisResult | null;
  statusUpdate: StatusUpdate | null;
  alertHistory: Array<{ score: number; alert_level: string; ts: number }>;
  timeline: Array<{ score: number; ts: number }>;
  sessionStatus: AlertLevel;
  report: ReportData | null;

  setSession: (session: SessionInfo | null) => void;
  setConnected: (connected: boolean) => void;
  setCaptureActive: (active: boolean) => void;
  setAnalysis: (analysis: AnalysisResult | null) => void;
  setStatusUpdate: (update: StatusUpdate | null) => void;
  pushAlert: (score: number, alert_level: string) => void;
  pushTimeline: (score: number) => void;
  setSessionStatus: (level: AlertLevel) => void;
  setReport: (report: ReportData | null) => void;
  sendFrame: (payload: object) => void;
  reset: () => void;
}

export const useAletheiaStore = create<AletheiaState>((set) => ({
  session: null,
  connected: false,
  captureActive: false,
  analysis: null,
  statusUpdate: null,
  alertHistory: [],
  timeline: [],
  sessionStatus: 'normal',
  report: null,

  setSession: (session) => set({ session }),
  setConnected: (connected) => {
    WebSocketRef.instance.connected = connected;
    set({ connected });
  },
  setCaptureActive: (captureActive) => set({ captureActive }),
  setAnalysis: (analysis) => set({ analysis }),
  setStatusUpdate: (statusUpdate) => set({ statusUpdate }),

  pushAlert: (score, alert_level) =>
    set((state) => ({
      alertHistory: [
        ...state.alertHistory.slice(-19),
        { score, alert_level, ts: Date.now() },
      ],
    })),

  pushTimeline: (score) =>
    set((state) => ({
      timeline: [...state.timeline.slice(-599), { score, ts: Date.now() }],
    })),

  setSessionStatus: (sessionStatus) => set({ sessionStatus }),
  setReport: (report) => set({ report }),

  sendFrame: (payload) => WebSocketRef.instance.sendFrame(payload),

  reset: () =>
    set({
      session: null,
      connected: false,
      captureActive: false,
      analysis: null,
      statusUpdate: null,
      alertHistory: [],
      timeline: [],
      sessionStatus: 'normal',
    }),
}));
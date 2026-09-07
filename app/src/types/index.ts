export type EmotionLabel =
  | 'neutral'
  | 'calm'
  | 'happy'
  | 'sad'
  | 'angry'
  | 'fearful'
  | 'disgust'
  | 'surprised';

export type AlertLevel = 'normal' | 'warning' | 'critical';

export interface MicroExpression {
  type: string;
  intensity: number;
  duration_frames: number;
  classification: string;
}

export interface AnalysisResult {
  incongruence_score: number;
  emotion: EmotionLabel;
  emotion_confidence: number;
  stress_level: number;
  modality_agreement: number;
  micro_expressions: MicroExpression[];
  alert_level: AlertLevel;
}

export interface WsMessage {
  type: string;
  timestamp?: string;
  frame_number?: number;
  data?: AnalysisResult | StatusUpdate | SessionSummary | undefined;
}

export interface SessionInfo {
  session_id: string;
  ws_url: string;
  created_at: string;
}

export interface StatusUpdate {
  total_frames: number;
  avg_incongruence: number;
  incident_count: number;
  session_status: string;
}

export interface SessionSummary {
  session_id: string;
  session_name?: string;
  participant_id?: string;
  created_at?: string;
  status?: string;
  metrics?: {
    total_frames: number;
    avg_incongruence: number;
    max_incongruence: number;
    incident_count: number;
    emotion_distribution: Record<string, number>;
    stress_peaks: { index: number; value: number }[];
  };
}

export interface FramePayload {
  type: 'multi_modal';
  frame?: string;
  audio?: string;
  text?: string;
  width: number;
  height: number;
}
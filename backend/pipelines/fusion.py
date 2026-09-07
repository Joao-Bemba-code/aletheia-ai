import numpy as np
import json
import os
from datetime import datetime
from typing import Optional
from models.schemas import (
    FacialFeatures, AudioFeatures, TextFeatures,
    FusionResult, EmotionLabel, SessionMetrics,
)
from models.facial_model import FacialAnalyzer
from models.audio_model import AudioAnalyzer
from models.text_model import TextAnalyzer
from config.settings import settings


class MultimodalFusionPipeline:
    def __init__(self):
        self.facial_analyzer = FacialAnalyzer()
        self.audio_analyzer = AudioAnalyzer()
        self.text_analyzer = TextAnalyzer()

        self._fusion_weights = {
            "facial": 0.40,
            "audio": 0.35,
            "text": 0.25,
        }

        self._xgboost_model = None
        self._xgboost_incongruence_model = None
        self._load_xgboost_models()

        self._stress_baseline = settings.STRESS_BASELINE
        self._stress_history: list[float] = []
        self._incongruence_history: list[float] = []
        self._emotion_counts: dict[str, int] = {}
        self._total_frames = 0

    def _load_xgboost_models(self):
        import xgboost as xgb

        emotion_path = settings.XGBOOST_EMOTION_MODEL_PATH
        if emotion_path.exists():
            try:
                model = xgb.XGBClassifier()
                model.load_model(str(emotion_path))
                self._xgboost_model = model
            except Exception:
                self._xgboost_model = None

        incongruence_path = settings.XGBOOST_CONGRUENCE_MODEL_PATH
        if incongruence_path.exists():
            try:
                model = xgb.XGBClassifier()
                model.load_model(str(incongruence_path))
                self._xgboost_incongruence_model = model
            except Exception:
                self._xgboost_incongruence_model = None

    def process_frame(
        self,
        frame_rgb: Optional[np.ndarray] = None,
        audio_chunk: Optional[np.ndarray] = None,
        transcript: Optional[str] = None,
        session_id: str = "",
    ) -> FusionResult:
        self._total_frames += 1

        facial_features = None
        audio_features = None
        text_features = None

        if frame_rgb is not None:
            facial_features = self.facial_analyzer.analyze_frame(frame_rgb)

        if audio_chunk is not None:
            audio_features = self.audio_analyzer.analyze_chunk(audio_chunk)

        if transcript:
            text_features = self.text_analyzer.analyze_text(transcript)

        fusion_result = self._fuse_modalities(facial_features, audio_features, text_features)

        self._update_session_metrics(fusion_result, session_id)

        return fusion_result

    def _fuse_modalities(
        self,
        facial: Optional[FacialFeatures],
        audio: Optional[AudioFeatures],
        text: Optional[TextFeatures],
    ) -> FusionResult:
        facial_vec = self._extract_safe(facial, self.facial_analyzer, "facial")
        audio_vec = self._extract_safe(audio, self.audio_analyzer, "audio")
        text_vec = self._extract_safe(text, self.text_analyzer, "text")

        modality_agreement = self._compute_modality_agreement(facial_vec, audio_vec, text_vec)

        if self._xgboost_model is not None:
            fused = self._xgboost_fusion(facial_vec, audio_vec, text_vec)
        else:
            fused = self._weighted_fusion(facial_vec, audio_vec, text_vec)

        incongruence_score = self._compute_incongruence(
            facial_vec, audio_vec, text_vec, modality_agreement
        )

        stress_level = self._compute_stress_level(facial, audio, text)

        emotion = self._classify_emotion(fused)
        emotion_confidence = self._compute_emotion_confidence(fused)

        micro_expressions = facial.micro_expressions if facial else []

        return FusionResult(
            incongruence_score=incongruence_score,
            emotion=emotion,
            emotion_confidence=emotion_confidence,
            stress_level=stress_level,
            micro_expressions=micro_expressions,
            modality_agreement=modality_agreement,
        )

    def _extract_safe(self, features, analyzer, modality: str) -> np.ndarray:
        if features is None:
            return np.zeros(getattr(settings, f"{modality.upper()}_FEATURES"), dtype=np.float32)
        return analyzer.extract_feature_vector(features)

    def _compute_modality_agreement(
        self, facial_vec: np.ndarray, audio_vec: np.ndarray, text_vec: np.ndarray
    ) -> float:
        if facial_vec.size == 0 or audio_vec.size == 0 or text_vec.size == 0:
            return 0.5

        if (np.var(facial_vec) == 0) or (np.var(audio_vec) == 0) or (np.var(text_vec) == 0):
            return 0.5

        dim = min(len(facial_vec), len(audio_vec), len(text_vec))
        f, a, t = facial_vec[:dim], audio_vec[:dim], text_vec[:dim]

        corr_fa = np.corrcoef(f, a)[0, 1] if np.std(f) > 0 and np.std(a) > 0 else 0.0
        corr_ft = np.corrcoef(f, t)[0, 1] if np.std(f) > 0 and np.std(t) > 0 else 0.0
        corr_at = np.corrcoef(a, t)[0, 1] if np.std(a) > 0 and np.std(t) > 0 else 0.0

        agreement = (abs(corr_fa) + abs(corr_ft) + abs(corr_at)) / 3.0
        return float(np.clip(agreement, 0.0, 1.0))

    def _weighted_fusion(
        self, facial_vec: np.ndarray, audio_vec: np.ndarray, text_vec: np.ndarray
    ) -> np.ndarray:
        w = self._fusion_weights
        max_dim = max(len(facial_vec), len(audio_vec), len(text_vec))

        def pad(vec, target_dim):
            if len(vec) >= target_dim:
                return vec[:target_dim]
            padded = np.zeros(target_dim, dtype=np.float32)
            padded[: len(vec)] = vec
            return padded

        f = pad(facial_vec, max_dim)
        a = pad(audio_vec, max_dim)
        t = pad(text_vec, max_dim)

        return w["facial"] * f + w["audio"] * a + w["text"] * t

    def _xgboost_fusion(
        self, facial_vec: np.ndarray, audio_vec: np.ndarray, text_vec: np.ndarray
    ) -> np.ndarray:
        fused = self._weighted_fusion(facial_vec, audio_vec, text_vec)
        try:
            features = fused.reshape(1, -1)
            prediction = self._xgboost_model.predict_proba(features)
            return prediction[0].astype(np.float32)
        except Exception:
            return fused

    def _compute_incongruence(
        self,
        facial_vec: np.ndarray,
        audio_vec: np.ndarray,
        text_vec: np.ndarray,
        modality_agreement: float,
    ) -> float:
        disagreement = 1.0 - modality_agreement

        facial_energy = float(np.mean(np.abs(facial_vec))) if facial_vec.size > 0 else 0.0
        audio_energy = float(np.mean(np.abs(audio_vec))) if audio_vec.size > 0 else 0.0

        energy_mismatch = abs(facial_energy - audio_energy)
        energy_factor = min(energy_mismatch * 5.0, 1.0)

        base_score = disagreement * 60.0 + energy_factor * 30.0

        if self._xgboost_incongruence_model is not None:
            try:
                fused = self._weighted_fusion(facial_vec, audio_vec, text_vec)
                target = self._xgboost_incongruence_model.n_features_in_
                instance = fused[:target].reshape(1, -1)
                if instance.shape[1] < target:
                    instance = np.zeros((1, target), dtype=np.float32)
                    instance[0, :len(fused[:target])] = fused[:target]
                prob = self._xgboost_incongruence_model.predict_proba(instance)[0, 1]
                ml_score = float(prob) * 100.0
                base_score = 0.6 * base_score + 0.4 * ml_score
            except Exception:
                pass

        self._incongruence_history.append(base_score)
        if len(self._incongruence_history) > 100:
            self._incongruence_history.pop(0)

        if len(self._incongruence_history) >= 3:
            recent_trend = np.mean(self._incongruence_history[-3:]) - np.mean(
                self._incongruence_history[-6:-3] if len(self._incongruence_history) >= 6
                else self._incongruence_history[:3]
            )
            trend_factor = max(recent_trend * 0.1, 0.0)
        else:
            trend_factor = 0.0

        score = base_score + trend_factor
        return float(np.clip(score, 0.0, 100.0))

    def _compute_stress_level(
        self,
        facial: Optional[FacialFeatures],
        audio: Optional[AudioFeatures],
        text: Optional[TextFeatures],
    ) -> float:
        stress_signals = []

        if facial:
            if facial.blink_rate > 0.25:
                stress_signals.append(min(facial.blink_rate * 100, 100.0))
            head_movement = sum(abs(v) for v in facial.head_pose.values())
            if head_movement > 30:
                stress_signals.append(min(head_movement, 100.0))

        if audio:
            if audio.jitter > 0.05:
                stress_signals.append(min(audio.jitter * 500, 100.0))
            if audio.speech_rate > 5.0:
                stress_signals.append(min(audio.speech_rate * 10, 100.0))
            if audio.pause_ratio > 0.4:
                stress_signals.append(min(audio.pause_ratio * 150, 100.0))

        if text:
            if text.hesitation_count > 2:
                stress_signals.append(min(text.hesitation_count * 15, 100.0))
            if text.sentiment_score < -0.3:
                stress_signals.append(abs(text.sentiment_score) * 100)

        if not stress_signals:
            stress_level = self._stress_baseline
        else:
            stress_level = float(np.mean(stress_signals))

        self._stress_history.append(stress_level)
        if len(self._stress_history) > 200:
            self._stress_history.pop(0)

        if len(self._stress_history) >= 10:
            baseline_adjusted = np.mean(self._stress_history[-50:]) if len(self._stress_history) >= 50 else np.mean(self._stress_history)
            stress_level = 0.7 * stress_level + 0.3 * baseline_adjusted

        return float(np.clip(stress_level, 0.0, 100.0))

    def _classify_emotion(self, fused_vector: np.ndarray) -> EmotionLabel:
        if fused_vector.size < 8:
            return EmotionLabel.NEUTRAL

        emotion_scores = fused_vector[:8]
        emotion_scores = emotion_scores - np.max(emotion_scores)
        exp_scores = np.exp(emotion_scores)
        probs = exp_scores / np.sum(exp_scores)

        dominant_idx = int(np.argmax(probs))
        labels = list(EmotionLabel)
        return labels[dominant_idx] if dominant_idx < len(labels) else EmotionLabel.NEUTRAL

    def _compute_emotion_confidence(self, fused_vector: np.ndarray) -> float:
        if fused_vector.size < 8:
            return 0.0
        emotion_scores = fused_vector[:8]
        emotion_scores = emotion_scores - np.max(emotion_scores)
        exp_scores = np.exp(emotion_scores)
        probs = exp_scores / np.sum(exp_scores)
        return float(np.max(probs))

    def _update_session_metrics(self, result: FusionResult, session_id: str):
        emotion_name = result.emotion.value
        self._emotion_counts[emotion_name] = self._emotion_counts.get(emotion_name, 0) + 1

        if result.incongruence_score >= settings.INCONGRUENCE_ALERT_THRESHOLD:
            pass

    def get_session_summary(self, session_id: str) -> SessionMetrics:
        total = max(self._total_frames, 1)
        avg_incongruence = (
            float(np.mean(self._incongruence_history)) if self._incongruence_history else 0.0
        )
        max_incongruence = (
            float(np.max(self._incongruence_history)) if self._incongruence_history else 0.0
        )

        incident_count = sum(
            1 for s in self._incongruence_history
            if s >= settings.INCONGRUENCE_ALERT_THRESHOLD
        )

        stress_peaks = [
            {"index": i, "value": float(v)}
            for i, v in enumerate(self._stress_history)
            if v >= 70.0
        ]

        emotion_dist = {
            k: v / total for k, v in self._emotion_counts.items()
        } if self._emotion_counts else {}

        return SessionMetrics(
            session_id=session_id,
            total_frames=self._total_frames,
            avg_incongruence=avg_incongruence,
            max_incongruence=max_incongruence,
            incident_count=incident_count,
            emotion_distribution=emotion_dist,
            stress_peaks=stress_peaks[:20],
        )

    def reset(self):
        self.facial_analyzer.reset()
        self.audio_analyzer.reset()
        self.text_analyzer.reset()
        self._stress_history.clear()
        self._incongruence_history.clear()
        self._emotion_counts.clear()
        self._total_frames = 0

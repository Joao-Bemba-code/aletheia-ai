import numpy as np
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum


class EmotionLabel(str, Enum):
    NEUTRAL = "neutral"
    CALM = "calm"
    HAPPY = "happy"
    SAD = "sad"
    ANGRY = "angry"
    FEARFUL = "fearful"
    DISGUST = "disgust"
    SURPRISED = "surprised"


@dataclass
class FacialFeatures:
    landmarks: np.ndarray
    micro_expressions: list[dict] = field(default_factory=list)
    eye_aspect_ratio: float = 0.0
    mouth_aspect_ratio: float = 0.0
    head_pose: dict = field(default_factory=lambda: {"pitch": 0.0, "yaw": 0.0, "roll": 0.0})
    blink_rate: float = 0.0
    gaze_direction: dict = field(default_factory=lambda: {"x": 0.0, "y": 0.0})
    timestamp: datetime = field(default_factory=datetime.utcnow)


@dataclass
class AudioFeatures:
    mel_spectrogram: np.ndarray = field(default_factory=lambda: np.array([]))
    pitch_contour: np.ndarray = field(default_factory=lambda: np.array([]))
    energy: float = 0.0
    speech_rate: float = 0.0
    pause_ratio: float = 0.0
    jitter: float = 0.0
    shimmer: float = 0.0
    mfcc: np.ndarray = field(default_factory=lambda: np.array([]))
    embedding: np.ndarray = field(default_factory=lambda: np.array([]))
    timestamp: datetime = field(default_factory=datetime.utcnow)


@dataclass
class TextFeatures:
    embedding: np.ndarray = field(default_factory=lambda: np.array([]))
    sentiment_score: float = 0.0
    word_count: int = 0
    hesitation_count: int = 0
    coherence_score: float = 0.0
    semantic_complexity: float = 0.0
    timestamp: datetime = field(default_factory=datetime.utcnow)


@dataclass
class FusionResult:
    incongruence_score: float = 0.0
    emotion: EmotionLabel = EmotionLabel.NEUTRAL
    emotion_confidence: float = 0.0
    stress_level: float = 0.0
    micro_expressions: list[dict] = field(default_factory=list)
    modality_agreement: float = 0.0
    timestamp: datetime = field(default_factory=datetime.utcnow)


@dataclass
class SessionMetrics:
    session_id: str = ""
    start_time: datetime = field(default_factory=datetime.utcnow)
    total_frames: int = 0
    avg_incongruence: float = 0.0
    max_incongruence: float = 0.0
    incident_count: int = 0
    incident_timeline: list[dict] = field(default_factory=list)
    emotion_distribution: dict = field(default_factory=dict)
    stress_peaks: list[dict] = field(default_factory=list)

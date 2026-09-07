from pydantic_settings import BaseSettings
from pathlib import Path
from enum import Enum


class Environment(str, Enum):
    DEVELOPMENT = "development"
    PRODUCTION = "production"


class Settings(BaseSettings):
    APP_NAME: str = "Aletheia AI"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: Environment = Environment.DEVELOPMENT
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    CORS_ORIGINS: list[str] = ["*"]

    WS_HEARTBEAT_INTERVAL: int = 30
    WS_MAX_CONNECTIONS: int = 50
    SESSION_TIMEOUT: int = 3600

    FACEMESH_MODEL: str = "mediapipe_facemesh"
    AUDIO_MODEL: str = "facebook/wav2vec2-base"
    TEXT_EMBEDDING_MODEL: str = "sentence-transformers/all-MiniLM-L6-v2"
    FUSION_MODEL_PATH: Path = Path("models/saved/fusion_model.onnx")
    XGBOOST_EMOTION_MODEL_PATH: Path = Path("models/saved/xgboost_emotion.json")
    XGBOOST_CONGRUENCE_MODEL_PATH: Path = Path("models/saved/xgboost_incongruence.json")

    FACIAL_FEATURES: int = 128
    AUDIO_FEATURES: int = 128
    TEXT_FEATURES: int = 128
    TOTAL_FUSED_FEATURES: int = FACIAL_FEATURES + AUDIO_FEATURES + TEXT_FEATURES

    EMOTION_LABELS: list[str] = [
        "neutral", "calm", "happy", "sad", "angry", "fearful", "disgust", "surprised"
    ]

    MICRO_EXPRESSION_THRESHOLD: float = 0.15
    STRESS_BASELINE: float = 30.0
    INCONGRUENCE_ALERT_THRESHOLD: float = 65.0
    INCONGRUENCE_CRITICAL_THRESHOLD: float = 85.0

    STATIC_DIR: Path = Path("static")
    LOG_LEVEL: str = "INFO"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()

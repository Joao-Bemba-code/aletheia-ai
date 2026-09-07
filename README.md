# ALETHEIA AI

**Real-time multimodal behavioral auditing platform that fuses facial expressions, voice acoustics, and semantic text to detect cognitive dissonance and stress during corporate interactions.**

## Stack
- **Frontend:** React Native + Expo + TypeScript + Skia
- **Backend:** Python 3.11 + FastAPI + WebSockets + ONNX
- **AI:** MediaPipe Facemesh + Wav2Vec2 + XGBoost
- **Infra:** PostgreSQL + Redis + RabbitMQ + Docker

## Features
- Real-time incongruence scoring (0-100)
- 7 emotion classes + stress monitoring
- Micro-expression detection
- Explainable AI (SHAP)
- Cyberpunk UI with Skia animations

## Quick Start
```bash
pip install -r requirements.txt
python scripts/train_fusion_model.py
uvicorn src.main:app --reload --host 0.0.0.0 --port 8000

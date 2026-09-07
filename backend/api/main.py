import asyncio
import json
import uuid
import time
import logging
from datetime import datetime
from typing import Optional

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel

from config.settings import settings
from pipelines.fusion import MultimodalFusionPipeline
from models.schemas import FusionResult, SessionMetrics

logging.basicConfig(level=getattr(logging, settings.LOG_LEVEL))
logger = logging.getLogger("aletheia")

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Plataforma de auditoria comportamental e deteccao de incongruencia cognitiva",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

sessions: dict[str, dict] = {}


class SessionStartRequest(BaseModel):
    participant_id: Optional[str] = None
    session_name: Optional[str] = None


class SessionStartResponse(BaseModel):
    session_id: str
    ws_url: str
    created_at: str


class HealthResponse(BaseModel):
    status: str
    version: str
    active_sessions: int
    uptime: float


_start_time = time.time()


@app.get("/health", response_model=HealthResponse)
async def health_check():
    return HealthResponse(
        status="operational",
        version=settings.APP_VERSION,
        active_sessions=len(sessions),
        uptime=time.time() - _start_time,
    )


@app.post("/session/start", response_model=SessionStartResponse)
async def start_session(request: SessionStartRequest):
    session_id = str(uuid.uuid4())
    sessions[session_id] = {
        "id": session_id,
        "participant_id": request.participant_id,
        "session_name": request.session_name or f"Session-{session_id[:8]}",
        "created_at": datetime.utcnow().isoformat(),
        "pipeline": MultimodalFusionPipeline(),
        "metrics": SessionMetrics(session_id=session_id),
        "status": "active",
        "frame_count": 0,
        "alerts": [],
    }

    logger.info(f"Sessao criada: {session_id}")
    return SessionStartResponse(
        session_id=session_id,
        ws_url=f"ws://{settings.HOST}:{settings.PORT}/ws/{session_id}",
        created_at=sessions[session_id]["created_at"],
    )


@app.post("/session/{session_id}/stop")
async def stop_session(session_id: str):
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Sessao nao encontrada")

    session = sessions[session_id]
    session["status"] = "completed"
    summary = session["pipeline"].get_session_summary(session_id)

    return {
        "session_id": session_id,
        "status": "completed",
        "summary": {
            "total_frames": summary.total_frames,
            "avg_incongruence": round(summary.avg_incongruence, 2),
            "max_incongruence": round(summary.max_incongruence, 2),
            "incident_count": summary.incident_count,
            "emotion_distribution": summary.emotion_distribution,
            "stress_peaks": summary.stress_peaks,
        },
    }


@app.get("/session/{session_id}/report")
async def get_report(session_id: str):
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Sessao nao encontrada")

    session = sessions[session_id]
    summary = session["pipeline"].get_session_summary(session_id)

    return {
        "session_id": session_id,
        "session_name": session["session_name"],
        "participant_id": session["participant_id"],
        "created_at": session["created_at"],
        "status": session["status"],
        "metrics": {
            "total_frames": summary.total_frames,
            "avg_incongruence": round(summary.avg_incongruence, 2),
            "max_incongruence": round(summary.max_incongruence, 2),
            "incident_count": summary.incident_count,
            "emotion_distribution": summary.emotion_distribution,
            "stress_peaks": summary.stress_peaks,
        },
    }


@app.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    await websocket.accept()

    if session_id not in sessions:
        await websocket.close(code=4004, reason="Sessao nao encontrada")
        return

    session = sessions[session_id]
    pipeline = session["pipeline"]

    logger.info(f"WebSocket conectado: sessao {session_id}")

    try:
        while session["status"] == "active":
            try:
                message = await asyncio.wait_for(websocket.receive_json(), timeout=0.1)
                await _handle_client_message(websocket, session, message)
            except asyncio.TimeoutError:
                pass

            if session["frame_count"] > 0 and session["frame_count"] % 30 == 0:
                await _send_status_update(websocket, session)

            await asyncio.sleep(0.016)

    except WebSocketDisconnect:
        logger.info(f"WebSocket desconectado: sessao {session_id}")
    except Exception as e:
        logger.error(f"WebSocket erro: {e}")
        await websocket.close(code=1011, reason=str(e))


async def _handle_client_message(websocket: WebSocket, session: dict, message: dict):
    msg_type = message.get("type", "")

    if msg_type == "frame_data":
        await _process_frame(websocket, session, message)
    elif msg_type == "audio_chunk":
        await _process_audio(websocket, session, message)
    elif msg_type == "transcript":
        await _process_transcript(websocket, session, message)
    elif msg_type == "multi_modal":
        await _process_multi_modal(websocket, session, message)
    elif msg_type == "ping":
        await websocket.send_json({"type": "pong", "timestamp": datetime.utcnow().isoformat()})


async def _process_frame(session_ws: WebSocket, session: dict, message: dict):
    import base64
    import numpy as np

    pipeline = session["pipeline"]
    session["frame_count"] += 1

    frame_b64 = message.get("frame", "")
    width = message.get("width", 640)
    height = message.get("height", 480)

    if frame_b64:
        try:
            frame_bytes = base64.b64decode(frame_b64)
            frame_np = np.frombuffer(frame_bytes, dtype=np.uint8).reshape(height, width, 3)
            result = pipeline.process_frame(frame_rgb=frame_np, session_id=session["id"])
            await _send_result(session_ws, result, session)
        except Exception as e:
            logger.error(f"Erro ao processar frame: {e}")


async def _process_audio(session_ws: WebSocket, session: dict, message: dict):
    import base64
    import numpy as np

    pipeline = session["pipeline"]

    audio_b64 = message.get("audio", "")
    if audio_b64:
        try:
            audio_bytes = base64.b64decode(audio_b64)
            audio_np = np.frombuffer(_strip_wav_header(audio_bytes), dtype=np.int16)
            result = pipeline.process_frame(audio_chunk=audio_np, session_id=session["id"])
            await _send_result(session_ws, result, session)
        except Exception as e:
            logger.error(f"Erro ao processar audio: {e}")


async def _process_transcript(session_ws: WebSocket, session: dict, message: dict):
    pipeline = session["pipeline"]

    text = message.get("text", "")
    if text:
        try:
            result = pipeline.process_frame(transcript=text, session_id=session["id"])
            await _send_result(session_ws, result, session)
        except Exception as e:
            logger.error(f"Erro ao processar texto: {e}")


async def _process_multi_modal(session_ws: WebSocket, session: dict, message: dict):
    import base64
    import numpy as np

    pipeline = session["pipeline"]
    session["frame_count"] += 1

    frame_b64 = message.get("frame")
    audio_b64 = message.get("audio")
    text = message.get("text")
    width = message.get("width", 640)
    height = message.get("height", 480)

    frame_np = None
    audio_np = None

    if frame_b64:
        try:
            frame_bytes = base64.b64decode(frame_b64)
            frame_np = np.frombuffer(frame_bytes, dtype=np.uint8).reshape(height, width, 3)
        except Exception:
            pass

    if audio_b64:
        try:
            audio_bytes = base64.b64decode(audio_b64)
            audio_np = np.frombuffer(_strip_wav_header(audio_bytes), dtype=np.int16)
        except Exception:
            pass

    try:
        result = pipeline.process_frame(
            frame_rgb=frame_np,
            audio_chunk=audio_np,
            transcript=text,
            session_id=session["id"],
        )
        await _send_result(session_ws, result, session)
    except Exception as e:
        logger.error(f"Erro ao processar multimodal: {e}")


def _strip_wav_header(audio_bytes: bytes) -> bytes:
    if len(audio_bytes) >= 12 and audio_bytes[:4] == b"RIFF":
        header_size = 44
        if len(audio_bytes) > header_size:
            return audio_bytes[header_size:]
    return audio_bytes


async def _send_result(ws: WebSocket, result: FusionResult, session: dict):
    alert_level = "normal"
    if result.incongruence_score >= settings.INCONGRUENCE_CRITICAL_THRESHOLD:
        alert_level = "critical"
    elif result.incongruence_score >= settings.INCONGRUENCE_ALERT_THRESHOLD:
        alert_level = "warning"

    if alert_level != "normal":
        session["alerts"].append({
            "timestamp": datetime.utcnow().isoformat(),
            "score": result.incongruence_score,
            "level": alert_level,
        })

    response = {
        "type": "analysis_result",
        "timestamp": datetime.utcnow().isoformat(),
        "frame_number": session["frame_count"],
        "data": {
            "incongruence_score": round(result.incongruence_score, 2),
            "emotion": result.emotion.value,
            "emotion_confidence": round(result.emotion_confidence, 4),
            "stress_level": round(result.stress_level, 2),
            "modality_agreement": round(result.modality_agreement, 4),
            "micro_expressions": result.micro_expressions,
            "alert_level": alert_level,
        },
    }

    await ws.send_json(response)


async def _send_status_update(ws: WebSocket, session: dict):
    summary = session["pipeline"].get_session_summary(session["id"])
    await ws.send_json({
        "type": "status_update",
        "timestamp": datetime.utcnow().isoformat(),
        "data": {
            "total_frames": summary.total_frames,
            "avg_incongruence": round(summary.avg_incongruence, 2),
            "incident_count": summary.incident_count,
            "session_status": session["status"],
        },
    })

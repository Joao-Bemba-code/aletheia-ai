import numpy as np
from typing import Optional
from models.schemas import FacialFeatures


class FacialAnalyzer:
    def __init__(self):
        self.mp_tasks = None
        self.face_landmarker = None
        self._has_face_landmarker = False
        self._prev_landmarks: Optional[np.ndarray] = None
        self._blink_buffer: list[float] = []
        self._micro_expression_buffer: list[dict] = []

        self.LEFT_EYE = [33, 160, 158, 133, 153, 144]
        self.RIGHT_EYE = [362, 385, 387, 263, 373, 380]
        self.MOUTH = [13, 14, 78, 308]
        self.NOSE_TIP = 1
        self.FOREHEAD = 10
        self.CHIN = 152

        self._init_face_landmarker()

    def _init_face_landmarker(self):
        try:
            import mediapipe as mp
            from mediapipe.tasks import python as mp_python
            from mediapipe.tasks.python import vision

            model_path = None
            candidate_paths = [
                "models/face_landmarker.task",
                "models/saved/face_landmarker.task",
            ]
            import os
            for path in candidate_paths:
                if os.path.exists(path):
                    model_path = path
                    break

            if model_path is None:
                self._has_face_landmarker = False
                return

            base_options = mp_python.BaseOptions(model_asset_path=model_path)
            options = vision.FaceLandmarkerOptions(
                base_options=base_options,
                output_face_blendshapes=True,
                output_facial_transformation_matrixes=True,
                num_faces=1,
                min_face_detection_confidence=0.5,
                min_face_presence_confidence=0.5,
                min_tracking_confidence=0.5,
            )
            self.face_landmarker = vision.FaceLandmarker.create_from_options(options)
            self._has_face_landmarker = True
            print("[FacialAnalyzer] FaceLandmarker carregado com sucesso")
        except Exception as e:
            self._has_face_landmarker = False
            print(f"[FacialAnalyzer] FaceLandmarker indisponivel: {e}")

    def analyze_frame(self, frame_rgb: np.ndarray) -> FacialFeatures:
        if not self._has_face_landmarker:
            return FacialFeatures(landmarks=np.array([]))

        try:
            from mediapipe.tasks.python import vision
            mp_image = vision.Image(
                image_format=vision.ImageFormat.SRGB,
                data=frame_rgb,
            )
            results = self.face_landmarker.detect(mp_image)
        except Exception:
            return FacialFeatures(landmarks=np.array([]))

        if not results.face_landmarks:
            return FacialFeatures(landmarks=np.array([]))

        landmarks_np = np.array(
            results.face_landmarks[0], dtype=np.float32
        )
        if landmarks_np.size == 0:
            return FacialFeatures(landmarks=np.array([]))

        ear = self._compute_eye_aspect_ratio(landmarks_np)
        mar = self._compute_mouth_aspect_ratio(landmarks_np)
        head_pose = self._compute_head_pose(landmarks_np)
        gaze = self._compute_gaze_direction(landmarks_np)
        blink_rate = self._track_blinks(ear)
        micro_expressions = self._detect_micro_expressions(landmarks_np)

        self._prev_landmarks = landmarks_np

        return FacialFeatures(
            landmarks=landmarks_np,
            micro_expressions=micro_expressions,
            eye_aspect_ratio=ear,
            mouth_aspect_ratio=mar,
            head_pose=head_pose,
            blink_rate=blink_rate,
            gaze_direction=gaze,
        )

    def _compute_eye_aspect_ratio(self, landmarks: np.ndarray) -> float:
        left_pts = landmarks[self.LEFT_EYE]
        right_pts = landmarks[self.RIGHT_EYE]

        def ear(eye_pts):
            v1 = np.linalg.norm(eye_pts[1] - eye_pts[5])
            v2 = np.linalg.norm(eye_pts[2] - eye_pts[4])
            h = np.linalg.norm(eye_pts[0] - eye_pts[3])
            return (v1 + v2) / (2.0 * h) if h > 1e-6 else 0.0

        return (ear(left_pts) + ear(right_pts)) / 2.0

    def _compute_mouth_aspect_ratio(self, landmarks: np.ndarray) -> float:
        mouth_pts = landmarks[self.MOUTH]
        vertical = np.linalg.norm(mouth_pts[0] - mouth_pts[1])
        horizontal = np.linalg.norm(mouth_pts[2] - mouth_pts[3])
        return vertical / horizontal if horizontal > 1e-6 else 0.0

    def _compute_head_pose(self, landmarks: np.ndarray) -> dict:
        nose = landmarks[self.NOSE_TIP]
        forehead = landmarks[self.FOREHEAD]
        chin = landmarks[self.CHIN]

        pitch = np.arctan2(chin[1] - nose[1], chin[2] - nose[2]) * (180.0 / np.pi)
        yaw = np.arctan2(nose[0] - forehead[0], nose[2] - forehead[2]) * (180.0 / np.pi)
        roll = np.arctan2(forehead[0] - nose[0], forehead[1] - nose[1]) * (180.0 / np.pi)

        return {"pitch": float(pitch), "yaw": float(yaw), "roll": float(roll)}

    def _compute_gaze_direction(self, landmarks: np.ndarray) -> dict:
        left_eye_center = np.mean(landmarks[self.LEFT_EYE], axis=0)
        right_eye_center = np.mean(landmarks[self.RIGHT_EYE], axis=0)
        eye_center = (left_eye_center + right_eye_center) / 2.0
        nose_tip = landmarks[self.NOSE_TIP]

        gaze_x = float(nose_tip[0] - eye_center[0])
        gaze_y = float(nose_tip[1] - eye_center[1])
        norm = np.sqrt(gaze_x ** 2 + gaze_y ** 2) + 1e-6

        return {"x": gaze_x / norm, "y": gaze_y / norm}

    def _track_blinks(self, ear: float) -> float:
        BLINK_THRESHOLD = 0.21
        self._blink_buffer.append(1.0 if ear < BLINK_THRESHOLD else 0.0)
        if len(self._blink_buffer) > 30:
            self._blink_buffer.pop(0)
        return sum(self._blink_buffer) / max(len(self._blink_buffer), 1)

    def _detect_micro_expressions(self, landmarks: np.ndarray) -> list[dict]:
        micro_expressions = []

        if self._prev_landmarks is None:
            return micro_expressions

        movement = np.abs(landmarks - self._prev_landmarks)
        avg_movement = np.mean(movement)

        HIGH_MOVEMENT_THRESHOLD = 0.02
        DURATION_THRESHOLD = 6

        if avg_movement > HIGH_MOVEMENT_THRESHOLD:
            region_movements = {
                "eyebrows": np.mean(movement[17:27]),
                "eyes": np.mean(movement[self.LEFT_EYE + self.RIGHT_EYE]),
                "mouth": np.mean(movement[self.MOUTH]),
                "jaw": np.mean(movement[0:17]),
            }

            dominant_region = max(region_movements, key=region_movements.get)
            intensity = float(region_movements[dominant_region])

            self._micro_expression_buffer.append({
                "region": dominant_region,
                "intensity": intensity,
                "frame_count": 1,
            })

            if len(self._micro_expression_buffer) >= DURATION_THRESHOLD:
                recent = self._micro_expression_buffer[-DURATION_THRESHOLD:]
                avg_intensity = np.mean([m["intensity"] for m in recent])

                if avg_intensity > HIGH_MOVEMENT_THRESHOLD * 1.5:
                    micro_expressions.append({
                        "type": dominant_region,
                        "intensity": float(avg_intensity),
                        "duration_frames": DURATION_THRESHOLD,
                        "classification": self._classify_micro_expression(dominant_region, avg_intensity),
                    })
                self._micro_expression_buffer.clear()
        else:
            self._micro_expression_buffer.clear()

        return micro_expressions

    def _classify_micro_expression(self, region: str, intensity: float) -> str:
        classification_map = {
            "eyebrows": "surprise/concern" if intensity > 0.03 else "subtle_attention",
            "eyes": "fear/disgust" if intensity > 0.03 else "alertness_shift",
            "mouth": "contempt/suppressed_emotion" if intensity > 0.03 else "micro_smile",
            "jaw": "tension/stress" if intensity > 0.03 else "subtle_tension",
        }
        return classification_map.get(region, "unclassified")

    def extract_feature_vector(self, features: FacialFeatures) -> np.ndarray:
        target_dim = 128
        if features.landmarks.size == 0:
            return np.zeros(target_dim, dtype=np.float32)

        flat = features.landmarks.flatten().astype(np.float32)
        flat = (flat - np.mean(flat)) / (np.std(flat) + 1e-6)

        if len(flat) >= target_dim:
            stride = len(flat) // target_dim
            n = stride * target_dim
            binned = flat[:n].reshape(target_dim, stride)
            return np.mean(binned, axis=1).astype(np.float32)

        padded = np.zeros(target_dim, dtype=np.float32)
        padded[: len(flat)] = flat
        return padded

    def reset(self):
        self._prev_landmarks = None
        self._blink_buffer.clear()
        self._micro_expression_buffer.clear()
import numpy as np
import librosa
from typing import Optional
from models.schemas import AudioFeatures


class AudioAnalyzer:
    def __init__(self):
        self.sample_rate = 16000
        self.hop_length = 512
        self.n_mels = 128
        self.n_fft = 2048
        self._pitch_buffer: list[float] = []
        self._energy_buffer: list[float] = []
        self._silence_threshold = 0.01
        self._min_silence_duration = 0.3

    def analyze_chunk(self, audio_chunk: np.ndarray) -> AudioFeatures:
        if audio_chunk.size == 0:
            return AudioFeatures()

        audio_float = audio_chunk.astype(np.float32)
        if np.max(np.abs(audio_float)) > 1.0:
            audio_float = audio_float / 32768.0

        mel_spec = self._compute_mel_spectrogram(audio_float)
        pitch = self._extract_pitch(audio_float)
        energy = self._compute_energy(audio_float)
        speech_rate = self._estimate_speech_rate(audio_float)
        pause_ratio = self._compute_pause_ratio(audio_float)
        jitter = self._compute_jitter(pitch)
        shimmer = self._compute_shimmer(audio_float)
        mfcc = self._compute_mfcc(audio_float)
        embedding = self._compute_audio_embedding(mel_spec)

        return AudioFeatures(
            mel_spectrogram=mel_spec,
            pitch_contour=pitch,
            energy=energy,
            speech_rate=speech_rate,
            pause_ratio=pause_ratio,
            jitter=jitter,
            shimmer=shimmer,
            mfcc=mfcc,
            embedding=embedding,
        )

    def _compute_mel_spectrogram(self, audio: np.ndarray) -> np.ndarray:
        mel_spec = librosa.feature.melspectrogram(
            y=audio,
            sr=self.sample_rate,
            n_mels=self.n_mels,
            n_fft=self.n_fft,
            hop_length=self.hop_length,
        )
        mel_spec_db = librosa.power_to_db(mel_spec, ref=np.max)
        return mel_spec_db.astype(np.float32)

    def _extract_pitch(self, audio: np.ndarray) -> np.ndarray:
        pitches, magnitudes = librosa.piptrack(
            y=audio,
            sr=self.sample_rate,
            hop_length=self.hop_length,
            fmin=50,
            fmax=500,
        )
        pitch_contour = []
        for t in range(pitches.shape[1]):
            idx = magnitudes[:, t].argmax()
            pitch_val = pitches[idx, t] if magnitudes[idx, t] > 0 else 0.0
            pitch_contour.append(pitch_val)

        pitch_array = np.array(pitch_contour, dtype=np.float32)
        self._pitch_buffer.extend(pitch_array.tolist())
        if len(self._pitch_buffer) > 1000:
            self._pitch_buffer = self._pitch_buffer[-1000:]

        return pitch_array

    def _compute_energy(self, audio: np.ndarray) -> float:
        energy = float(np.sqrt(np.mean(audio ** 2)))
        self._energy_buffer.append(energy)
        if len(self._energy_buffer) > 100:
            self._energy_buffer.pop(0)
        return energy

    def _estimate_speech_rate(self, audio: np.ndarray) -> float:
        onset_env = librosa.onset.onset_strength(y=audio, sr=self.sample_rate)
        onsets = librosa.onset.onset_detect(
            onset_envelope=onset_env,
            sr=self.sample_rate,
            hop_length=self.hop_length,
        )
        duration = len(audio) / self.sample_rate
        return len(onsets) / duration if duration > 0 else 0.0

    def _compute_pause_ratio(self, audio: np.ndarray) -> float:
        frame_length = int(self.sample_rate * 0.025)
        hop = int(self.sample_rate * 0.010)
        frames = librosa.util.frame(audio, frame_length=frame_length, hop_length=hop)
        rms = np.sqrt(np.mean(frames ** 2, axis=0))
        silent_frames = np.sum(rms < self._silence_threshold)
        return silent_frames / len(rms) if len(rms) > 0 else 0.0

    def _compute_jitter(self, pitch: np.ndarray) -> float:
        voiced = pitch[pitch > 0]
        if len(voiced) < 3:
            return 0.0
        diffs = np.abs(np.diff(voiced))
        return float(np.mean(diffs) / np.mean(voiced)) if np.mean(voiced) > 0 else 0.0

    def _compute_shimmer(self, audio: np.ndarray) -> float:
        frame_length = int(self.sample_rate * 0.025)
        hop = int(self.sample_rate * 0.010)
        frames = librosa.util.frame(audio, frame_length=frame_length, hop_length=hop)
        amplitudes = np.max(np.abs(frames), axis=0)
        voiced = amplitudes[amplitudes > self._silence_threshold]
        if len(voiced) < 3:
            return 0.0
        diffs = np.abs(np.diff(voiced))
        return float(np.mean(diffs) / np.mean(voiced)) if np.mean(voiced) > 0 else 0.0

    def _compute_mfcc(self, audio: np.ndarray) -> np.ndarray:
        mfccs = librosa.feature.mfcc(
            y=audio,
            sr=self.sample_rate,
            n_mfcc=13,
            n_fft=self.n_fft,
            hop_length=self.hop_length,
        )
        delta_mfcc = librosa.feature.delta(mfccs)
        delta2_mfcc = librosa.feature.delta(mfccs, order=2)
        combined = np.vstack([mfccs, delta_mfcc, delta2_mfcc])
        return combined.astype(np.float32)

    def _compute_audio_embedding(self, mel_spec: np.ndarray) -> np.ndarray:
        pooled = np.mean(mel_spec, axis=1)
        normalized = (pooled - np.mean(pooled)) / (np.std(pooled) + 1e-8)
        embedding_dim = 768
        if len(normalized) >= embedding_dim:
            return normalized[:embedding_dim].astype(np.float32)
        padded = np.zeros(embedding_dim, dtype=np.float32)
        padded[: len(normalized)] = normalized
        return padded

    def extract_feature_vector(self, features: AudioFeatures) -> np.ndarray:
        parts = [
            features.mfcc.flatten()[:200],
            np.array([features.energy, features.speech_rate, features.pause_ratio,
                       features.jitter, features.shimmer], dtype=np.float32),
            features.embedding[:768],
        ]
        concatenated = np.concatenate(parts)
        target_dim = 768
        if len(concatenated) >= target_dim:
            return concatenated[:target_dim]
        padded = np.zeros(target_dim, dtype=np.float32)
        padded[: len(concatenated)] = concatenated
        return padded

    def reset(self):
        self._pitch_buffer.clear()
        self._energy_buffer.clear()

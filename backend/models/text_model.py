import numpy as np
import re
from typing import Optional
from models.schemas import TextFeatures


HESITATION_MARKERS = [
    "eh", "hm", "hmm", "uh", "ah", "umm", "err", "bom", "tipo",
    "sei la", "nao sei", "por assim dizer", "quer dizer", "ou seja",
]

STRESS_INDICATORS = [
    "nao", "nunca", "sempre", "todo", "absolutamente", "definitivamente",
    "impossivel", "certeza", "garantido", "juro", "swear",
]

COMPLEXITY_MARKERS = [
    "entretanto", "contudo", "por conseguinte", "ademais", "todavia",
    "conquanto", "n obstante", "a menos que", "a fim de que",
]


class TextAnalyzer:
    def __init__(self):
        self._vocabulary: dict[str, int] = {}
        self._semantic_buffer: list[np.ndarray] = []
        self._utterance_history: list[str] = []

    def analyze_text(self, text: str) -> TextFeatures:
        if not text or not text.strip():
            return TextFeatures()

        text_lower = text.lower().strip()
        words = text_lower.split()
        word_count = len(words)

        embedding = self._compute_tfidf_embedding(text_lower, word_count)
        sentiment = self._compute_sentiment_score(text_lower)
        hesitation_count = self._count_hesitations(text_lower)
        coherence = self._compute_coherence(text_lower)
        complexity = self._compute_semantic_complexity(text_lower)

        self._utterance_history.append(text_lower)
        if len(self._utterance_history) > 50:
            self._utterance_history.pop(0)

        return TextFeatures(
            embedding=embedding,
            sentiment_score=sentiment,
            word_count=word_count,
            hesitation_count=hesitation_count,
            coherence_score=coherence,
            semantic_complexity=complexity,
        )

    def _compute_tfidf_embedding(self, text: str, word_count: int) -> np.ndarray:
        words = text.split()
        vocab_size = 384
        embedding = np.zeros(vocab_size, dtype=np.float32)

        for word in words:
            hash_val = hash(word) % vocab_size
            embedding[hash_val] += 1.0

        if word_count > 0:
            embedding = embedding / word_count

        l2_norm = np.linalg.norm(embedding)
        if l2_norm > 0:
            embedding = embedding / l2_norm

        return embedding

    def _compute_sentiment_score(self, text: str) -> float:
        positive_words = {
            "bom", "otimo", "excelente", "feliz", "gosto", "prefiro",
            "concordo", "sim", "claro", "certamente", "possivel", "facil",
            "avançar", "progresso", "sucesso", "oportunidade", "confiança",
        }
        negative_words = {
            "mau", "terrivel", "horrivel", "triste", "odio", "nao",
            "discordo", "nunca", "impossivel", "difcil", "problema",
            "erro", "falha", "preocupacao", "risco", "ameaça", "stress",
        }

        words = set(text.split())
        pos_count = len(words & positive_words)
        neg_count = len(words & negative_words)
        total = pos_count + neg_count

        if total == 0:
            return 0.0

        return (pos_count - neg_count) / total

    def _count_hesitations(self, text: str) -> int:
        count = 0
        for marker in HESITATION_MARKERS:
            count += text.count(marker)
        ellipsis_count = text.count("...")
        count += ellipsis_count
        return count

    def _compute_coherence(self, text: str) -> float:
        words = text.split()
        if len(words) < 3:
            return 0.5

        unique_ratio = len(set(words)) / len(words)

        sentence_ending = text.count(".") + text.count("!") + text.count("?")
        has_proper_structure = 1 if sentence_ending > 0 or len(words) < 10 else 0

        word_variety = min(unique_ratio * 2.0, 1.0)

        stress_count = sum(1 for w in STRESS_INDICATORS if w in text)
        stress_penalty = min(stress_count * 0.05, 0.3)

        coherence = (word_variety * 0.5 + has_proper_structure * 0.3 + 0.2) - stress_penalty
        return float(np.clip(coherence, 0.0, 1.0))

    def _compute_semantic_complexity(self, text: str) -> float:
        words = text.split()
        if not words:
            return 0.0

        avg_word_length = np.mean([len(w) for w in words])
        length_score = min(avg_word_length / 8.0, 1.0)

        complex_word_count = sum(1 for w in words if len(w) > 8)
        complex_ratio = complex_word_count / len(words)

        marker_count = sum(1 for m in COMPLEXITY_MARKERS if m in text)
        marker_score = min(marker_count * 0.15, 1.0)

        score = (length_score * 0.3 + complex_ratio * 0.4 + marker_score * 0.3)
        return float(np.clip(score, 0.0, 1.0))

    def extract_feature_vector(self, features: TextFeatures) -> np.ndarray:
        parts = [
            features.embedding[:384],
            np.array([
                features.sentiment_score,
                min(features.word_count / 100.0, 1.0),
                min(features.hesitation_count / 10.0, 1.0),
                features.coherence_score,
                features.semantic_complexity,
            ], dtype=np.float32),
        ]
        concatenated = np.concatenate(parts)
        target_dim = 384
        if len(concatenated) >= target_dim:
            return concatenated[:target_dim]
        padded = np.zeros(target_dim, dtype=np.float32)
        padded[: len(concatenated)] = concatenated
        return padded

    def reset(self):
        self._semantic_buffer.clear()
        self._utterance_history.clear()

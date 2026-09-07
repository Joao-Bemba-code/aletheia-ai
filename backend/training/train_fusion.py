import numpy as np
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from config.settings import settings


def _pick_emotion_label(counts: np.ndarray) -> int:
    cumulative = np.cumsum(counts)
    random_val = np.random.rand()
    emotion_idx = int(np.searchsorted(cumulative, random_val * cumulative[-1]))
    return emotion_idx % 8


def generate_simulated_facial_data(n_samples: int = 3000) -> tuple[np.ndarray, np.ndarray]:
    np.random.seed(42)
    n_features = settings.FACIAL_FEATURES
    X = np.random.randn(n_samples, n_features).astype(np.float32) * 0.05

    emotion_blocks = {
        0: (slice(0, 16), -0.35),
        1: (slice(16, 32), -0.15),
        2: (slice(32, 48), 0.35),
        3: (slice(48, 64), -0.30),
        4: (slice(64, 80), -0.20),
        5: (slice(80, 96), -0.35),
        6: (slice(96, 112), -0.45),
        7: (slice(112, 128), 0.45),
    }

    labels = np.zeros(n_samples, dtype=np.int32)
    for i in range(n_samples):
        emotion_idx = np.random.randint(0, 8)
        labels[i] = emotion_idx
        block, value = emotion_blocks[emotion_idx]
        X[i, block] += value * np.random.uniform(0.8, 1.2)

    return X, labels


def generate_simulated_audio_data(n_samples: int = 3000) -> np.ndarray:
    np.random.seed(43)
    n_features = settings.AUDIO_FEATURES
    X = np.random.randn(n_samples, n_features).astype(np.float32) * 0.05

    emotion_blocks = {
        0: (slice(0, 16), 0.10),
        1: (slice(16, 32), -0.15),
        2: (slice(32, 48), 0.30),
        3: (slice(48, 64), -0.25),
        4: (slice(64, 80), 0.45),
        5: (slice(80, 96), -0.30),
        6: (slice(96, 112), -0.35),
        7: (slice(112, 128), 0.35),
    }

    for i in range(n_samples):
        emotion_idx = np.random.randint(0, 8)
        block, value = emotion_blocks[emotion_idx]
        X[i, block] += value * np.random.uniform(1.5, 2.0)

    return X


def generate_simulated_text_data(n_samples: int = 3000) -> np.ndarray:
    np.random.seed(44)
    n_features = settings.TEXT_FEATURES
    X = np.random.randn(n_samples, n_features).astype(np.float32) * 0.05

    emotion_blocks = {
        0: (slice(0, 16), 0.05),
        1: (slice(16, 32), -0.10),
        2: (slice(32, 48), 0.20),
        3: (slice(48, 64), -0.20),
        4: (slice(64, 80), 0.35),
        5: (slice(80, 96), -0.25),
        6: (slice(96, 112), -0.30),
        7: (slice(112, 128), 0.30),
    }

    for i in range(n_samples):
        emotion_idx = np.random.randint(0, 8)
        block, value = emotion_blocks[emotion_idx]
        X[i, block] += value * np.random.uniform(1.2, 1.8)

    return X


def generate_incongruence_labels(
    facial: np.ndarray, audio: np.ndarray, text: np.ndarray
) -> np.ndarray:
    np.random.seed(46)
    n = facial.shape[0]

    facial_variance = np.var(facial, axis=1)
    audio_variance = np.var(audio, axis=1)
    text_variance = np.var(text, axis=1)

    disagreement = np.abs(facial_variance - audio_variance)
    agreement_text = np.abs(audio_variance - text_variance)

    score = disagreement * 30 + agreement_text * 20 - 6
    score = score + np.random.rand(n) * 4
    score = np.clip(score, 0, 100)

    target_positive = int(n * 0.30)
    threshold = np.partition(score, n - target_positive)[n - target_positive]

    labels = np.zeros(n, dtype=np.float32)
    labels[score >= threshold] = 1.0

    if np.max(labels) == 0:
        labels[np.argsort(score)[-target_positive:]] = 1.0
    if np.min(labels) == 1:
        labels[np.argsort(score)[:n - target_positive]] = 0.0

    return labels


def train_fusion_model():
    print("=" * 60)
    print("ALETHEIA AI - Treino do Modelo de Fusao Multimodal")
    print("=" * 60)

    n_samples = 3000
    print(f"\n[1/6] Gerando dados simulados ({n_samples} amostras)...")

    facial_data, emotion_labels = generate_simulated_facial_data(n_samples)
    audio_data = generate_simulated_audio_data(n_samples)
    text_data = generate_simulated_text_data(n_samples)

    print(f"  Facial: {facial_data.shape}")
    print(f"  Audio:  {audio_data.shape}")
    print(f"  Texto:  {text_data.shape}")
    print(f"  Labels: {emotion_labels.shape}")

    print("\n[2/6] Gerando labels de incongruencia...")
    incongruence_labels = generate_incongruence_labels(facial_data, audio_data, text_data)
    print(f"  Incongruencia: {incongruence_labels.shape}")
    print(f"  Amostras incongruentes: {int(np.sum(incongruence_labels))} ({np.mean(incongruence_labels)*100:.1f}%)")

    print("\n[3/6] Concatenando features para fusao tardia...")
    fused_features = np.hstack([facial_data, audio_data, text_data]).astype(np.float32)
    print(f"  Features fundidas: {fused_features.shape}")

    print("\n[4/6] Treinando XGBoost para classificacao de emocao...")
    import xgboost as xgb
    from sklearn.model_selection import train_test_split
    from sklearn.metrics import accuracy_score

    X_train, X_test, y_train, y_test = train_test_split(
        fused_features, emotion_labels, test_size=0.2, random_state=42, stratify=emotion_labels
    )

    emotion_clf = xgb.XGBClassifier(
        n_estimators=120,
        max_depth=6,
        learning_rate=0.1,
        objective="multi:softprob",
        num_class=8,
        eval_metric="mlogloss",
        tree_method="hist",
        random_state=42,
    )

    emotion_clf.fit(X_train, y_train, verbose=False)

    y_pred = emotion_clf.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    print(f"  Acuracia (emocao): {accuracy:.4f}")

    print("\n[5/6] Treinando XGBoost para deteccao de incongruencia...")
    X_train_inc, X_test_inc, y_train_inc, y_test_inc = train_test_split(
        fused_features, incongruence_labels, test_size=0.2, random_state=42
    )

    incongruence_clf = xgb.XGBClassifier(
        n_estimators=120,
        max_depth=6,
        learning_rate=0.1,
        objective="binary:logistic",
        eval_metric="logloss",
        tree_method="hist",
        random_state=42,
        scale_pos_weight=float((1 - np.mean(y_train_inc)) / (np.mean(y_train_inc) + 1e-6)),
    )

    incongruence_clf.fit(X_train_inc, y_train_inc, verbose=False)

    y_pred_inc = incongruence_clf.predict(X_test_inc)
    inc_accuracy = accuracy_score(y_test_inc, y_pred_inc)
    print(f"  Acuracia (incongruencia): {inc_accuracy:.4f}")

    print("\n[6/6] Salvando modelos...")
    save_dir = Path(__file__).resolve().parent.parent / "models" / "saved"
    save_dir.mkdir(parents=True, exist_ok=True)

    emotion_model_path = save_dir / "xgboost_emotion.json"
    emotion_clf.save_model(str(emotion_model_path))
    print(f"  Modelo de emocao: {emotion_model_path}")

    incongruence_model_path = save_dir / "xgboost_incongruence.json"
    incongruence_clf.save_model(str(incongruence_model_path))
    print(f"  Modelo de incongruencia: {incongruence_model_path}")

    metadata = {
        "emotion_accuracy": float(accuracy),
        "incongruence_accuracy": float(inc_accuracy),
        "n_samples": n_samples,
        "facial_features": settings.FACIAL_FEATURES,
        "audio_features": settings.AUDIO_FEATURES,
        "text_features": settings.TEXT_FEATURES,
        "total_features": fused_features.shape[1],
        "emotion_labels": settings.EMOTION_LABELS,
        "feature_importance_emotion": {
            f"feature_{i}": float(v)
            for i, v in enumerate(emotion_clf.feature_importances_[:20])
        },
    }

    metadata_path = save_dir / "training_metadata.json"
    with open(metadata_path, "w") as f:
        json.dump(metadata, f, indent=2)
    print(f"  Metadata: {metadata_path}")

    print("\n" + "=" * 60)
    print("TREINO CONCLUIDO COM SUCESSO")
    print("=" * 60)
    print(f"  Emocao: {accuracy:.2%} acuracia")
    print(f"  Incongruencia: {inc_accuracy:.2%} acuracia")
    print(f"  Modelos salvos em: {save_dir}")


if __name__ == "__main__":
    train_fusion_model()
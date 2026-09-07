import { useEffect, useRef } from 'react';
import { File } from 'expo-file-system';
import {
  requestRecordingPermissionsAsync,
  useAudioRecorder,
  AudioQuality,
} from 'expo-audio';
import { useAletheiaStore } from '@/src/store/aletheiaStore';
import { AUDIO_CHUNK_MS, AUDIO_SAMPLE_RATE } from '@/src/config';

interface AudioCaptureOptions {
  enabled: boolean;
}

const RIFF_PREFIX_B64 = 'UklGRi';

export function useAudioCapture({ enabled }: AudioCaptureOptions) {
  const sendFrame = useAletheiaStore((s) => s.sendFrame);
  const runningRef = useRef(false);

  const recorder = useAudioRecorder(
    {
      extension: '.wav',
      sampleRate: AUDIO_SAMPLE_RATE,
      numberOfChannels: 1,
      bitRate: 16000,
      android: {
        outputFormat: 'mpeg4',
        audioEncoder: 'aac',
      },
      ios: {
        extension: '.m4a',
        outputFormat: 'aac',
        audioQuality: AudioQuality.MAX,
        sampleRate: AUDIO_SAMPLE_RATE,
      },
      web: {},
    },
    () => {},
  );

  useEffect(() => {
    requestRecordingPermissionsAsync().catch(() => {});
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    runningRef.current = true;

    const loop = async () => {
      await recorder.prepareToRecordAsync().catch(() => {});
      await waitMs(200);
      while (!cancelled) {
        try {
          recorder.record({ forDuration: AUDIO_CHUNK_MS / 1000 });
          await waitMs(AUDIO_CHUNK_MS + 250);
          await recorder.stop();
          if (recorder.uri) {
            const b64 = await new File(recorder.uri).base64();
            if (b64.length > 100 && b64.startsWith(RIFF_PREFIX_B64)) {
              sendFrame({
                type: 'multi_modal',
                audio: b64,
                width: 0,
                height: 0,
              });
            }
          }
          await recorder.prepareToRecordAsync().catch(() => {});
        } catch {
          await recorder.prepareToRecordAsync().catch(() => {});
        }
      }
    };

    void loop();

    return () => {
      cancelled = true;
      runningRef.current = false;
      recorder.stop().catch(() => {});
    };
  }, [enabled, recorder, sendFrame]);

  return { running: runningRef.current };
}

function waitMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
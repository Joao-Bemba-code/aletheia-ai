import { useCallback, useEffect, useRef } from 'react';
import { useAletheiaStore, WebSocketRef } from '@/src/store/aletheiaStore';
import { IS_EXPO_GO, FRAME_INTERVAL_MS } from '@/src/config';

const CAPTURE_INTERVAL_MS = FRAME_INTERVAL_MS;

interface CaptureOptions {
  enabled: boolean;
  width?: number;
  height?: number;
}

export function useCaptureLoop({ enabled, width = 640, height = 480 }: CaptureOptions) {
  if (IS_EXPO_GO) {
    return useDemoCaptureLoop({ enabled, width, height });
  }
  return useRealCaptureLoop({ enabled, width, height });
}

function useRealCaptureLoop({ enabled, width, height }: Required<CaptureOptions>) {
  const api = require('react-native-vision-camera');
  const FsFile = require('expo-file-system').File;
  const { useCameraDevice, useCameraPermission } = api;
  const { Camera } = api;

  const device = useCameraDevice('front');
  const { hasPermission, requestPermission } = useCameraPermission();
  const cameraRef = useRef<InstanceType<typeof Camera> | null>(null);
  const isCapturing = useRef(false);

  const wsConnected = useAletheiaStore((s) => s.connected);
  const captureActive = useAletheiaStore((s) => s.captureActive);
  const sendFrame = useAletheiaStore((s) => s.sendFrame);

  const takePhotoAndSend = useCallback(async () => {
    const camera = cameraRef.current;
    if (!camera) return;
    if (isCapturing.current) return;
    isCapturing.current = true;

    try {
      const photo = await camera.takePhoto({
        flash: 'off',
        enableShutterSound: false,
      });

      const b64 = await new FsFile(photo.path).base64();

      sendFrame({
        type: 'multi_modal',
        frame: b64,
        width,
        height,
      });
    } catch {
      // skip frame on capture error
    } finally {
      isCapturing.current = false;
    }
  }, [sendFrame, width, height]);

  useEffect(() => {
    if (!enabled || !wsConnected || !captureActive) return;

    const timer = setInterval(takePhotoAndSend, CAPTURE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [enabled, wsConnected, captureActive, takePhotoAndSend]);

  useEffect(() => {
    if (hasPermission) return;
    requestPermission();
  }, [hasPermission, requestPermission]);

  return {
    device,
    hasPermission,
    cameraRef,
    demoMode: false,
  };
}

function useDemoCaptureLoop({ enabled, width, height }: Required<CaptureOptions>) {
  const wsConnected = useAletheiaStore((s) => s.connected);
  const captureActive = useAletheiaStore((s) => s.captureActive);

  useEffect(() => {
    if (!enabled || !wsConnected || !captureActive) return;

    const timer = setInterval(() => {
      const send = () => WebSocketRef.instance.sendFrame;
      send()({
        type: 'multi_modal',
        width,
        height,
      });
    }, CAPTURE_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [enabled, wsConnected, captureActive, width, height]);

  return {
    device: null,
    hasPermission: true,
    cameraRef: null,
    demoMode: true,
  };
}
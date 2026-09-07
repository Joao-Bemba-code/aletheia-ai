import { useEffect } from 'react';
import { Canvas, Circle, Group, Line, Path, RoundedRect, Skia, vec } from '@shopify/react-native-skia';
import { useDerivedValue, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { COLORS } from '@/src/theme';

interface ScannerOverlayProps {
  width: number;
  height: number;
  status: 'error' | 'idle' | 'scanning' | 'locked';
}

const RECT_W = 300;
const RECT_H = 340;

function statusColor(status: ScannerOverlayProps['status']): string {
  switch (status) {
    case 'error':
      return COLORS.danger;
    case 'locked':
      return COLORS.success;
    case 'scanning':
      return COLORS.accent;
    default:
      return COLORS.textMuted;
  }
}

export function ScannerOverlayReal({ width, height, status }: ScannerOverlayProps) {
  const cx = width / 2;
  const cy = height / 2;

  const sweep = useSharedValue(0);

  useEffect(() => {
    if (status === 'scanning') {
      sweep.value = 0;
      sweep.value = withRepeat(withTiming(1, { duration: 2400 }), -1, false);
    } else {
      sweep.value = withTiming(0, { duration: 250 });
    }
  }, [status, sweep]);

  const scanA = useDerivedValue(() => {
    const y = cy - RECT_H / 2 + sweep.value * RECT_H;
    return vec(cx - RECT_W / 2, y);
  });
  const scanB = useDerivedValue(() => {
    const y = cy - RECT_H / 2 + sweep.value * RECT_H;
    return vec(cx + RECT_W / 2, y);
  });

  const color = statusColor(status);

  return (
    <Canvas style={{ width, height }} pointerEvents="none">
      <Group>
        <RoundedRect
          x={cx - RECT_W / 2}
          y={cy - RECT_H / 2}
          width={RECT_W}
          height={RECT_H}
          r={16}
          color="transparent"
          style="stroke"
          strokeWidth={1}
          strokeJoin="round"
          opacity={0.5}
        />
        {status === 'scanning' && (
          <Line p1={scanA} p2={scanB} color={COLORS.accent} strokeWidth={2} opacity={0.7} />
        )}
        {status === 'locked' && (
          <Circle cx={cx} cy={cy} r={8} color={COLORS.success} style="fill" />
        )}
        {status === 'error' && (
          <Circle cx={cx} cy={cy} r={8} color={COLORS.danger} style="fill" />
        )}
      </Group>
    </Canvas>
  );
}
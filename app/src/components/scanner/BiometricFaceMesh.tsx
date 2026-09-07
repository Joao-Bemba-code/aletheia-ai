import { useEffect, useMemo } from 'react';
import { Canvas, Circle, Group, Line, vec } from '@shopify/react-native-skia';
import { useDerivedValue, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { COLORS } from '@/src/theme';

interface BiometricFaceMeshProps {
  width: number;
  height: number;
  points: Array<{ x: number; y: number; z: number }> | null;
  active: boolean;
}

const ANCHOR_PAIRS: Array<[number, number]> = [
  [10, 234],
  [234, 227],
  [234, 152],
  [227, 137],
  [137, 132],
  [132, 467],
  [467, 466],
  [467, 123],
  [123, 153],
  [1, 164],
  [360, 169],
  [361, 352],
  [454, 234],
];

export function BiometricFaceMesh({ width, height, points, active }: BiometricFaceMeshProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (active) {
      progress.value = withRepeat(withTiming(1, { duration: 1800 }), -1, true);
    } else {
      progress.value = withTiming(0, { duration: 250 });
    }
  }, [active, progress]);

  const scaledPoints = useMemo(() => {
    if (!points || points.length === 0) return [];

    const minX = Math.min(...points.map((p) => p.x));
    const maxX = Math.max(...points.map((p) => p.x));
    const minY = Math.min(...points.map((p) => p.y));
    const maxY = Math.max(...points.map((p) => p.y));

    const s = Math.min(width / Math.max(maxX - minX, 1e-6), height / Math.max(maxY - minY, 1e-6)) * 0.85;
    const cx = width / 2;
    const cy = height / 2;

    const sampled: Array<{ x: number; y: number }> = [];
    const step = Math.max(1, Math.floor(points.length / 140));
    for (let i = 0; i < points.length; i += step) {
      const p = points[i];
      sampled.push({
        x: cx + (p.x - (minX + maxX) / 2) * s,
        y: cy + (p.y - (minY + maxY) / 2) * s,
      });
    }
    return sampled;
  }, [points, width, height]);

  const radius = useDerivedValue(() => 1.2 + progress.value * 1.8);
  const opacity = useDerivedValue(() => 0.45 + progress.value * 0.4);

  const p1 = (idx: number) => {
    const pt = scaledPoints[idx];
    if (!pt) return vec(0, 0);
    return vec(pt.x, pt.y);
  };

  return (
    <Canvas style={{ width, height }}>
      <Group opacity={opacity}>
        {scaledPoints.map((p, i) => (
          <Circle key={`pt-${i}`} cx={p.x} cy={p.y} r={radius} color={COLORS.accent} />
        ))}
        {scaledPoints.length > 0 &&
          ANCHOR_PAIRS.map(([a, b], i) => {
            const pa = scaledPoints[a];
            const pb = scaledPoints[b];
            if (!pa || !pb) return null;
            return (
              <Line
                key={`ln-${i}`}
                p1={vec(pa.x, pa.y)}
                p2={vec(pb.x, pb.y)}
                color={COLORS.accent}
                strokeWidth={1.1}
                style="stroke"
              />
            );
          })}
      </Group>
    </Canvas>
  );
}
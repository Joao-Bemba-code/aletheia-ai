import React, { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Canvas, Circle, Group, Path, Skia } from '@shopify/react-native-skia';
import { useDerivedValue, useSharedValue, withTiming } from 'react-native-reanimated';
import { COLORS, FONTS } from '@/src/theme';

interface IncongruenceGaugeProps {
  score: number;
  size: number;
}

function colorForScore(score: number): string {
  if (score >= 85) return COLORS.danger;
  if (score >= 65) return COLORS.warning;
  return COLORS.accent;
}

export function IncongruenceGaugeReal({ score, size }: IncongruenceGaugeProps) {
  const clamped = Math.max(0, Math.min(100, score));
  const animated = useSharedValue(0);

  useEffect(() => {
    animated.value = withTiming(clamped / 100, { duration: 350 });
  }, [clamped, animated]);

  const cx = size / 2;
  const cy = size / 2;
  const radius = (size - 24) / 2;

  const trackPath = useMemo(() => {
    const p = Skia.Path.Make();
    p.addArc({ x: cx - radius, y: cy - radius, width: radius * 2, height: radius * 2 }, 135, 270);
    return p;
  }, [cx, cy, radius]);

  const progressPath = useDerivedValue(() => {
    const p = Skia.Path.Make();
    const sweep = 270 * animated.value;
    p.addArc({ x: cx - radius, y: cy - radius, width: radius * 2, height: radius * 2 }, 135, sweep);
    return p;
  });

  const color = colorForScore(clamped);

  return (
    <View style={{ width: size, height: size }}>
      <Canvas style={StyleSheet.absoluteFill}>
        <Group>
          <Path
            path={trackPath}
            color={COLORS.track}
            style="stroke"
            strokeWidth={14}
            strokeCap="round"
          />
          <Path
            path={progressPath}
            color={color}
            style="stroke"
            strokeWidth={14}
            strokeCap="round"
          />
          <Circle cx={cx} cy={cy} r={4} color={color} />
        </Group>
      </Canvas>
      <View style={styles.center}>
        <Text style={[styles.score, { color }]}>{Math.round(clamped)}</Text>
        <Text style={styles.label}>INCONGRUÊNCIA</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
  },
  score: {
    fontFamily: FONTS.mono,
    fontSize: 44,
    fontWeight: '700',
    letterSpacing: 2,
  },
  label: {
    fontFamily: FONTS.mono,
    fontSize: 10,
    letterSpacing: 2,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
});
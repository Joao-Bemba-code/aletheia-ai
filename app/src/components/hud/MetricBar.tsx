import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { COLORS, FONTS } from '@/src/theme';

interface MetricBarProps {
  label: string;
  value: number;
  max?: number;
  color?: string;
  format?: (v: number) => string;
}

export function MetricBar({
  label,
  value,
  max = 100,
  color = COLORS.accent,
  format,
}: MetricBarProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(Math.max(0, Math.min(max, value)) / max, {
      duration: 300,
    });
  }, [value, max, progress]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.track}>
        <Animated.View style={[styles.fill, { backgroundColor: color }, barStyle]} />
      </View>
      <Text style={[styles.value, { color }]}>
        {format ? format(value) : `${Math.round(value)}`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  label: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.mono,
    fontSize: 10,
    letterSpacing: 1,
    width: 88,
  },
  track: {
    flex: 1,
    height: 8,
    backgroundColor: COLORS.track,
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    height: 8,
    borderRadius: 4,
  },
  value: {
    fontFamily: FONTS.mono,
    fontSize: 12,
    minWidth: 54,
    textAlign: 'right',
  },
});
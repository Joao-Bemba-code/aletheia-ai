import { StyleSheet, Text, View } from 'react-native';
import type { AlertLevel } from '@/src/types';
import { COLORS, SIZES } from '@/src/theme';

interface AlertBannerProps {
  level: AlertLevel;
  score: number;
}

export function AlertBanner({ level, score }: AlertBannerProps) {
  const critical = level === 'critical';

  const color = critical ? COLORS.danger : COLORS.warning;
  const text = critical
    ? 'Congruência crítica detetada'
    : 'Possível incongruência cognitiva';

  return (
    <View style={[styles.banner, { borderColor: color }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.text, { color }]}>{text}</Text>
      <Text style={[styles.verdict, { color }]}>{Math.round(score)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderRadius: SIZES.radiusMd,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  text: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
  verdict: {
    fontSize: 16,
    fontWeight: '700',
  },
});
import { StyleSheet, Text, View } from 'react-native';
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

export function IncongruenceGaugeDemo({ score }: IncongruenceGaugeProps) {
  const clamped = Math.max(0, Math.min(100, score));
  const color = colorForScore(clamped);

  return (
    <View style={styles.wrap}>
      <View style={[styles.ring, { borderColor: color }]}>
        <Text style={[styles.score, { color }]}>{Math.round(clamped)}</Text>
      </View>
      <Text style={styles.label}>INCONGRUÊNCIA</Text>
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            { width: `${clamped}%`, backgroundColor: color },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    width: '100%',
  },
  ring: {
    alignItems: 'center',
    borderRadius: 120,
    borderWidth: 10,
    height: 200,
    justifyContent: 'center',
    width: 200,
  },
  score: {
    fontFamily: FONTS.mono,
    fontSize: 44,
    fontWeight: '700',
    letterSpacing: 2,
  },
  label: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.mono,
    fontSize: 10,
    letterSpacing: 2,
    marginTop: 14,
  },
  track: {
    backgroundColor: COLORS.track,
    borderRadius: 4,
    height: 8,
    marginTop: 12,
    overflow: 'hidden',
    width: 220,
  },
  fill: {
    borderRadius: 4,
    height: 8,
  },
});
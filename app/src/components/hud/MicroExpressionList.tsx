import { StyleSheet, Text, View } from 'react-native';
import type { MicroExpression } from '@/src/types';
import { COLORS, FONTS, SIZES } from '@/src/theme';

interface MicroExpressionListProps {
  expressions: MicroExpression[];
}

export function MicroExpressionList({ expressions }: MicroExpressionListProps) {
  if (!expressions || expressions.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>SEM MICRO-EXPRESSÕES DETETADAS</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {expressions.map((expr, i) => (
        <View key={`${expr.type}-${i}`} style={styles.item}>
          <Text style={styles.type}>{expr.type.toUpperCase()}</Text>
          <Text style={styles.classification}>{expr.classification.toUpperCase()}</Text>
          <View style={styles.intensityTrack}>
            <View
              style={[
                styles.intensityFill,
                {
                  width: `${Math.min(100, expr.intensity * 100)}%`,
                  backgroundColor: expr.classification === 'masked' ? COLORS.warning : COLORS.accent,
                },
              ]}
            />
          </View>
          <Text style={styles.intensity}>
            {Math.round(expr.intensity * 100)}%
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  item: {
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radiusSm,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  type: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.mono,
    fontSize: 11,
    width: 110,
  },
  classification: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.mono,
    fontSize: 10,
    width: 72,
  },
  intensity: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.mono,
    fontSize: 10,
    minWidth: 34,
    textAlign: 'right',
  },
  intensityTrack: {
    height: 6,
    flex: 1,
    borderRadius: 3,
    backgroundColor: COLORS.track,
    overflow: 'hidden',
  },
  intensityFill: {
    height: 6,
    borderRadius: 3,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  emptyText: {
    color: COLORS.textMuted,
    fontFamily: FONTS.mono,
    fontSize: 10,
    letterSpacing: 1,
  },
});
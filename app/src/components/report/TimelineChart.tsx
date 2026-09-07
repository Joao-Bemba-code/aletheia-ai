import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Line, Path, Polygon } from 'react-native-svg';
import { COLORS, FONTS } from '@/src/theme';

interface TimelineChartProps {
  data: Array<{ score: number; ts: number }>;
  width: number;
  height: number;
}

const ALERT_THRESHOLD = 65;
const CRITICAL_THRESHOLD = 85;

export default function TimelineChart({ data, width, height }: TimelineChartProps) {
  const chart = useMemo(() => {
    if (!data || data.length < 2) return null;
    const values = data.map((d) => Math.max(0, Math.min(100, d.score)));
    const min = Math.min(...values);
    const max = Math.max(...values);
    const pad = 8;

    const points = values.map((v, i) => {
      const x = pad + (i / (values.length - 1)) * (width - pad * 2);
      const y = height - 14 - (v / 100) * (height - 24);
      return { x, y };
    });

    const line = points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    const area = `${line} ${width - pad},${height} ${pad},${height}`;
    const alertY = height - 14 - (ALERT_THRESHOLD / 100) * (height - 24);
    const criticalY = height - 14 - (CRITICAL_THRESHOLD / 100) * (height - 24);
    return { line, area, alertY, criticalY, min, max };
  }, [data, width, height]);

  if (!chart) {
    return (
      <View style={[styles.empty, { height }]}>
        <Text style={styles.emptyText}>SEM DADOS TEMPORAIS</Text>
      </View>
    );
  }

  return (
    <View>
      <Svg width={width} height={height}>
        <Line
          x1="0"
          y1={chart.criticalY}
          x2={width}
          y2={chart.criticalY}
          stroke={COLORS.danger}
          strokeWidth={1}
          strokeDasharray="6 5"
          opacity={0.6}
        />
        <Line
          x1="0"
          y1={chart.alertY}
          x2={width}
          y2={chart.alertY}
          stroke={COLORS.warning}
          strokeWidth={1}
          strokeDasharray="4 5"
          opacity={0.6}
        />

        <Polygon points={chart.area} fill={COLORS.accent} opacity={0.08} />
        <Path d={`M ${chart.line}`} fill="none" stroke={COLORS.accent} strokeWidth={2} />
      </Svg>

      <View style={styles.labels}>
        <Text style={styles.legendCritical}>CRÍTICO ≥{CRITICAL_THRESHOLD}</Text>
        <Text style={styles.legendAlert}>ATENÇÃO ≥{ALERT_THRESHOLD}</Text>
        <Text style={styles.legendRange}>
          {Math.round(chart.max)}–{Math.round(chart.min)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
  },
  emptyText: {
    color: COLORS.textMuted,
    fontFamily: FONTS.mono,
    fontSize: 10,
    letterSpacing: 2,
  },
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  legendCritical: {
    color: COLORS.danger,
    fontFamily: FONTS.mono,
    fontSize: 8,
  },
  legendAlert: {
    color: COLORS.warning,
    fontFamily: FONTS.mono,
    fontSize: 8,
  },
  legendRange: {
    color: COLORS.textMuted,
    fontFamily: FONTS.mono,
    fontSize: 8,
  },
});
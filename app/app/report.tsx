import { useCallback, useMemo } from 'react';
import { StyleSheet, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import Screen from '@/src/components/ui/Screen';
import Card from '@/src/components/ui/Card';
import Button from '@/src/components/ui/Button';
import TimelineChart from '@/src/components/report/TimelineChart';
import { COLORS, SIZES, FONTS } from '@/src/theme';
import { useAletheiaStore } from '@/src/store/aletheiaStore';

const ALERT_THRESHOLD = 65;
const CRITICAL_THRESHOLD = 85;

type Verdict = {
  label: string;
  color: string;
};

function verdictFor(avg: number): Verdict {
  if (avg >= CRITICAL_THRESHOLD)
    return { label: 'Incongruência crítica', color: COLORS.danger };
  if (avg >= ALERT_THRESHOLD)
    return { label: 'Nível de atenção', color: COLORS.warning };
  if (avg >= 40)
    return { label: 'Observar', color: COLORS.warning };
  return { label: 'Baixo risco', color: COLORS.success };
}

export default function ReportScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const report = useAletheiaStore((s) => s.report);
  const setReport = useAletheiaStore((s) => s.setReport);

  const summary = report?.summary ?? null;
  const metrics = summary?.metrics ?? null;
  const timeline = report?.timeline ?? [];

  const verdict = useMemo(
    () => verdictFor(metrics?.avg_incongruence ?? 0),
    [metrics?.avg_incongruence],
  );

  const sessionLabel = useMemo(() => {
    const name = summary?.session_name;
    if (name) return name;
    const id = summary?.session_id ?? '—';
    return id.length > 10 ? `SESSÃO ${id.slice(0, 8).toUpperCase()}` : `SESSÃO ${id.toUpperCase()}`;
  }, [summary]);

  const emotionEntries = useMemo(() => {
    const dist = metrics?.emotion_distribution ?? {};
    return Object.entries(dist)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [metrics]);

  const stressPeaks = useMemo(() => {
    const peaks = metrics?.stress_peaks ?? [];
    return [...peaks].sort((a, b) => b.value - a.value).slice(0, 4);
  }, [metrics]);

  const incidentLabel = (metrics?.incident_count ?? 0) > 0 ? COLORS.warning : COLORS.success;

  const goHome = useCallback(() => {
    setReport(null);
    router.replace('/');
  }, [router, setReport]);

  const kpis = [
    { label: 'Frames', value: metrics?.total_frames ?? 0, format: (v: number) => String(v), color: COLORS.textPrimary },
    { label: 'Média incongruência', value: metrics?.avg_incongruence ?? 0, format: (v: number) => v.toFixed(1), color: COLORS.textPrimary },
    { label: 'Máximo', value: metrics?.max_incongruence ?? 0, format: (v: number) => v.toFixed(0), color: COLORS.textPrimary },
    { label: 'Incidentes', value: metrics?.incident_count ?? 0, format: (v: number) => String(v), color: incidentLabel },
  ];

  return (
    <Screen>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Pós-auditoria</Text>
          <Text style={styles.title}>Relatório da sessão</Text>
          <Text style={styles.sessionLabel}>{sessionLabel}</Text>
        </View>

        <Card style={styles.verdictCard}>
          <Text style={styles.verdictText}>Veredito geral</Text>
          <View style={styles.verdictRow}>
            <View style={[styles.verdictDot, { backgroundColor: verdict.color }]} />
            <Text style={[styles.verdictLabel, { color: verdict.color }]}>{verdict.label}</Text>
          </View>
          <Text style={styles.verdictDetail}>
            Incongruência média de {metrics?.avg_incongruence?.toFixed(1) ?? '—'}% no total de{' '}
            {metrics?.total_frames ?? 0} frames analisados.
          </Text>
        </Card>

        <View style={styles.kpiGrid}>
          {kpis.map((k) => (
            <Card key={k.label} style={styles.kpiCard} padding={14}>
              <Text style={[styles.kpiValue, { color: k.color }]}>{k.format(k.value)}</Text>
              <Text style={styles.kpiLabel}>{k.label}</Text>
            </Card>
          ))}
        </View>

        <Card>
          <Text style={styles.panelTitle}>Evolução temporal da incongruência</Text>
          <TimelineChart data={timeline} width={width - SIZES.paddingLg * 2 - 32} height={160} />
        </Card>

        <Card>
          <Text style={styles.panelTitle}>Distribuição emocional</Text>
          {emotionEntries.length === 0 ? (
            <Text style={styles.emptyText}>Sem dados emocionais</Text>
          ) : (
            emotionEntries.map(([emotion, pct]) => (
              <View key={emotion} style={styles.emoRow}>
                <Text style={styles.emoLabel}>{emotion}</Text>
                <View style={styles.emoTrack}>
                  <View
                    style={[styles.emoFill, { width: `${Math.min(100, Math.round(pct * 100))}%` }]}
                  />
                </View>
                <Text style={styles.emoPct}>{Math.round(pct * 100)}%</Text>
              </View>
            ))
          )}
        </Card>

        <Card>
          <Text style={styles.panelTitle}>Picos de stress</Text>
          {stressPeaks.length === 0 ? (
            <Text style={styles.emptyText}>Nenhum pico registado</Text>
          ) : (
            stressPeaks.map((peak, i) => (
              <View key={i} style={styles.peakRow}>
                <Text style={styles.peakIndex}>#{peak.index}</Text>
                <Text style={[styles.peakValue, { color: COLORS.warning }]}>
                  {peak.value.toFixed(1)}%
                </Text>
              </View>
            ))
          )}
        </Card>

        <View style={styles.actions}>
          <Button label="Nova auditoria" onPress={goHome} />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: SIZES.paddingLg,
    paddingBottom: 32,
    gap: 14,
  },
  header: {
    marginBottom: 4,
  },
  eyebrow: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.regular,
    fontSize: 13,
  },
  title: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.regular,
    fontSize: 26,
    fontWeight: '700',
    marginTop: 2,
  },
  sessionLabel: {
    color: COLORS.textMuted,
    fontFamily: FONTS.mono,
    fontSize: 12,
    marginTop: 2,
  },
  verdictCard: {
    padding: 18,
  },
  verdictText: {
    color: COLORS.textMuted,
    fontFamily: FONTS.regular,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  verdictRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  verdictDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  verdictLabel: {
    fontFamily: FONTS.regular,
    fontSize: 17,
    fontWeight: '700',
  },
  verdictDetail: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 12,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  kpiCard: {
    minWidth: '47%',
    flexGrow: 1,
  },
  kpiValue: {
    fontFamily: FONTS.regular,
    fontSize: 26,
    fontWeight: '700',
  },
  kpiLabel: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
  panelTitle: {
    color: COLORS.textMuted,
    fontFamily: FONTS.regular,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 14,
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 10,
  },
  emoRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  emoLabel: {
    color: COLORS.textPrimary,
    fontSize: 13,
    width: 80,
  },
  emoTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.track,
    overflow: 'hidden',
  },
  emoFill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.accent,
  },
  emoPct: {
    color: COLORS.textSecondary,
    fontSize: 12,
    width: 36,
    textAlign: 'right',
  },
  peakRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  peakIndex: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  peakValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  actions: {
    marginTop: 8,
  },
});
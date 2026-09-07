import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import Screen from '@/src/components/ui/Screen';
import Card from '@/src/components/ui/Card';
import Button from '@/src/components/ui/Button';
import { COLORS, SIZES, FONTS } from '@/src/theme';
import { useAletheiaStore } from '@/src/store/aletheiaStore';
import type { SessionSummary } from '@/src/types';
import { stopSession } from '@/src/services/websocket';
import { useCaptureLoop } from '@/src/hooks/useCaptureLoop';
import { useAudioCapture } from '@/src/hooks/useAudioCapture';
import { IncongruenceGauge } from '@/src/components/hud/IncongruenceGauge';
import { MetricBar } from '@/src/components/hud/MetricBar';
import { AlertBanner } from '@/src/components/hud/AlertBanner';
import { MicroExpressionList } from '@/src/components/hud/MicroExpressionList';

export default function LiveScreen() {
  const router = useRouter();
  const [stopping, setStopping] = useState(false);

  const session = useAletheiaStore((s) => s.session);
  const connected = useAletheiaStore((s) => s.connected);
  const captureActive = useAletheiaStore((s) => s.captureActive);
  const analysis = useAletheiaStore((s) => s.analysis);
  const statusUpdate = useAletheiaStore((s) => s.statusUpdate);
  const sessionStatus = useAletheiaStore((s) => s.sessionStatus);
  const setCaptureActive = useAletheiaStore((s) => s.setCaptureActive);
  const setReport = useAletheiaStore((s) => s.setReport);
  const reset = useAletheiaStore((s) => s.reset);

  useCaptureLoop({ enabled: true });
  useAudioCapture({ enabled: captureActive && connected });

  const showBanner = sessionStatus !== 'normal' && !!analysis;

  const handleStop = useCallback(() => {
    setStopping(true);
    setCaptureActive(false);
    const sessionId = session?.session_id;

    const finish = () => {
      reset();
      router.replace('/report');
    };

    const done = async () => {
      let summary: SessionSummary | null = null;
      try {
        if (sessionId) summary = await stopSession(sessionId);
      } catch {
        // report still reachable from memory
      }
      const st = useAletheiaStore.getState();
      setReport({
        summary,
        timeline: st.timeline,
      });
      finish();
    };

    const timeout = setTimeout(finish, 3000);
    done().finally(() => clearTimeout(timeout));
  }, [session, router, reset, setCaptureActive, setReport]);

  const emoColor = useMemo(() => {
    if (!analysis) return COLORS.accent;
    if (analysis.alert_level === 'critical') return COLORS.danger;
    if (analysis.alert_level === 'warning') return COLORS.warning;
    return COLORS.accent;
  }, [analysis]);

  const gaugeSize = Math.min(300, SIZES.padding * 2 + 220);

  return (
    <Screen>
      <StatusBar style="light" />

      <View style={styles.header}>
        <Pressable onPress={() => router.replace('/')} style={styles.backButton}>
          <Text style={styles.backText}>← Sair</Text>
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>Sessão ao vivo</Text>
          <Text style={styles.sessionId} numberOfLines={1}>
            {session?.session_id ? session.session_id.slice(0, 8).toUpperCase() : '—'}
          </Text>
        </View>
        <View
          style={[
            styles.statusPill,
            { backgroundColor: connected ? COLORS.success : COLORS.danger },
          ]}
        >
          <Text style={styles.statusPillText}>
            {connected ? 'AO VIVO' : 'OFFLINE'}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.gaugeWrap}>
          <IncongruenceGauge score={analysis?.incongruence_score ?? 0} size={gaugeSize} />
        </View>

        {showBanner && analysis && (
          <AlertBanner level={analysis.alert_level} score={analysis.incongruence_score} />
        )}

        <Card style={styles.panel}>
          <Text style={styles.panelTitle}>Métricas</Text>
          <MetricBar
            label="Stress"
            value={analysis?.stress_level ?? 0}
            color={analysis && analysis.stress_level >= 85 ? COLORS.danger : COLORS.warning}
            format={(v) => `${Math.round(v)}%`}
          />
          <MetricBar
            label={`Emoção · ${analysis?.emotion?.toUpperCase() ?? '—'}`}
            value={analysis ? analysis.emotion_confidence * 100 : 0}
            color={emoColor}
          />
          <MetricBar
            label="Alinhamento"
            value={analysis ? analysis.modality_agreement * 100 : 0}
            color={COLORS.accent}
            format={(v) => `${Math.round(v)}%`}
          />
        </Card>

        <Card style={styles.panel}>
          <Text style={styles.panelTitle}>Micro-expressões</Text>
          <MicroExpressionList expressions={analysis?.micro_expressions ?? []} />
        </Card>

        <View style={styles.statusRow}>
          <Text style={styles.frameCount}>FRAMES: {statusUpdate?.total_frames ?? 0}</Text>
          <Text style={styles.incidentCount}>INCIDENTES: {statusUpdate?.incident_count ?? 0}</Text>
        </View>
      </ScrollView>

      <View style={styles.controls}>
        <Button
          label={stopping ? 'A ENCERRAR...' : 'Encerrar sessão'}
          variant="danger"
          onPress={handleStop}
          disabled={stopping}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingHorizontal: SIZES.paddingLg,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 70,
  },
  backText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontFamily: FONTS.regular,
  },
  headerCenter: {
    alignItems: 'center',
    flex: 1,
  },
  title: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.regular,
    fontSize: 16,
    fontWeight: '600',
  },
  sessionId: {
    color: COLORS.textMuted,
    fontFamily: FONTS.mono,
    fontSize: 10,
    marginTop: 2,
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    width: 64,
    alignItems: 'center',
  },
  statusPillText: {
    color: COLORS.white,
    fontFamily: FONTS.regular,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  scroll: {
    padding: SIZES.paddingLg,
    paddingBottom: 16,
  },
  gaugeWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
  },
  panel: {
    marginBottom: 12,
    gap: 16,
  },
  panelTitle: {
    color: COLORS.textMuted,
    fontFamily: FONTS.regular,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
    paddingVertical: 6,
  },
  frameCount: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.regular,
    fontSize: 12,
  },
  incidentCount: {
    color: COLORS.warning,
    fontFamily: FONTS.regular,
    fontSize: 12,
  },
  controls: {
    padding: SIZES.paddingLg,
  },
});
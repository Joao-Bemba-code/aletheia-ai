import { useCallback, useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  useWindowDimensions,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import Screen from '@/src/components/ui/Screen';
import Card from '@/src/components/ui/Card';
import Button from '@/src/components/ui/Button';
import { COLORS, SIZES, FONTS } from '@/src/theme';
import { useCaptureLoop } from '@/src/hooks/useCaptureLoop';
import { useAletheiaStore } from '@/src/store/aletheiaStore';
import { AletheiaWebSocket, createSession } from '@/src/services/websocket';
import { HTTP_BASE_URL, IS_EXPO_GO } from '@/src/config';
import { ScannerOverlay } from '@/src/components/scanner/ScannerOverlay';

type ServerState = 'checking' | 'online' | 'offline';

const SERVER_LABEL: Record<ServerState, { text: string; color: string }> = {
  checking: { text: 'LIGANDO...', color: COLORS.textMuted },
  online: { text: 'SERVIDOR PRONTO', color: COLORS.success },
  offline: { text: 'SEM SERVIDOR', color: COLORS.danger },
};

export default function ScannerScreen() {
  const router = useRouter();
  const { device, hasPermission, cameraRef, demoMode } = useCaptureLoop({ enabled: false });
  const { width } = useWindowDimensions();
  const setCaptureActive = useAletheiaStore((s) => s.setCaptureActive);
  const setReport = useAletheiaStore((s) => s.setReport);

  const [server, setServer] = useState<ServerState>('checking');
  const [previewActive, setPreviewActive] = useState(false);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    let active = true;
    const check = async () => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4000);
      try {
        const res = await fetch(`${HTTP_BASE_URL}/health`, { signal: controller.signal });
        if (active) setServer(res.ok ? 'online' : 'offline');
      } catch {
        if (active) setServer('offline');
      } finally {
        clearTimeout(timer);
      }
    };
    check();
    const iv = setInterval(check, 12000);
    return () => {
      active = false;
      clearInterval(iv);
    };
  }, []);

  const startDemo = useCallback(async () => {
    setStarting(true);
    setReport(null);
    try {
      const sessionId = await createSession(
        'DEMO',
        `Demo ${new Date().toLocaleTimeString('pt-BR', { hour12: false })}`,
      );
      const ws = new AletheiaWebSocket(sessionId);
      ws.onOpen = () => {
        setCaptureActive(true);
        router.replace('/live');
      };
      ws.connect();
    } catch {
      Alert.alert('Servidor indisponível', 'Não foi possível ligar ao servidor. Verifica o backend.');
      setStarting(false);
    }
  }, [router, setCaptureActive, setReport]);

  const renderCamera = !IS_EXPO_GO && !demoMode && device && hasPermission;

  const badge = SERVER_LABEL[server];
  const viewport = width - SIZES.padding * 2;

  return (
    <Screen>
      <StatusBar style="light" />

      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Aletheia AI</Text>
          <Text style={styles.subtitle}>Auditoria comportamental em tempo real</Text>
        </View>
        <View style={styles.serverPill}>
          <View style={[styles.serverDot, { backgroundColor: badge.color }]} />
          <Text style={[styles.serverText, { color: badge.color }]}>{badge.text}</Text>
        </View>
      </View>

      <View style={styles.viewportWrap}>
        <Card style={styles.viewportCard} padding={0}>
          <View style={styles.viewportInner}>
            {renderCamera &&
              (() => {
                const { Camera } = require('react-native-vision-camera') as never;
                const Cam = Camera as React.ElementType;
                return (
                  <Cam
                    ref={cameraRef}
                    style={StyleSheet.absoluteFill}
                    device={device}
                    isActive={previewActive}
                    video={false}
                    audio={false}
                  />
                );
              })()}
            <ScannerOverlay
              width={viewport}
              height={viewport * 0.72}
              status={server === 'online' ? (previewActive ? 'scanning' : 'idle') : 'idle'}
            />
            {demoMode && (
              <View style={styles.demoBadge}>
                <Text style={styles.demoBadgeText}>MODO DEMO</Text>
              </View>
            )}
            {renderCamera && (
              <Pressable
                onPress={() => setPreviewActive((v) => !v)}
                style={styles.previewToggle}
              >
                <Text style={styles.previewToggleText}>
                  {previewActive ? 'PAUSAR PREVIEW' : 'INICIAR CÂMERA'}
                </Text>
              </Pressable>
            )}
          </View>
        </Card>
      </View>

      <View style={styles.controls}>
        <Button
          label={starting ? 'A LIGAR...' : 'Iniciar modo demo'}
          onPress={startDemo}
          disabled={starting || server === 'offline'}
        />
        <Button
          label="NOVA AUDITORIA PERSONALIZADA"
          variant="secondary"
          onPress={() => router.push('/session')}
        />
        <Text style={styles.footnote}>
          {server === 'offline'
            ? 'O servidor não está acessível — verifica o backend na porta 8000.'
            : 'Análise multimodal de incongruência cognitiva.'}
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.paddingLg,
    paddingTop: 16,
  },
  title: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.regular,
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontFamily: FONTS.regular,
    marginTop: 2,
  },
  serverPill: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  serverDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  serverText: {
    fontSize: 12,
    fontFamily: FONTS.regular,
  },
  viewportWrap: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: SIZES.paddingLg,
  },
  viewportCard: {
    width: '100%',
  },
  viewportInner: {
    borderRadius: SIZES.radiusLg,
    overflow: 'hidden',
  },
  demoBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    borderRadius: SIZES.radiusSm,
    backgroundColor: COLORS.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  demoBadgeText: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.mono,
    fontSize: 10,
    letterSpacing: 1,
  },
  previewToggle: {
    position: 'absolute',
    top: 12,
    right: 12,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    borderRadius: SIZES.radiusSm,
    backgroundColor: COLORS.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  previewToggleText: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.regular,
    fontSize: 12,
  },
  controls: {
    padding: SIZES.paddingLg,
    gap: 10,
  },
  footnote: {
    color: COLORS.textMuted,
    fontFamily: FONTS.regular,
    fontSize: 13,
    paddingHorizontal: 8,
    paddingTop: 4,
    textAlign: 'center',
  },
});
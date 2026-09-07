import { useCallback, useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import Screen from '@/src/components/ui/Screen';
import Card from '@/src/components/ui/Card';
import Button from '@/src/components/ui/Button';
import { COLORS, SIZES, FONTS } from '@/src/theme';
import {
  AletheiaWebSocket,
  createSession,
} from '@/src/services/websocket';
import { useAletheiaStore } from '@/src/store/aletheiaStore';

export default function SessionScreen() {
  const router = useRouter();
  const [participantId, setParticipantId] = useState('');
  const [sessionName, setSessionName] = useState('');
  const [isStarting, setIsStarting] = useState(false);
  const [focused, setFocused] = useState<'participant' | 'name' | null>(null);
  const connected = useAletheiaStore((s) => s.connected);
  const setCaptureActive = useAletheiaStore((s) => s.setCaptureActive);
  const setReport = useAletheiaStore((s) => s.setReport);
  const reset = useAletheiaStore((s) => s.reset);

  const handleStart = useCallback(async () => {
    if (!participantId && !sessionName) {
      Alert.alert('Dados em falta', 'Indica o ID do participante ou o nome da sessão.');
      return;
    }

    setIsStarting(true);
    setReport(null);
    try {
      const name = sessionName || `Sessão ${participantId || Date.now()}`;
      const sessionId = await createSession(participantId, name);
      const ws = new AletheiaWebSocket(sessionId);
      ws.onOpen = () => {
        setCaptureActive(true);
        router.replace('/live');
      };
      ws.onClose = () => {
        setCaptureActive(false);
      };
      ws.connect();
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível iniciar a sessão. Verifica o servidor.');
    } finally {
      setIsStarting(false);
    }
  }, [participantId, sessionName, router, setCaptureActive, setReport]);

  useEffect(() => {
    return () => reset();
  }, [reset]);

  return (
    <Screen>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Text style={styles.backText}>← Voltar</Text>
          </Pressable>
          <Text style={styles.eyebrow}>Nova sessão</Text>
          <Text style={styles.title}>Dados da auditoria</Text>
        </View>

        <View style={styles.formWrap}>
          <Card style={styles.card}>
            <View style={styles.form}>
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>ID do participante</Text>
                <TextInput
                  style={[
                    styles.input,
                    focused === 'participant' && styles.inputFocused,
                  ]}
                  value={participantId}
                  onChangeText={setParticipantId}
                  onFocus={() => setFocused('participant')}
                  onBlur={() => setFocused(null)}
                  placeholder="ex: CAND-2026-001"
                  placeholderTextColor={COLORS.textMuted}
                  autoCapitalize="characters"
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Nome da sessão</Text>
                <TextInput
                  style={[
                    styles.input,
                    focused === 'name' && styles.inputFocused,
                  ]}
                  value={sessionName}
                  onChangeText={setSessionName}
                  onFocus={() => setFocused('name')}
                  onBlur={() => setFocused(null)}
                  placeholder="ex: Entrevista gestor RH"
                  placeholderTextColor={COLORS.textMuted}
                />
              </View>

              <Button
                label={isStarting ? 'A INICIAR...' : 'Iniciar auditoria'}
                onPress={handleStart}
                disabled={isStarting}
              />
            </View>
          </Card>

          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: connected ? COLORS.success : COLORS.textMuted },
              ]}
            />
            <Text style={styles.statusText}>
              {connected ? 'Conexão ativa' : 'Servidor pronto a ligar'}
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  header: {
    padding: SIZES.paddingLg,
    paddingTop: 24,
  },
  backText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontFamily: FONTS.regular,
    marginBottom: 24,
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
  formWrap: {
    padding: SIZES.paddingLg,
    paddingTop: 20,
  },
  card: {
    paddingTop: 24,
  },
  form: {
    gap: 20,
  },
  fieldGroup: {
    gap: 8,
  },
  label: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontFamily: FONTS.regular,
  },
  input: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radiusMd,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: COLORS.textPrimary,
    fontSize: 15,
    fontFamily: FONTS.regular,
  },
  inputFocused: {
    borderColor: COLORS.accent,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    paddingHorizontal: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontFamily: FONTS.regular,
  },
});
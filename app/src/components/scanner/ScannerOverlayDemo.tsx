import { StyleSheet, Text, View } from 'react-native';
import { COLORS, FONTS } from '@/src/theme';

interface ScannerOverlayProps {
  width: number;
  height: number;
  status: 'error' | 'idle' | 'scanning' | 'locked';
}

function statusText(status: ScannerOverlayProps['status']): string {
  switch (status) {
    case 'error':
      return 'ERRO';
    case 'locked':
      return 'BLOQUEADO';
    case 'scanning':
      return 'ESCANEANDO';
    default:
      return 'PRONTO';
  }
}

export function ScannerOverlayDemo({ width, height, status }: ScannerOverlayProps) {
  const color = status === 'error' ? COLORS.danger : status === 'scanning' ? COLORS.accent : COLORS.textMuted;

  return (
    <View style={{ width, height, alignItems: 'center', justifyContent: 'center' }}>
      <View style={[styles.frame, { borderColor: color }]}>
        <Text style={[styles.text, { color }]}>ALETHEIA // {statusText(status)}</Text>
        <Text style={styles.hint}>MODO DEMO — SEM CÂMARA</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: 24,
    height: 320,
    justifyContent: 'center',
    width: 260,
  },
  text: {
    fontFamily: FONTS.mono,
    fontSize: 12,
    letterSpacing: 2,
  },
  hint: {
    color: COLORS.textMuted,
    fontFamily: FONTS.mono,
    fontSize: 9,
    letterSpacing: 1,
    marginTop: 8,
  },
});
import { Platform } from 'react-native';

export const COLORS = {
  background: '#0B0F19',
  surface: '#121A2B',
  surfaceElevated: '#1A2234',
  border: 'rgba(148,163,184,0.16)',
  borderStrong: 'rgba(148,163,184,0.3)',
  track: 'rgba(148,163,184,0.14)',
  accent: '#6366F1',
  accentStrong: '#4F46E5',
  accentSoft: 'rgba(99,102,241,0.14)',
  onAccentText: '#FFFFFF',
  textPrimary: '#FFFFFF',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  white: '#FFFFFF',
  black: '#000000',
};

export const SHADOWS = {
  card: Platform.select({
    ios: {
      shadowColor: COLORS.black,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 3,
    },
    android: { elevation: 2 },
    default: {},
  }),
  button: Platform.select({
    ios: {
      shadowColor: COLORS.black,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 3,
    },
    android: { elevation: 3 },
    default: {},
  }),
};

export const FONTS = {
  regular: Platform.select({ ios: 'System', android: 'sans-serif', default: 'System' }),
  mono: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
};

export const SIZES = {
  padding: 16,
  paddingLg: 24,
  radiusSm: 8,
  radiusMd: 10,
  radiusLg: 14,
  radiusHero: 16,
  borderRadius: 10,
  borderRadiusSmall: 8,
  hudPadding: 12,
};
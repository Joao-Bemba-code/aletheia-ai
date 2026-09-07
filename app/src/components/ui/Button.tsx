import { useRef } from 'react';
import { Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { COLORS, FONTS, SIZES, SHADOWS } from '@/src/theme';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  icon?: React.ReactNode;
}

const PALLETE: Record<Variant, { bg: string; fg: string; border?: string }> = {
  primary: { bg: COLORS.accent, fg: COLORS.onAccentText },
  secondary: { bg: 'transparent', fg: COLORS.textPrimary, border: COLORS.borderStrong },
  danger: { bg: COLORS.danger, fg: COLORS.white },
  ghost: { bg: 'transparent', fg: COLORS.textSecondary },
};

export default function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  style,
  icon,
}: ButtonProps) {
  const scale = useSharedValue(1);
  const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

  const pressedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const palette = PALLETE[variant];
  const isDisabled = disabled || loading;

  return (
    <AnimatedPressable
      onPress={isDisabled ? undefined : onPress}
      onPressIn={() => (scale.value = withTiming(0.98, { duration: 80 }))}
      onPressOut={() => (scale.value = withTiming(1, { duration: 120 }))}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      style={[
        styles.base,
        {
          backgroundColor: palette.bg,
          borderWidth: palette.border ? 1 : 0,
          borderColor: palette.border,
        },
        pressedStyle,
        style,
        isDisabled && styles.disabled,
      ]}
    >
      {icon}
      <Text style={[styles.label, { color: palette.fg }]}>
        {loading ? 'A CARREGAR...' : label}
      </Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    ...SHADOWS.button,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    borderRadius: SIZES.radiusMd,
    paddingHorizontal: 18,
    paddingVertical: 12,
    flexDirection: 'row',
    gap: 8,
  },
  label: {
    fontFamily: FONTS.regular,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  disabled: {
    opacity: 0.45,
  },
});
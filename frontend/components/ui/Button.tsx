import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { theme } from '@/constants/theme';
import { useSettings } from '@/context/SettingsContext';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

type Props = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
  loading?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  iconRight?: keyof typeof Ionicons.glyphMap;
  style?: StyleProp<ViewStyle>;
  inline?: boolean;
};

const SIZES = {
  sm: { height: 36, px: 14, font: 12.5, icon: 14, radius: theme.radius.sm },
  md: { height: 46, px: 19, font: 14.5, icon: 16, radius: theme.radius.sm },
  lg: { height: 54, px: 24, font: 16, icon: 18, radius: theme.radius.md },
} as const;

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled,
  loading,
  icon,
  iconRight,
  style,
  inline = false,
}: Props) {
  const { tap } = useSettings();
  const metrics = SIZES[size];
  const isDisabled = disabled || loading;
  const foreground =
    variant === 'primary'
      ? '#FFFFFF'
      : variant === 'danger'
        ? theme.danger
        : variant === 'ghost'
          ? theme.textSecondary
          : theme.text;

  return (
    <View style={[inline ? styles.inline : styles.block, isDisabled && styles.disabled, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: !!isDisabled, busy: !!loading }}
        disabled={isDisabled}
        onPress={() => {
          tap(variant === 'primary' ? 'medium' : 'light');
          onPress();
        }}
        style={({ pressed }) => [
          styles.button,
          styles[variant],
          {
            height: metrics.height,
            paddingHorizontal: metrics.px,
            borderRadius: metrics.radius,
          },
          pressed && styles.pressed,
        ]}>
        {loading ? (
          <ActivityIndicator size="small" color={foreground} />
        ) : (
          <View style={styles.row}>
            {icon ? <Ionicons name={icon} size={metrics.icon} color={foreground} /> : null}
            <Text
              numberOfLines={1}
              style={[
                styles.label,
                {
                  color: foreground,
                  fontSize: metrics.font,
                  fontWeight: variant === 'primary' ? '700' : '600',
                },
              ]}>
              {label}
            </Text>
            {iconRight ? (
              <Ionicons name={iconRight} size={metrics.icon} color={foreground} />
            ) : null}
          </View>
        )}
      </Pressable>
    </View>
  );
}

export function IconButton({
  icon,
  onPress,
  size = 40,
  color = theme.text,
  accessibilityLabel,
  style,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  size?: number;
  color?: string;
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
}) {
  const { tap } = useSettings();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={() => {
        tap('light');
        onPress();
      }}
      style={({ pressed }) => [
        styles.iconButton,
        { width: size, height: size, borderRadius: Math.min(theme.radius.sm, size / 2) },
        pressed && styles.pressed,
        style,
      ]}>
      <Ionicons name={icon} size={size * 0.46} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  block: { alignSelf: 'stretch' },
  inline: { alignSelf: 'flex-start' },
  disabled: { opacity: 0.42 },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    ...Platform.select({ web: { cursor: 'pointer' }, default: {} }),
  },
  primary: {
    backgroundColor: theme.accent,
    borderColor: theme.accent,
    ...theme.shadow.sm,
  },
  secondary: {
    backgroundColor: theme.surface,
    borderColor: theme.borderStrong,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  danger: {
    backgroundColor: theme.dangerDim,
    borderColor: '#E8BDB7',
  },
  pressed: {
    opacity: 0.78,
    transform: [{ translateY: 1 }],
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { fontFamily: theme.font.sans, textAlign: 'center' },
  iconButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    ...Platform.select({ web: { cursor: 'pointer' }, default: {} }),
  },
});

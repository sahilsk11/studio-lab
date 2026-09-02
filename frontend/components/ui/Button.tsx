import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
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
  /** Shrinks to fit its label instead of filling the row. */
  inline?: boolean;
};

const SIZES = {
  sm: { height: 38, px: 14, font: 13, icon: 15, radius: theme.radius.sm },
  md: { height: 48, px: 18, font: 15, icon: 17, radius: theme.radius.md },
  lg: { height: 56, px: 22, font: 16, icon: 19, radius: theme.radius.md },
} as const;

/**
 * Primary renders as polished chrome — a metal sweep with a convex highlight
 * layered over it. Everything else is frosted glass so the hierarchy between
 * "the action" and "an action" stays obvious.
 */
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
  const { blur, animate, tap } = useSettings();
  const press = useRef(new Animated.Value(0)).current;
  const s = SIZES[size];
  const isOff = disabled || loading;

  function animateTo(value: number) {
    if (!animate) return;
    Animated.spring(press, {
      toValue: value,
      useNativeDriver: true,
      speed: 40,
      bounciness: 4,
    }).start();
  }

  const scale = press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.972] });

  const fg =
    variant === 'primary'
      ? theme.textOnMetal
      : variant === 'danger'
        ? theme.danger
        : variant === 'ghost'
          ? theme.textSecondary
          : theme.text;

  return (
    <Animated.View
      style={[
        inline ? styles.inline : styles.block,
        { transform: [{ scale }] },
        variant === 'primary' && !isOff ? theme.shadow.md : null,
        isOff && styles.disabled,
        style,
      ]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: !!isOff, busy: !!loading }}
        onPress={() => {
          tap(variant === 'primary' ? 'medium' : 'light');
          onPress();
        }}
        disabled={isOff}
        onPressIn={() => animateTo(1)}
        onPressOut={() => animateTo(0)}
        style={[
          styles.pressable,
          { height: s.height, paddingHorizontal: s.px, borderRadius: s.radius },
        ]}>
        {variant === 'primary' ? (
          <>
            <LinearGradient
              colors={theme.metal.chrome}
              start={{ x: 0.05, y: 0 }}
              end={{ x: 0.95, y: 1 }}
              style={[StyleSheet.absoluteFill, { borderRadius: s.radius }]}
            />
            {/* Convex shading: bright crown, shaded base. */}
            <LinearGradient
              colors={theme.metal.convex}
              locations={[0, 0.45, 0.72, 1]}
              style={[StyleSheet.absoluteFill, { borderRadius: s.radius }]}
            />
          </>
        ) : variant === 'ghost' ? null : (
          <>
            <BlurView
              intensity={blur}
              tint="dark"
              experimentalBlurMethod="dimezisBlurView"
              style={[StyleSheet.absoluteFill, { borderRadius: s.radius }]}
            />
            <LinearGradient
              colors={theme.metal.gunmetal}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[StyleSheet.absoluteFill, { borderRadius: s.radius }]}
            />
            <View
              style={[
                StyleSheet.absoluteFill,
                styles.rim,
                {
                  borderRadius: s.radius,
                  borderColor:
                    variant === 'danger' ? 'rgba(251,113,133,0.35)' : theme.glass.borderStrong,
                },
              ]}
            />
            <LinearGradient
              colors={theme.glass.edge}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[
                styles.edge,
                { borderTopLeftRadius: s.radius, borderTopRightRadius: s.radius },
              ]}
            />
          </>
        )}

        {loading ? (
          <ActivityIndicator size="small" color={fg} />
        ) : (
          <View style={styles.row}>
            {icon ? <Ionicons name={icon} size={s.icon} color={fg} /> : null}
            <Text
              numberOfLines={1}
              style={[
                styles.label,
                {
                  color: fg,
                  fontSize: s.font,
                  fontFamily: theme.font.sans,
                  fontWeight: variant === 'primary' ? '700' : '600',
                },
              ]}>
              {label}
            </Text>
            {iconRight ? <Ionicons name={iconRight} size={s.icon} color={fg} /> : null}
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

/** Compact circular glass button for toolbars. */
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
  const { blur, animate, tap } = useSettings();
  const press = useRef(new Animated.Value(0)).current;
  const scale = press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.9] });

  function animateTo(value: number) {
    if (!animate) return;
    Animated.spring(press, { toValue: value, useNativeDriver: true, speed: 50 }).start();
  }

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={() => {
          tap('light');
          onPress();
        }}
        onPressIn={() => animateTo(1)}
        onPressOut={() => animateTo(0)}
        style={[
          styles.iconButton,
          { width: size, height: size, borderRadius: size / 2 },
        ]}>
        <BlurView
          intensity={blur}
          tint="dark"
          experimentalBlurMethod="dimezisBlurView"
          style={[StyleSheet.absoluteFill, { borderRadius: size / 2 }]}
        />
        <View
          style={[
            StyleSheet.absoluteFill,
            styles.rim,
            { borderRadius: size / 2, borderColor: theme.glass.borderStrong },
          ]}
        />
        <Ionicons name={icon} size={size * 0.46} color={color} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  block: {
    alignSelf: 'stretch',
  },
  inline: {
    alignSelf: 'flex-start',
  },
  disabled: {
    opacity: 0.38,
  },
  pressable: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    ...Platform.select({ web: { cursor: 'pointer' }, default: {} }),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    textAlign: 'center',
  },
  rim: {
    borderWidth: StyleSheet.hairlineWidth,
  },
  edge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
  },
  iconButton: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    ...Platform.select({ web: { cursor: 'pointer' }, default: {} }),
  },
});

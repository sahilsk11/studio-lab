import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/constants/theme';
import { useSettings } from '@/context/SettingsContext';
import type { ImageStatus } from '@/types/project';

type Props = {
  status: ImageStatus;
  stale?: boolean;
  compact?: boolean;
};

const LOOK: Record<
  string,
  { label: string; color: string; bg: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  pending: {
    label: 'Queued',
    color: theme.neutral,
    bg: 'rgba(255,255,255,0.06)',
    icon: 'ellipse-outline',
  },
  generating: {
    label: 'Rendering',
    color: theme.info,
    bg: theme.infoDim,
    icon: 'sync',
  },
  done: {
    label: 'Ready',
    color: theme.success,
    bg: theme.successDim,
    icon: 'checkmark-circle',
  },
  stale: {
    label: 'Outdated',
    color: theme.warning,
    bg: theme.warningDim,
    icon: 'alert-circle',
  },
  error: {
    label: 'Failed',
    color: theme.danger,
    bg: theme.dangerDim,
    icon: 'close-circle',
  },
};

export function StatusBadge({ status, stale, compact }: Props) {
  const key = status === 'done' && stale ? 'stale' : status;
  const look = LOOK[key] ?? LOOK.pending;
  const { animate } = useSettings();
  const spin = useRef(new Animated.Value(0)).current;

  const spinning = status === 'generating' && animate;

  useEffect(() => {
    if (!spinning) {
      spin.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 1100,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [spinning, spin]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View
      style={[
        styles.badge,
        compact && styles.compact,
        { backgroundColor: look.bg, borderColor: `${look.color}44` },
      ]}>
      <Animated.View style={spinning ? { transform: [{ rotate }] } : undefined}>
        <Ionicons name={look.icon} size={compact ? 11 : 12} color={look.color} />
      </Animated.View>
      {!compact ? <Text style={[styles.text, { color: look.color }]}>{look.label}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    height: 24,
    borderRadius: theme.radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  compact: {
    paddingHorizontal: 6,
    width: 24,
    justifyContent: 'center',
  },
  text: {
    fontFamily: theme.font.sans,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
});

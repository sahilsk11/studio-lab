import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { theme } from '@/constants/theme';
import { useSettings } from '@/context/SettingsContext';
import { GlassCard } from './GlassCard';
import { Caption, CaptionStrong, Mono } from './Typography';

/** Animated accent-filled track. */
export function ProgressRail({
  value,
  total,
  height = 6,
  style,
}: {
  value: number;
  total: number;
  height?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const { accent, animate } = useSettings();
  const pct = total > 0 ? Math.min(1, Math.max(0, value / total)) : 0;
  const width = useRef(new Animated.Value(pct)).current;

  useEffect(() => {
    if (!animate) {
      width.setValue(pct);
      return;
    }
    Animated.timing(width, {
      toValue: pct,
      duration: 520,
      easing: Easing.out(Easing.cubic),
      // Width can't be driven natively.
      useNativeDriver: false,
    }).start();
  }, [pct, animate, width]);

  const widthPct = width.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={[styles.track, { height, borderRadius: height / 2 }, style]}>
      <Animated.View style={[styles.fillWrap, { width: widthPct, borderRadius: height / 2 }]}>
        <LinearGradient
          colors={accent.ramp}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[StyleSheet.absoluteFill, { borderRadius: height / 2 }]}
        />
        {/* Glossy crown on the fill. */}
        <LinearGradient
          colors={['rgba(255,255,255,0.55)', 'rgba(255,255,255,0)']}
          style={[styles.fillGloss, { borderRadius: height / 2 }]}
        />
      </Animated.View>
    </View>
  );
}

export function ProgressCard({
  label,
  value,
  total,
  detail,
  style,
}: {
  label: string;
  value: number;
  total: number;
  detail?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    <GlassCard tone="raised" radius={theme.radius.lg} style={style}>
      <View style={styles.cardInner}>
        <View style={styles.header}>
          <CaptionStrong>{label}</CaptionStrong>
          <Mono color={theme.textSecondary}>
            {value}/{total} · {pct}%
          </Mono>
        </View>
        <ProgressRail value={value} total={total} />
        {detail ? <Caption style={styles.detail}>{detail}</Caption> : null}
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  track: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
    width: '100%',
  },
  fillWrap: {
    height: '100%',
    overflow: 'hidden',
  },
  fillGloss: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '55%',
  },
  cardInner: {
    padding: theme.space.lg,
    gap: theme.space.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detail: {
    color: theme.textTertiary,
  },
});

import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, View } from 'react-native';

import { fill, theme } from '@/constants/theme';
import { useSettings } from '@/context/SettingsContext';

const W = 50;
const H = 30;
const PAD = 3;
const THUMB = H - PAD * 2;

/** Glass track with a polished metal thumb. */
export function Toggle({
  value,
  onValueChange,
  disabled,
  accessibilityLabel,
}: {
  value: boolean;
  onValueChange: (next: boolean) => void;
  disabled?: boolean;
  accessibilityLabel: string;
}) {
  const { accent, animate, tap } = useSettings();
  const pos = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    if (!animate) {
      pos.setValue(value ? 1 : 0);
      return;
    }
    Animated.timing(pos, {
      toValue: value ? 1 : 0,
      duration: 200,
      easing: Easing.bezier(0.34, 1.3, 0.64, 1),
      useNativeDriver: true,
    }).start();
  }, [value, animate, pos]);

  const translateX = pos.interpolate({
    inputRange: [0, 1],
    outputRange: [0, W - THUMB - PAD * 2],
  });

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled: !!disabled }}
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      onPress={() => {
        tap(value ? 'light' : 'medium');
        onValueChange(!value);
      }}
      style={[styles.track, disabled && styles.disabled]}>
      {/* Off state */}
      <View style={styles.trackOff} />

      {/* On state fades in over the top */}
      <Animated.View style={[StyleSheet.absoluteFill, styles.round, { opacity: pos }]}>
        <LinearGradient
          colors={accent.ramp}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, styles.round]}
        />
      </Animated.View>

      <View style={[StyleSheet.absoluteFill, styles.round, styles.rim]} />

      <Animated.View style={[styles.thumb, theme.shadow.sm, { transform: [{ translateX }] }]}>
        <LinearGradient
          colors={theme.metal.chrome}
          start={{ x: 0.15, y: 0 }}
          end={{ x: 0.85, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          colors={theme.metal.convex}
          locations={[0, 0.45, 0.72, 1]}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: W,
    height: H,
    borderRadius: H / 2,
    padding: PAD,
    justifyContent: 'center',
    overflow: 'hidden',
    ...Platform.select({ web: { cursor: 'pointer' }, default: {} }),
  },
  trackOff: {
    ...fill,
    borderRadius: H / 2,
    backgroundColor: 'rgba(255,255,255,0.09)',
  },
  round: {
    borderRadius: H / 2,
  },
  rim: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.glass.borderStrong,
  },
  disabled: {
    opacity: 0.4,
  },
  thumb: {
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    overflow: 'hidden',
  },
});

import { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet } from 'react-native';

import { theme } from '@/constants/theme';
import { useSettings } from '@/context/SettingsContext';

const WIDTH = 46;
const HEIGHT = 27;
const PAD = 3;
const THUMB = HEIGHT - PAD * 2;

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
  const { tap } = useSettings();
  const position = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(position, {
      toValue: value ? 1 : 0,
      duration: 170,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [value, position]);

  const translateX = position.interpolate({
    inputRange: [0, 1],
    outputRange: [0, WIDTH - THUMB - PAD * 2],
  });
  const trackColor = position.interpolate({
    inputRange: [0, 1],
    outputRange: [theme.surfaceMuted, theme.accent],
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
      style={[styles.hit, disabled && styles.disabled]}>
      <Animated.View style={[styles.track, { backgroundColor: trackColor }]}>
        <Animated.View style={[styles.thumb, { transform: [{ translateX }] }]} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hit: {
    ...Platform.select({ web: { cursor: 'pointer' }, default: {} }),
  },
  track: {
    width: WIDTH,
    height: HEIGHT,
    padding: PAD,
    justifyContent: 'center',
    borderRadius: HEIGHT / 2,
    borderWidth: 1,
    borderColor: theme.borderStrong,
  },
  thumb: {
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    backgroundColor: '#FFFFFF',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#D8CEC1',
    ...theme.shadow.sm,
  },
  disabled: { opacity: 0.4 },
});

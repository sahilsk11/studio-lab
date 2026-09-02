import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { theme } from '@/constants/theme';

/** Compact chroma progress rule. */
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
  const pct = total > 0 ? Math.min(1, Math.max(0, value / total)) : 0;
  const width = useRef(new Animated.Value(pct)).current;

  useEffect(() => {
    Animated.timing(width, {
      toValue: pct,
      duration: 520,
      easing: Easing.out(Easing.cubic),
      // Width can't be driven natively.
      useNativeDriver: false,
    }).start();
  }, [pct, width]);

  const widthPct = width.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={[styles.track, { height, borderRadius: height / 2 }, style]}>
      <Animated.View style={[styles.fillWrap, { width: widthPct, borderRadius: height / 2 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    backgroundColor: theme.surfaceMuted,
    overflow: 'hidden',
    width: '100%',
  },
  fillWrap: {
    height: '100%',
    overflow: 'hidden',
    backgroundColor: theme.accent,
  },
});

import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useSettings } from '@/context/SettingsContext';

/** Warm chroma sweep used while an image is rendering. */
export function Shimmer({ style }: { style?: StyleProp<ViewStyle> }) {
  const { animate } = useSettings();
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animate) return;
    const loop = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: 1500,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [animate, progress]);

  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['-120%', '120%'],
  });

  return (
    <View style={[StyleSheet.absoluteFill, styles.clip, style]}>
      <Animated.View style={[styles.band, { transform: [{ translateX }] }]}>
        <LinearGradient
          colors={['rgba(217,91,56,0)', 'rgba(217,91,56,0.14)', 'rgba(217,91,56,0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden', pointerEvents: 'none' },
  band: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: '60%',
  },
});

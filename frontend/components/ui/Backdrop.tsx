import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';

import { fill, theme, type Gradient } from '@/constants/theme';
import { useSettings } from '@/context/SettingsContext';

type Orb = {
  size: number;
  top: string;
  left: string;
  colors: Gradient;
  drift: { x: number; y: number };
  duration: number;
};

/**
 * Ambient light field behind every screen.
 *
 * Coloured orbs drift slowly and are smeared by a blur pass, which is what
 * gives the frosted panels above something worth refracting. Nothing here is
 * interactive, so the whole layer is pointer-events none.
 */
export function Backdrop() {
  const { accent, orbOpacity, animate } = useSettings();

  const orbs = useMemo<Orb[]>(
    () => [
      {
        size: 460,
        top: '-14%',
        left: '-22%',
        colors: accent.ramp,
        drift: { x: 26, y: 18 },
        duration: 17000,
      },
      {
        size: 380,
        top: '26%',
        left: '58%',
        colors: ['#6E8BFF', '#3D5AC9', '#101838'] as Gradient,
        drift: { x: -22, y: 26 },
        duration: 21000,
      },
      {
        size: 520,
        top: '62%',
        left: '-18%',
        colors: ['#B9C6DC', '#5B6780', '#0C1020'] as Gradient,
        drift: { x: 18, y: -24 },
        duration: 25000,
      },
      {
        size: 300,
        top: '78%',
        left: '54%',
        colors: [accent.tint, '#1B2238', '#080A12'] as Gradient,
        drift: { x: -16, y: -18 },
        duration: 19000,
      },
    ],
    [accent],
  );

  return (
    <View style={[StyleSheet.absoluteFill, styles.clip]} pointerEvents="none">
      <View style={styles.base} />

      {orbs.map((orb, i) => (
        <DriftingOrb key={i} orb={orb} opacity={orbOpacity} animate={animate} />
      ))}

      {/* Smears the orbs into a continuous light field. */}
      <BlurView
        intensity={Platform.OS === 'android' ? 60 : 90}
        tint="dark"
        experimentalBlurMethod="dimezisBlurView"
        style={StyleSheet.absoluteFill}
      />

      {/* Vignette: keeps the edges dark so content stays legible. */}
      <LinearGradient
        colors={['rgba(6,7,11,0.55)', 'rgba(6,7,11,0.05)', 'rgba(6,7,11,0.82)']}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

function DriftingOrb({
  orb,
  opacity,
  animate,
}: {
  orb: Orb;
  opacity: number;
  animate: boolean;
}) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animate) {
      progress.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(progress, {
          toValue: 1,
          duration: orb.duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(progress, {
          toValue: 0,
          duration: orb.duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [animate, orb.duration, progress]);

  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, orb.drift.x],
  });
  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, orb.drift.y],
  });

  return (
    <Animated.View
      style={[
        styles.orb,
        {
          width: orb.size,
          height: orb.size,
          borderRadius: orb.size / 2,
          top: orb.top as never,
          left: orb.left as never,
          opacity,
          transform: [{ translateX }, { translateY }],
        },
      ]}>
      <LinearGradient
        colors={orb.colors}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        style={styles.orbFill}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // Orbs are larger than the screen; without this they spill past the blur
  // layer and render as hard-edged circles.
  clip: {
    overflow: 'hidden',
  },
  base: {
    ...fill,
    backgroundColor: theme.bg,
  },
  orb: {
    position: 'absolute',
    overflow: 'hidden',
  },
  orbFill: {
    flex: 1,
  },
});

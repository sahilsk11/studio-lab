import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { theme } from '@/constants/theme';
import { useSettings } from '@/context/SettingsContext';

type Tone = 'default' | 'raised' | 'sunken' | 'active';

type Props = {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  radius?: number;
  tone?: Tone;
  /** Draws the bright 1px specular line along the top edge. */
  sheen?: boolean;
  /** Coloured rim + glow, used for selected / focused states. */
  glowColor?: string;
  padded?: boolean;
};

/**
 * The core material of the app: a blurred pane with a lit top edge, a soft
 * interior gradient and a darkened floor so it reads as a physical slab
 * floating above the backdrop.
 */
export function GlassCard({
  children,
  style,
  contentStyle,
  radius = theme.radius.lg,
  tone = 'default',
  sheen = true,
  glowColor,
  padded = false,
}: Props) {
  const { blur } = useSettings();

  const fill =
    tone === 'raised'
      ? theme.glass.fillStrong
      : tone === 'sunken'
        ? theme.glass.fillSunken
        : tone === 'active'
          ? theme.glass.fillActive
          : theme.glass.fill;

  const borderColor =
    glowColor ?? (tone === 'active' ? theme.glass.borderStrong : theme.glass.border);

  return (
    <View
      style={[
        styles.wrap,
        { borderRadius: radius },
        tone === 'raised' ? theme.shadow.lg : theme.shadow.md,
        glowColor
          ? Platform.select({
              web: { boxShadow: `0 0 0 1px ${glowColor}, 0 10px 40px ${glowColor}` },
              default: { shadowColor: glowColor, shadowOpacity: 0.5, shadowRadius: 18 },
            })
          : null,
        style,
      ]}>
      <BlurView
        intensity={tone === 'sunken' ? Math.round(blur * 0.6) : blur}
        tint="dark"
        experimentalBlurMethod="dimezisBlurView"
        style={[StyleSheet.absoluteFill, { borderRadius: radius }]}
      />

      {/* Body tint */}
      <View
        style={[StyleSheet.absoluteFill, { backgroundColor: fill, borderRadius: radius }]}
      />

      {/* Light falling from above, fading into a shaded floor */}
      <LinearGradient
        colors={theme.glass.sheen}
        locations={[0, 0.4, 1]}
        style={[StyleSheet.absoluteFill, { borderRadius: radius }]}
        pointerEvents="none"
      />
      <LinearGradient
        colors={theme.glass.depth}
        start={{ x: 0.5, y: 0.45 }}
        end={{ x: 0.5, y: 1 }}
        style={[StyleSheet.absoluteFill, { borderRadius: radius }]}
        pointerEvents="none"
      />

      {/* Rim */}
      <View
        style={[
          StyleSheet.absoluteFill,
          styles.rim,
          { borderRadius: radius, borderColor },
        ]}
        pointerEvents="none"
      />

      {/* Specular highlight across the very top edge */}
      {sheen ? (
        <LinearGradient
          colors={theme.glass.edge}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.edge, { borderTopLeftRadius: radius, borderTopRightRadius: radius }]}
          pointerEvents="none"
        />
      ) : null}

      <View style={[padded && styles.padded, contentStyle]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
    backgroundColor: 'transparent',
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
  padded: {
    padding: theme.space.lg,
  },
});

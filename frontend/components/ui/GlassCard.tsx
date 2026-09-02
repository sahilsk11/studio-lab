import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { theme } from '@/constants/theme';

type Tone = 'default' | 'raised' | 'sunken' | 'active';

type Props = {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  radius?: number;
  tone?: Tone;
  glowColor?: string;
  padded?: boolean;
};

/** Crisp, modest paper card shared by forms and review grids. */
export function GlassCard({
  children,
  style,
  contentStyle,
  radius = theme.radius.lg,
  tone = 'default',
  glowColor,
  padded = false,
}: Props) {
  const backgroundColor =
    tone === 'sunken'
      ? theme.surfaceMuted
      : tone === 'active'
        ? theme.accentSoft
        : theme.surface;
  const borderColor = glowColor ?? (tone === 'active' ? theme.accent : theme.border);

  return (
    <View
      style={[
        styles.card,
        { borderRadius: radius, backgroundColor, borderColor },
        tone === 'raised' ? theme.shadow.md : null,
        glowColor
          ? Platform.select({
              web: { boxShadow: `0 0 0 2px ${glowColor}` },
              default: { shadowColor: glowColor, shadowOpacity: 0.14, shadowRadius: 6 },
            })
          : null,
        style,
      ]}>
      <View style={[padded && styles.padded, contentStyle]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
    borderWidth: 1,
  },
  padded: {
    padding: theme.space.lg,
  },
});

import { LinearGradient } from 'expo-linear-gradient';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { theme } from '@/constants/theme';
import { thumbColors } from '@/lib/chrome';

/** Deterministic striped project thumbnail. */
export function ProjectThumb({
  id,
  size = 36,
  style,
}: {
  id: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const [a, b] = thumbColors(id || 'new');
  const radius = Math.max(6, Math.round(size * 0.22));

  return (
    <View style={[{ width: size, height: size, borderRadius: radius, overflow: 'hidden' }, style]}>
      {Platform.OS === 'web' ? (
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: a },
            { backgroundImage: `repeating-linear-gradient(135deg, ${a} 0 5px, ${b} 5px 10px)` } as object,
          ]}
        />
      ) : (
        <LinearGradient
          colors={[a, b]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      )}
    </View>
  );
}

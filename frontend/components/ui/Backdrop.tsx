import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import { theme } from '@/constants/theme';

/** Quiet warm stock behind every screen. */
export function Backdrop() {
  return (
    <View style={[StyleSheet.absoluteFill, styles.backdrop]}>
      <LinearGradient
        colors={['#FFFDF7', theme.bg, '#F7F0E5']}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.topWash} />
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { pointerEvents: 'none' },
  topWash: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 220,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
});

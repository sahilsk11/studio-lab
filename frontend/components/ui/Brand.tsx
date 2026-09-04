import { useRouter } from 'expo-router';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/constants/theme';
import { useSettings } from '@/context/SettingsContext';

/** Logo, wordmark, and beta tag used in the sidebar and mobile chrome. */
export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <View style={styles.mark} accessibilityLabel="Studio Lab">
      <View style={[styles.logo, compact && styles.logoCompact]}>
        <View style={[styles.logoDot, compact && styles.logoDotCompact]} />
      </View>
      <Text style={[styles.wordmark, compact && styles.wordmarkCompact]}>Studio Lab</Text>
      <View style={styles.beta}>
        <Text style={styles.betaText}>beta</Text>
      </View>
    </View>
  );
}

export function BrandButton({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const { tap } = useSettings();

  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel="Studio Lab home"
      onPress={() => {
        tap('light');
        router.replace('/');
      }}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
      <BrandMark compact={compact} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  mark: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
  },
  button: {
    alignSelf: 'flex-start',
    ...Platform.select({ web: { cursor: 'pointer' }, default: {} }),
  },
  pressed: { opacity: 0.7 },
  logo: {
    width: 18,
    height: 18,
    borderRadius: 6,
    backgroundColor: theme.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoCompact: { width: 16, height: 16, borderRadius: 5 },
  logoDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  logoDotCompact: { width: 6, height: 6 },
  wordmark: {
    color: theme.text,
    fontFamily: theme.font.sans,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  wordmarkCompact: { fontSize: 15 },
  beta: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: theme.borderStrong,
  },
  betaText: {
    color: theme.textTertiary,
    fontFamily: theme.font.mono,
    fontSize: 9,
    letterSpacing: 0.2,
  },
});

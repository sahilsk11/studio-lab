import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/constants/theme';
import { useSettings } from '@/context/SettingsContext';
import { IconButton } from './Button';
import { Container } from './Screen';

/** Chrome app mark — a metal tile with a film glyph. */
export function BrandMark({ size = 30 }: { size?: number }) {
  return (
    <View
      style={[
        styles.mark,
        { width: size, height: size, borderRadius: size * 0.31 },
        theme.shadow.sm,
      ]}>
      <LinearGradient
        colors={theme.metal.chrome}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={theme.metal.convex}
        locations={[0, 0.45, 0.72, 1]}
        style={StyleSheet.absoluteFill}
      />
      <Ionicons name="film" size={size * 0.5} color={theme.textOnMetal} />
    </View>
  );
}

/**
 * Persistent top bar. Shows the brand, a live status pill when the app is in
 * demo mode, and the settings entry point.
 */
export function AppHeader({
  title,
  onBack,
  right,
  showSettings = true,
}: {
  title?: string;
  onBack?: () => void;
  right?: React.ReactNode;
  /** Turn off on the settings route itself. */
  showSettings?: boolean;
}) {
  const router = useRouter();
  const { settings, tap } = useSettings();

  return (
    <Container>
      <View style={styles.bar}>
        <View style={styles.left}>
          {onBack ? (
            <IconButton
              icon="chevron-back"
              accessibilityLabel="Go back"
              size={36}
              onPress={onBack}
            />
          ) : (
            <BrandMark />
          )}

          <View style={styles.titleBlock}>
            <Text style={styles.wordmark}>{title ?? 'Studio Lab'}</Text>
            {!title ? <Text style={styles.tagline}>AI video studio</Text> : null}
          </View>
        </View>

        <View style={styles.right}>
          {settings.testMode ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Demo mode is on. Open settings."
              onPress={() => {
                tap('light');
                router.push('/settings');
              }}
              style={styles.demoPill}>
              <View style={styles.demoDot} />
              <Text style={styles.demoText}>DEMO</Text>
            </Pressable>
          ) : null}

          {right}
          {!right && showSettings ? (
            <IconButton
              icon="options-outline"
              accessibilityLabel="Settings"
              size={36}
              onPress={() => router.push('/settings')}
            />
          ) : null}
        </View>
      </View>
    </Container>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.space.xl,
    paddingTop: theme.space.md,
    paddingBottom: theme.space.md,
    gap: theme.space.md,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.md,
    flex: 1,
    minWidth: 0,
  },
  mark: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
  },
  wordmark: {
    fontFamily: theme.font.sans,
    fontSize: 17,
    fontWeight: '700',
    color: theme.text,
    letterSpacing: -0.3,
  },
  tagline: {
    fontFamily: theme.font.sans,
    fontSize: 11.5,
    color: theme.textTertiary,
    letterSpacing: -0.05,
    marginTop: 1,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.sm,
  },
  demoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 26,
    paddingHorizontal: 10,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.warningDim,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(251,191,36,0.4)',
    ...Platform.select({ web: { cursor: 'pointer' }, default: {} }),
  },
  demoDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.warning,
  },
  demoText: {
    fontFamily: theme.font.sans,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: theme.warning,
  },
});

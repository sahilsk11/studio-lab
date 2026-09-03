import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/constants/theme';
import { useSettings } from '@/context/SettingsContext';
import { IconButton } from './Button';
import { Container } from './Screen';
import { ProjectPicker } from './ProjectPicker';
import { AuthControls } from './AuthControls';

export function BrandMark({ size = 20 }: { size?: number }) {
  return (
    <View
      style={[
        styles.mark,
        { width: size, height: size, borderRadius: Math.max(4, size * 0.27) },
      ]}>
      <View style={styles.markCut} />
    </View>
  );
}

export function AppHeader({
  title,
  onBack,
  right,
  showSettings = true,
  showProjectPicker = true,
  dark = false,
}: {
  title?: string;
  onBack?: () => void;
  right?: React.ReactNode;
  showSettings?: boolean;
  showProjectPicker?: boolean;
  dark?: boolean;
}) {
  const router = useRouter();
  const { settings, tap } = useSettings();

  return (
    <Container>
      <View style={[styles.bar, dark && styles.barDark]}>
        <View style={styles.left}>
          {onBack ? (
            <IconButton
              icon="chevron-back"
              accessibilityLabel="Go back"
              size={34}
              color={dark ? '#FFFDF8' : theme.text}
              style={dark ? styles.iconButtonDark : undefined}
              onPress={onBack}
            />
          ) : (
            <BrandMark />
          )}
          <Text numberOfLines={1} style={[styles.wordmark, dark && styles.wordmarkDark]}>
            {title ?? 'Reel'}
          </Text>
          {showProjectPicker ? <ProjectPicker /> : null}
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
              style={({ pressed }) => [styles.demoPill, pressed && styles.pressed]}>
              <View style={styles.demoDot} />
              <Text style={styles.demoText}>DEMO</Text>
            </Pressable>
          ) : null}

          {right}
          <AuthControls />
          {!right && showSettings ? (
            <IconButton
              icon="options-outline"
              accessibilityLabel="Settings"
              size={34}
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
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.space.xl,
    paddingVertical: 10,
    gap: theme.space.md,
    overflow: 'visible',
    zIndex: 20,
  },
  barDark: { backgroundColor: '#302C27' },
  left: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  mark: {
    backgroundColor: theme.accent,
    overflow: 'hidden',
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
  },
  markCut: {
    width: '42%',
    height: '42%',
    borderBottomLeftRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.32)',
  },
  wordmark: {
    flexShrink: 0,
    fontFamily: theme.font.sans,
    fontSize: 14.5,
    lineHeight: 20,
    fontWeight: '600',
    color: theme.text,
    letterSpacing: -0.18,
  },
  wordmarkDark: { color: '#FFFDF8' },
  iconButtonDark: {
    backgroundColor: 'rgba(255,253,248,0.12)',
    borderColor: 'rgba(255,253,248,0.3)',
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.sm,
  },
  demoPill: {
    height: 25,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 9,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.warningDim,
    borderWidth: 1,
    borderColor: '#E8C895',
    ...Platform.select({ web: { cursor: 'pointer' }, default: {} }),
  },
  demoDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.warning,
  },
  demoText: {
    fontFamily: theme.font.mono,
    fontSize: 9.5,
    fontWeight: '500',
    letterSpacing: 0.8,
    color: theme.warning,
  },
  pressed: { opacity: 0.7 },
});

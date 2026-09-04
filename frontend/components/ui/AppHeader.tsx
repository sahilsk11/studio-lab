import { useRouter } from 'expo-router';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/constants/theme';
import { useSidebar } from '@/context/SidebarContext';
import { useSettings } from '@/context/SettingsContext';
import { IconButton } from './Button';
import { Container } from './Screen';
import { AuthControls } from './AuthControls';
import { useDesktopLayout } from './StepSidebar';

export function BrandMark() {
  return (
    <Text accessibilityLabel="Studio Lab" style={styles.brand}>
      Studio Lab
    </Text>
  );
}

export function AppHeader({
  right,
  showSidebarToggle = true,
  dark = false,
}: {
  right?: React.ReactNode;
  showSidebarToggle?: boolean;
  dark?: boolean;
}) {
  const router = useRouter();
  const desktop = useDesktopLayout();
  const { tap } = useSettings();
  const { open, hasNavigated, toggle } = useSidebar();
  const showToggle = showSidebarToggle && desktop && !hasNavigated && !open;

  return (
    <Container>
      <View style={[styles.bar, dark && styles.barDark]}>
        <View style={styles.left}>
          {showToggle ? (
            <IconButton
              icon="menu-outline"
              accessibilityLabel="Show sidebar"
              size={34}
              color={dark ? '#FFFDF8' : theme.text}
              onPress={toggle}
            />
          ) : null}

          <Pressable
            accessibilityRole="link"
            accessibilityLabel="Studio Lab home"
            onPress={() => {
              tap('light');
              router.replace('/');
            }}
            style={({ pressed }) => [styles.brandButton, pressed && styles.pressed]}>
            <BrandMark />
          </Pressable>
        </View>

        <View style={styles.right}>
          {right}
          <AuthControls />
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
    paddingVertical: theme.space.sm,
    gap: theme.space.lg,
    overflow: 'visible',
    zIndex: 20,
  },
  barDark: { backgroundColor: '#302C27' },
  left: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.md,
  },
  brand: {
    flexShrink: 0,
    fontFamily: theme.font.sans,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
    color: theme.text,
    letterSpacing: -0.25,
  },
  brandButton: {
    ...Platform.select({ web: { cursor: 'pointer' }, default: {} }),
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.sm,
    flexShrink: 0,
  },
  pressed: { opacity: 0.7 },
});

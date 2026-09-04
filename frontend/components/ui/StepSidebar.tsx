import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import { Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { theme } from '@/constants/theme';
import { useSettings } from '@/context/SettingsContext';
import type { Step } from '@/types/project';

import { SidebarAuth } from './AuthControls';
import { ProjectPicker } from './ProjectPicker';
import { StepRail } from './StepRail';

export const SIDEBAR_WIDTH = 220;
export const DESKTOP_BREAKPOINT = 900;

export function useDesktopLayout() {
  const { width } = useWindowDimensions();
  return width >= DESKTOP_BREAKPOINT;
}

/** Shared nav row styling for sidebar links. */
export const sidebarNavStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 32,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: theme.radius.sm,
    ...Platform.select({ web: { cursor: 'pointer' }, default: {} }),
  },
  label: {
    flex: 1,
    minWidth: 0,
    color: theme.textSecondary,
    fontFamily: theme.font.sans,
    fontSize: 13,
    fontWeight: '500',
  },
  labelActive: {
    color: theme.text,
    fontWeight: '600',
  },
  pressed: { opacity: 0.64 },
});

/** App sidebar — brand, project picker, steps, auth, and settings. */
export function StepSidebar({
  current,
  dark = false,
  placement = 'inline',
}: {
  current: Step;
  dark?: boolean;
  placement?: 'column' | 'inline';
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { tap } = useSettings();
  const desktop = useDesktopLayout();
  const isColumn = placement === 'column' && desktop;
  const onSettings = pathname === '/settings';

  return (
    <View
      style={[
        styles.shell,
        isColumn ? styles.shellColumn : styles.shellInline,
        dark && !isColumn && styles.shellInlineDark,
      ]}>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel="Studio Lab home"
        onPress={() => {
          tap('light');
          router.replace('/');
        }}
        style={({ pressed }) => [sidebarNavStyles.row, styles.brandRow, pressed && sidebarNavStyles.pressed]}>
        <Text style={styles.brand}>Studio Lab</Text>
      </Pressable>

      <View style={styles.projectBlock}>
        <ProjectPicker compact={!isColumn} />
      </View>

      <View style={isColumn ? styles.railWrap : styles.railInline}>
        <StepRail
          current={current}
          orientation={isColumn ? 'vertical' : 'horizontal'}
          dark={dark && !isColumn}
        />
      </View>

      <View style={styles.footer}>
        <SidebarAuth style={sidebarNavStyles.row} labelStyle={sidebarNavStyles.label} />
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: onSettings }}
          accessibilityLabel="Settings"
          onPress={() => {
            tap('light');
            router.push('/settings');
          }}
          style={({ pressed }) => [
            sidebarNavStyles.row,
            onSettings && styles.settingsActive,
            pressed && sidebarNavStyles.pressed,
          ]}>
          <Ionicons name="settings-outline" size={17} color={theme.textSecondary} />
          <Text style={[sidebarNavStyles.label, onSettings && sidebarNavStyles.labelActive]}>
            Settings
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    backgroundColor: theme.surface,
    borderColor: theme.border,
  },
  shellInline: {
    paddingHorizontal: theme.space.sm,
    paddingVertical: theme.space.md,
    borderWidth: 1,
    borderRadius: theme.radius.sm,
    gap: theme.space.xs,
  },
  shellInlineDark: {
    backgroundColor: '#3A342F',
    borderColor: '#5D544B',
  },
  shellColumn: {
    flex: 1,
  },
  brandRow: {
    minHeight: 0,
    paddingVertical: 2,
    marginBottom: theme.space.xs,
  },
  brand: {
    flex: 1,
    color: theme.text,
    fontFamily: theme.font.sans,
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.35,
  },
  projectBlock: {
    marginBottom: theme.space.sm,
    zIndex: 30,
  },
  railWrap: {
    flex: 1,
    minHeight: 0,
  },
  railInline: {
    minWidth: 0,
  },
  footer: {
    gap: 0,
    paddingTop: theme.space.sm,
  },
  settingsActive: {
    backgroundColor: theme.accentSoft,
  },
});

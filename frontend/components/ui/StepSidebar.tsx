import { StyleSheet, View, useWindowDimensions } from 'react-native';

import { theme } from '@/constants/theme';
import type { Step } from '@/types/project';

import { StepRail } from './StepRail';

export const SIDEBAR_WIDTH = 200;
/** Content inset when the desktop step rail is pinned to the left. */
export const SIDEBAR_INSET = 224;
export const DESKTOP_BREAKPOINT = 900;

export function useDesktopLayout() {
  const { width } = useWindowDimensions();
  return width >= DESKTOP_BREAKPOINT;
}

/** Shared step-rail shell used across workflow screens. */
export function StepSidebar({
  current,
  dark = false,
}: {
  current: Step;
  dark?: boolean;
}) {
  const desktop = useDesktopLayout();

  return (
    <View
      style={[
        styles.shell,
        desktop ? styles.shellDesktop : styles.shellMobile,
        dark && !desktop && styles.shellMobileDark,
      ]}>
      <StepRail
        current={current}
        orientation={desktop ? 'vertical' : 'horizontal'}
        dark={dark && !desktop}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    backgroundColor: theme.surface,
    borderColor: theme.border,
  },
  shellMobile: {
    paddingHorizontal: theme.space.sm,
    paddingVertical: theme.space.md,
    borderWidth: 1,
    borderRadius: theme.radius.sm,
  },
  shellMobileDark: {
    backgroundColor: '#3A342F',
    borderColor: '#5D544B',
  },
  shellDesktop: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: SIDEBAR_WIDTH,
    paddingHorizontal: theme.space.sm,
    paddingVertical: theme.space.lg,
    borderRadius: 0,
    borderTopWidth: 0,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    borderRightWidth: StyleSheet.hairlineWidth,
  },
});

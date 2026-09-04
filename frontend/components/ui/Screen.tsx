import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { theme } from '@/constants/theme';
import type { Step } from '@/types/project';

import { Backdrop } from './Backdrop';
import { StepSidebar, SIDEBAR_WIDTH, useDesktopLayout } from './StepSidebar';

export const CONTENT_MAX_WIDTH = 1120;
const ACTION_MAX_WIDTH = 760;

/** Safe-area-aware shell with a fixed left sidebar on desktop. */
export function Screen({
  children,
  footer,
  contentStyle,
  currentStep,
  sidebarDark = false,
}: {
  children: React.ReactNode;
  footer?: React.ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  currentStep?: Step;
  sidebarDark?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const desktop = useDesktopLayout();
  const showDesktopSidebar = Boolean(currentStep && desktop);

  return (
    <View style={styles.root}>
      <Backdrop />

      <View style={styles.body}>
        {showDesktopSidebar ? (
          <View
            style={[
              styles.sidebarColumn,
              {
                paddingTop: insets.top + theme.space.lg,
                paddingBottom: Math.max(insets.bottom, theme.space.sm),
                paddingHorizontal: theme.space.sm,
              },
            ]}>
            <StepSidebar current={currentStep!} dark={sidebarDark} placement="column" />
          </View>
        ) : null}

        <View style={[styles.main, !showDesktopSidebar && { paddingTop: insets.top }]}>
          {!desktop && currentStep ? (
            <View style={[styles.mobileRail, { paddingTop: insets.top + theme.space.sm }]}>
              <StepSidebar current={currentStep} dark={sidebarDark} placement="inline" />
            </View>
          ) : null}

          <View style={[styles.content, contentStyle]}>{children}</View>

          {footer ? (
            <View
              style={[
                styles.footer,
                { paddingBottom: Math.max(insets.bottom, theme.space.md) },
              ]}>
              <View style={styles.footerContent}>{footer}</View>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

export function Container({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={styles.containerOuter}>
      <View style={[styles.containerInner, style]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.bg,
  },
  body: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebarColumn: {
    width: SIDEBAR_WIDTH,
    flexShrink: 0,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: theme.border,
    backgroundColor: theme.surface,
  },
  main: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'column',
  },
  mobileRail: {
    paddingHorizontal: theme.space.xl,
  },
  content: { flex: 1 },
  footer: {
    justifyContent: 'center',
    paddingTop: theme.space.md,
    paddingHorizontal: theme.space.xl,
    backgroundColor: theme.bg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.border,
  },
  footerContent: {
    width: '100%',
    maxWidth: ACTION_MAX_WIDTH,
    alignSelf: 'flex-start',
    gap: theme.space.md,
  },
  containerOuter: {
    width: '100%',
    alignItems: 'center',
  },
  containerInner: {
    width: '100%',
    maxWidth: CONTENT_MAX_WIDTH,
  },
});

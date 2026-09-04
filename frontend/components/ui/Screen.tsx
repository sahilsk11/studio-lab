import { useRouter } from 'expo-router';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { theme } from '@/constants/theme';
import { adjacentStep, stepShort } from '@/lib/chrome';
import { stepRoute } from '@/lib/project';
import type { Step } from '@/types/project';

import { ActionBar, type ActionSpec } from './ActionBar';
import { Backdrop } from './Backdrop';
import { BrandButton } from './Brand';
import { PageHeader, type PageStat } from './PageHeader';
import { ProjectPicker } from './ProjectPicker';
import { StepRail } from './StepRail';
import { StepSidebar, SIDEBAR_WIDTH, useDesktopLayout } from './StepSidebar';

export const CONTENT_MAX_WIDTH = 1120;
export { SIDEBAR_WIDTH, useDesktopLayout };

/** Safe-area-aware shell: sidebar, white content panel, shared action bar. */
export function Screen({
  children,
  currentStep,
  title,
  subtitle,
  stats,
  headerRight,
  previous,
  next,
  extra,
  loading = false,
  keyboard = false,
  contentStyle,
}: {
  children?: React.ReactNode;
  currentStep?: Step;
  title?: string;
  subtitle?: string;
  stats?: PageStat[];
  headerRight?: React.ReactNode;
  previous?: ActionSpec | null;
  next?: ActionSpec | null;
  extra?: React.ReactNode;
  loading?: boolean;
  keyboard?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const desktop = useDesktopLayout();
  const showDesktopSidebar = Boolean(currentStep && desktop);

  const autoPrev = currentStep ? adjacentStep(currentStep, -1) : null;
  const prevAction =
    previous === null
      ? null
      : previous ??
        (autoPrev
          ? {
              label: stepShort(autoPrev),
              onPress: () => router.push(stepRoute(autoPrev) as never),
            }
          : null);

  const showHeader = Boolean(title || headerRight || stats?.length);
  const showActions = Boolean(prevAction || next || extra);

  const panel = (
    <View
      style={[
        styles.panel,
        !desktop && styles.panelMobile,
        {
          marginTop: desktop ? theme.space.md : theme.space.sm,
          marginRight: desktop ? theme.space.md : theme.space.sm,
          marginBottom: Math.max(insets.bottom, desktop ? theme.space.md : theme.space.sm),
          marginLeft: showDesktopSidebar ? 0 : desktop ? theme.space.md : theme.space.sm,
        },
      ]}>
      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={theme.textSecondary} />
        </View>
      ) : (
        <>
          {showHeader && title ? (
            <View style={styles.headerPad}>
              <PageHeader title={title} subtitle={subtitle} stats={stats} right={headerRight} />
            </View>
          ) : null}

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={[styles.scrollContent, !showHeader && styles.scrollSolo, contentStyle]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>

          {showActions ? (
            <View style={styles.actionPad}>
              <ActionBar previous={prevAction} next={next} extra={extra} />
            </View>
          ) : null}
        </>
      )}
    </View>
  );

  const body = (
    <View style={styles.body}>
      {showDesktopSidebar ? (
        <View
          style={[
            styles.sidebarColumn,
            {
              paddingTop: insets.top + theme.space.lg,
              paddingBottom: Math.max(insets.bottom, theme.space.md),
              paddingHorizontal: theme.space.md,
            },
          ]}>
          <StepSidebar current={currentStep!} />
        </View>
      ) : null}

      <View style={[styles.main, { paddingTop: desktop ? insets.top : 0 }]}>
        {!desktop && currentStep ? (
          <View style={[styles.mobileChrome, { paddingTop: insets.top + theme.space.sm }]}>
            <View style={styles.mobileTop}>
              <BrandButton compact />
            </View>
            <ProjectPicker compact />
            <StepRail current={currentStep} orientation="horizontal" />
          </View>
        ) : null}
        {panel}
      </View>
    </View>
  );

  return (
    <View style={styles.root}>
      <Backdrop />
      {keyboard ? (
        <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {body}
        </KeyboardAvoidingView>
      ) : (
        body
      )}
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
  fill: { flex: 1 },
  body: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebarColumn: {
    width: SIDEBAR_WIDTH,
    flexShrink: 0,
    zIndex: 20,
    overflow: 'visible',
  },
  main: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'column',
  },
  mobileChrome: {
    paddingHorizontal: theme.space.md,
    gap: theme.space.sm,
  },
  mobileTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  panel: {
    flex: 1,
    minHeight: 0,
    backgroundColor: theme.surface,
    borderRadius: theme.radius.panel,
    borderWidth: 1,
    borderColor: theme.border,
    overflow: 'hidden',
    ...theme.shadow.sm,
  },
  panelMobile: {
    borderRadius: theme.radius.lg,
  },
  headerPad: {
    paddingHorizontal: theme.space.xl,
    paddingTop: theme.space.xl,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: theme.space.xl,
    paddingBottom: theme.space.xl,
    flexGrow: 1,
  },
  scrollSolo: {
    paddingTop: theme.space.xl,
  },
  actionPad: {
    paddingHorizontal: theme.space.xl,
    paddingBottom: theme.space.lg,
  },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  containerOuter: {
    width: '100%',
    alignItems: 'center',
  },
  containerInner: {
    width: '100%',
    maxWidth: CONTENT_MAX_WIDTH,
  },
});

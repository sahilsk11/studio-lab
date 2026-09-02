import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { theme } from '@/constants/theme';
import { Backdrop } from './Backdrop';

export const CONTENT_MAX_WIDTH = 1120;
const ACTION_MAX_WIDTH = 760;

/** Safe-area-aware paper shell shared by phone and desktop layouts. */
export function Screen({
  children,
  header,
  footer,
  contentStyle,
}: {
  children: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      <Backdrop />

      {header ? (
        <View style={[styles.header, { paddingTop: insets.top }]}>{header}</View>
      ) : null}

      <View style={[styles.content, contentStyle]}>{children}</View>

      {footer ? (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={styles.footerContent}>{footer}</View>
        </View>
      ) : null}
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
  header: {
    backgroundColor: 'rgba(251,248,239,0.96)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.border,
    zIndex: 10,
  },
  content: { flex: 1 },
  footer: {
    paddingTop: theme.space.md,
    paddingHorizontal: theme.space.xl,
    backgroundColor: theme.bg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.border,
  },
  footerContent: {
    width: '100%',
    maxWidth: ACTION_MAX_WIDTH,
    alignSelf: 'center',
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

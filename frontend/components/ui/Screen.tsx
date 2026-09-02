import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fill, theme } from '@/constants/theme';
import { useSettings } from '@/context/SettingsContext';
import { Backdrop } from './Backdrop';

export const CONTENT_MAX_WIDTH = 760;

/**
 * Every route sits on this shell: ambient backdrop, safe-area aware header
 * slot, scrollable body and a floating frosted action bar.
 */
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
  const { blur } = useSettings();

  return (
    <View style={styles.root}>
      <Backdrop />

      {header ? <View style={{ paddingTop: insets.top }}>{header}</View> : null}

      <View style={[styles.content, contentStyle]}>{children}</View>

      {footer ? (
        <View style={styles.footerWrap}>
          {/* Fades the scrolling content out behind the action bar. */}
          <LinearGradient
            colors={['rgba(6,7,11,0)', 'rgba(6,7,11,0.75)']}
            style={styles.footerFade}
            pointerEvents="none"
          />
          <View style={styles.footerBar}>
            <BlurView
              intensity={blur + 10}
              tint="dark"
              experimentalBlurMethod="dimezisBlurView"
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.footerTint} />
            <LinearGradient
              colors={theme.glass.edge}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.footerEdge}
            />
            <View
              style={[
                styles.footerInner,
                { paddingBottom: Math.max(insets.bottom, theme.space.lg) },
              ]}>
              <View style={styles.footerContent}>{footer}</View>
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}

/** Centres page content and caps its width on tablets and desktop web. */
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
  content: {
    flex: 1,
  },
  footerWrap: {
    position: 'relative',
  },
  footerFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: '100%',
    height: 36,
  },
  footerBar: {
    overflow: 'hidden',
  },
  footerTint: {
    ...fill,
    backgroundColor: 'rgba(10,12,20,0.55)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.glass.border,
  },
  footerEdge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
  },
  footerInner: {
    paddingTop: theme.space.lg,
    paddingHorizontal: theme.space.xl,
  },
  footerContent: {
    width: '100%',
    maxWidth: CONTENT_MAX_WIDTH,
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

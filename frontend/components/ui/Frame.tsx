import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Image,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { fill, theme } from '@/constants/theme';
import { useSettings } from '@/context/SettingsContext';
import type { ImageStatus } from '@/types/project';

export const FRAME_ASPECT = 9 / 16;
export const FRAME_MAX_WIDTH = 200;
export const FRAME_MIN_WIDTH = 110;

export const SHEET_ASPECT = 16 / 9;
export const SHEET_MAX_WIDTH = 420;
export const SHEET_MIN_WIDTH = 160;

/** Diagonal light sweep used while media is rendering. */
export function Shimmer({ style }: { style?: StyleProp<ViewStyle> }) {
  const { animate } = useSettings();
  const x = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animate) return;
    const loop = Animated.loop(
      Animated.timing(x, {
        toValue: 1,
        duration: 1500,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [animate, x]);

  const translateX = x.interpolate({ inputRange: [0, 1], outputRange: ['-120%', '120%'] });

  return (
    <View style={[StyleSheet.absoluteFill, styles.shimmerClip, style]} pointerEvents="none">
      <Animated.View style={[styles.shimmerBand, { transform: [{ translateX }] }]}>
        <LinearGradient
          colors={[
            'rgba(255,255,255,0)',
            'rgba(255,255,255,0.14)',
            'rgba(255,255,255,0)',
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}

type MediaFrameProps = {
  uri?: string;
  width?: number;
  status?: ImageStatus;
  emptyLabel?: string;
  resizeMode?: 'cover' | 'contain';
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  aspectRatio: number;
  maxWidth: number;
  minWidth: number;
};

function MediaFrame({
  uri,
  width,
  status = 'pending',
  emptyLabel = 'Tap to generate',
  resizeMode = 'cover',
  style,
  children,
  aspectRatio,
  maxWidth,
  minWidth,
}: MediaFrameProps) {
  const frameWidth = width ?? maxWidth;
  const generating = status === 'generating';

  return (
    <View
      style={[
        styles.frame,
        theme.shadow.md,
        {
          width: frameWidth,
          aspectRatio,
          maxWidth,
          minWidth,
          borderRadius: theme.radius.md,
        },
        style,
      ]}>
      <View style={styles.frameFill}>
        {uri ? (
          <Image
            source={{ uri }}
            style={StyleSheet.absoluteFill}
            resizeMode={resizeMode}
            accessibilityIgnoresInvertColors
          />
        ) : children ? (
          children
        ) : (
          <View style={styles.empty}>
            {generating ? (
              <>
                <Ionicons name="sparkles" size={18} color={theme.textTertiary} />
                <Text style={styles.emptyText}>Rendering…</Text>
              </>
            ) : (
              <>
                <View style={styles.plusWell}>
                  <Ionicons name="add" size={18} color={theme.textSecondary} />
                </View>
                <Text style={styles.emptyText}>{emptyLabel}</Text>
              </>
            )}
          </View>
        )}

        {generating ? <Shimmer /> : null}
      </View>

      {/* Bezel: inner rim plus a lit top edge so the well reads as inset glass. */}
      <View
        style={[styles.bezel, { borderRadius: theme.radius.md }]}
        pointerEvents="none"
      />
      <LinearGradient
        colors={theme.glass.edge}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[
          styles.topEdge,
          {
            borderTopLeftRadius: theme.radius.md,
            borderTopRightRadius: theme.radius.md,
          },
        ]}
        pointerEvents="none"
      />
    </View>
  );
}

/**
 * 9:16 media well with a glass bezel. Renders the image when present and a
 * labelled placeholder otherwise.
 */
export function VerticalFrame({
  uri,
  width,
  status = 'pending',
  emptyLabel = 'Tap to generate',
  resizeMode = 'cover',
  style,
  children,
}: {
  uri?: string;
  width?: number;
  status?: ImageStatus;
  emptyLabel?: string;
  resizeMode?: 'cover' | 'contain';
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}) {
  return (
    <MediaFrame
      uri={uri}
      width={width}
      status={status}
      emptyLabel={emptyLabel}
      resizeMode={resizeMode}
      style={style}
      aspectRatio={FRAME_ASPECT}
      maxWidth={FRAME_MAX_WIDTH}
      minWidth={FRAME_MIN_WIDTH}>
      {children}
    </MediaFrame>
  );
}

/**
 * 16:9 character / object sheet. Uses contain so multi-view composites
 * aren't cropped in a 2- or 3-column grid.
 */
export function SheetFrame({
  uri,
  width,
  status = 'pending',
  emptyLabel = 'Tap to generate',
  resizeMode = 'contain',
  style,
  children,
}: {
  uri?: string;
  width?: number;
  status?: ImageStatus;
  emptyLabel?: string;
  resizeMode?: 'cover' | 'contain';
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}) {
  return (
    <MediaFrame
      uri={uri}
      width={width}
      status={status}
      emptyLabel={emptyLabel}
      resizeMode={resizeMode}
      style={style}
      aspectRatio={SHEET_ASPECT}
      maxWidth={SHEET_MAX_WIDTH}
      minWidth={SHEET_MIN_WIDTH}>
      {children}
    </MediaFrame>
  );
}

/** Compact labelled frame used for segment start/end pairs. */
export function FrameBox({
  label,
  status,
  imageUri,
}: {
  label: string;
  status: ImageStatus;
  imageUri?: string;
}) {
  return (
    <View style={styles.boxWrap}>
      <View style={styles.box}>
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
            accessibilityIgnoresInvertColors
          />
        ) : (
          <View style={styles.empty}>
            <Ionicons
              name={status === 'generating' ? 'sparkles' : 'image-outline'}
              size={16}
              color={theme.textQuaternary}
            />
          </View>
        )}
        {status === 'generating' ? <Shimmer /> : null}
        <View style={[styles.bezel, { borderRadius: theme.radius.sm }]} pointerEvents="none" />
      </View>
      <Text style={styles.boxLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    alignSelf: 'center',
    overflow: 'hidden',
    backgroundColor: theme.bgSunken,
  },
  frameFill: {
    ...fill,
    backgroundColor: 'rgba(255,255,255,0.035)',
  },
  bezel: {
    ...fill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.glass.borderStrong,
  },
  topEdge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
  },
  empty: {
    ...fill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  plusWell: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.glass.borderStrong,
  },
  emptyText: {
    fontFamily: theme.font.sans,
    fontSize: 11.5,
    color: theme.textTertiary,
    letterSpacing: -0.05,
  },
  shimmerClip: {
    overflow: 'hidden',
  },
  shimmerBand: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: '60%',
  },
  boxWrap: {
    flex: 1,
    gap: 6,
    alignItems: 'center',
  },
  box: {
    width: '100%',
    aspectRatio: FRAME_ASPECT,
    maxHeight: 168,
    borderRadius: theme.radius.sm,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  boxLabel: {
    fontFamily: theme.font.sans,
    fontSize: 10.5,
    fontWeight: '600',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: theme.textQuaternary,
  },
});

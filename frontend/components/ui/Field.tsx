import { BlurView } from 'expo-blur';
import { useState } from 'react';
import {
  Platform,
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import { theme } from '@/constants/theme';
import { useSettings } from '@/context/SettingsContext';
import { Eyebrow, Micro } from './Typography';

type Props = TextInputProps & {
  minHeight?: number;
  style?: StyleProp<ViewStyle>;
};

/** Recessed glass input well. Focus lights the rim with the accent colour. */
export function TextField({ minHeight = 48, style, multiline, ...rest }: Props) {
  const { blur, accent } = useSettings();
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.well, { minHeight, borderRadius: theme.radius.md }, style]}>
      <BlurView
        intensity={Math.round(blur * 0.7)}
        tint="dark"
        experimentalBlurMethod="dimezisBlurView"
        style={[StyleSheet.absoluteFill, { borderRadius: theme.radius.md }]}
      />
      <View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: theme.glass.fillSunken, borderRadius: theme.radius.md },
        ]}
      />
      <View
        style={[
          StyleSheet.absoluteFill,
          styles.rim,
          {
            borderRadius: theme.radius.md,
            borderColor: focused ? accent.tint : theme.glass.border,
          },
        ]}
        pointerEvents="none"
      />

      <TextInput
        {...rest}
        multiline={multiline}
        onFocus={(e) => {
          setFocused(true);
          rest.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          rest.onBlur?.(e);
        }}
        placeholderTextColor={theme.textQuaternary}
        selectionColor={accent.tint}
        textAlignVertical={multiline ? 'top' : 'center'}
        style={[
          styles.input,
          multiline && { minHeight: minHeight - 24 },
          Platform.OS === 'web' ? ({ outlineStyle: 'none' } as never) : null,
        ]}
      />
    </View>
  );
}

/** Label + optional hint/counter above a field. */
export function Field({
  label,
  hint,
  children,
  style,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.field, style]}>
      <View style={styles.labelRow}>
        <Eyebrow>{label}</Eyebrow>
        {hint ? <Micro>{hint}</Micro> : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  well: {
    overflow: 'hidden',
    justifyContent: 'center',
  },
  rim: {
    borderWidth: StyleSheet.hairlineWidth,
  },
  input: {
    fontFamily: theme.font.sans,
    fontSize: 15.5,
    lineHeight: 23,
    color: theme.text,
    paddingHorizontal: theme.space.lg,
    paddingVertical: theme.space.md,
    // On web the input renders as a static <textarea>/<input>, which CSS paints
    // *below* the absolutely positioned blur overlays. Lift it above them.
    position: 'relative',
    zIndex: 1,
  },
  field: {
    gap: theme.space.md,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});

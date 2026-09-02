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
import { Eyebrow, Micro } from './Typography';

type Props = TextInputProps & {
  minHeight?: number;
  style?: StyleProp<ViewStyle>;
};

export function TextField({ minHeight = 48, style, multiline, ...rest }: Props) {
  const [focused, setFocused] = useState(false);

  return (
    <View
      style={[
        styles.well,
        { minHeight },
        focused && styles.focused,
        style,
      ]}>
      <TextInput
        {...rest}
        multiline={multiline}
        onFocus={(event) => {
          setFocused(true);
          rest.onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          rest.onBlur?.(event);
        }}
        placeholderTextColor={theme.textQuaternary}
        selectionColor={theme.accent}
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
    backgroundColor: '#FFFFFF',
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderBottomWidth: 2,
    borderColor: theme.border,
    borderBottomColor: theme.borderStrong,
  },
  focused: {
    borderColor: theme.accent,
    borderBottomColor: theme.accent,
  },
  input: {
    fontFamily: theme.font.sans,
    fontSize: 15.5,
    lineHeight: 23,
    color: theme.text,
    paddingHorizontal: theme.space.lg,
    paddingVertical: theme.space.md,
  },
  field: { gap: theme.space.md },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});

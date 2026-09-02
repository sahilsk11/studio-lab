import { StyleSheet, Text, type StyleProp, type TextProps, type TextStyle } from 'react-native';

import { theme } from '@/constants/theme';

type Props = TextProps & {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
  color?: string;
};

function make(preset: keyof typeof theme.type, defaultColor: string) {
  return function Preset({ children, style, color, ...rest }: Props) {
    return (
      <Text
        {...rest}
        style={[
          styles.base,
          theme.type[preset] as TextStyle,
          { color: color ?? defaultColor },
          style,
        ]}>
        {children}
      </Text>
    );
  };
}

export const Title = make('title', theme.text);
export const Body = make('body', theme.textSecondary);
export const Caption = make('caption', theme.textSecondary);
export const CaptionStrong = make('captionStrong', theme.text);
export const Micro = make('micro', theme.textTertiary);

/** Uppercase section label. */
export function Eyebrow({ children, style, color, ...rest }: Props) {
  return (
    <Text
      {...rest}
      style={[
        styles.base,
        theme.type.eyebrow as TextStyle,
        styles.technical,
        styles.upper,
        { color: color ?? theme.textTertiary },
        style,
      ]}>
      {children}
    </Text>
  );
}

/** Monospaced readout for counters, costs and timecodes. */
export function Mono({ children, style, color, ...rest }: Props) {
  return (
    <Text
      {...rest}
      style={[
        { fontFamily: theme.font.mono, fontSize: 11, lineHeight: 16, letterSpacing: 0.18 },
        { color: color ?? theme.textTertiary },
        style,
      ]}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    fontFamily: theme.font.sans,
  },
  upper: {
    textTransform: 'uppercase',
  },
  technical: {
    fontFamily: theme.font.mono,
  },
});

import { Ionicons } from '@expo/vector-icons';
import { Children, Fragment, isValidElement } from 'react';
import { Platform, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { theme } from '@/constants/theme';
import { useSettings } from '@/context/SettingsContext';
import { GlassCard } from './GlassCard';
import { Caption, CaptionStrong, Eyebrow } from './Typography';

/** Titled group of rows rendered as one paper sheet with hairline dividers. */
export function Section({
  title,
  footnote,
  children,
  style,
}: {
  title?: string;
  footnote?: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const items = Children.toArray(children).filter(isValidElement);

  return (
    <View style={[styles.section, style]}>
      {title ? <Eyebrow style={styles.sectionTitle}>{title}</Eyebrow> : null}

      <GlassCard radius={theme.radius.lg}>
        <View>
          {items.map((child, i) => (
            <Fragment key={i}>
              {i > 0 ? <View style={styles.divider} /> : null}
              {child}
            </Fragment>
          ))}
        </View>
      </GlassCard>

      {footnote ? <Caption style={styles.footnote}>{footnote}</Caption> : null}
    </View>
  );
}

/**
 * One settings line: optional icon well, label/description, and a control or
 * value on the right. Becomes pressable when `onPress` is supplied.
 */
export function Row({
  icon,
  iconColor,
  label,
  description,
  right,
  onPress,
  destructive,
  disabled,
  children,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  label: string;
  description?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  destructive?: boolean;
  disabled?: boolean;
  /** Rendered full-width beneath the label, for chip groups and inputs. */
  children?: React.ReactNode;
}) {
  const { tap } = useSettings();
  const tint = destructive ? theme.danger : (iconColor ?? theme.neutral);

  const body = (
    <View style={[styles.row, disabled && styles.disabled]}>
      <View style={styles.rowMain}>
        {icon ? (
          <View style={styles.iconSlot}>
            <Ionicons name={icon} size={18} color={tint} />
          </View>
        ) : null}

        <View style={styles.labels}>
          <CaptionStrong style={destructive ? { color: theme.danger } : undefined}>
            {label}
          </CaptionStrong>
          {description ? <Caption style={styles.description}>{description}</Caption> : null}
        </View>

        <View style={styles.rightSlot}>
          {right}
          {onPress && !right ? (
            <Ionicons name="chevron-forward" size={16} color={theme.textQuaternary} />
          ) : null}
        </View>
      </View>

      {children ? <View style={styles.rowChildren}>{children}</View> : null}
    </View>
  );

  if (!onPress) return body;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={() => {
        tap('light');
        onPress();
      }}
      style={({ pressed }) => [pressed && styles.pressed, styles.pressable]}>
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: theme.space.md,
  },
  sectionTitle: {
    paddingHorizontal: theme.space.xs,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.border,
    marginLeft: theme.space.lg,
  },
  footnote: {
    paddingHorizontal: theme.space.xs,
    color: theme.textQuaternary,
    fontSize: 12,
    lineHeight: 17,
  },
  pressable: {
    ...Platform.select({ web: { cursor: 'pointer' }, default: {} }),
  },
  pressed: { backgroundColor: theme.accentSoft },
  row: {
    paddingHorizontal: theme.space.lg,
    paddingVertical: 14,
    gap: theme.space.md,
  },
  disabled: {
    opacity: 0.45,
  },
  rowMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.md,
  },
  iconSlot: {
    width: 22,
    alignItems: 'center',
  },
  labels: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  description: {
    fontSize: 12,
    lineHeight: 16.5,
    color: theme.textTertiary,
  },
  rightSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.sm,
  },
  rowChildren: {
    paddingLeft: 0,
  },
});

import { Ionicons } from '@expo/vector-icons';
import { Platform, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { theme } from '@/constants/theme';
import { useSettings } from '@/context/SettingsContext';
import { GlassCard } from './GlassCard';
import { Body, CaptionStrong } from './Typography';

type Variant = 'info' | 'warning' | 'error' | 'success';

const LOOK: Record<Variant, { color: string; icon: keyof typeof Ionicons.glyphMap }> = {
  info: { color: theme.info, icon: 'information-circle' },
  warning: { color: theme.warning, icon: 'alert-circle' },
  error: { color: theme.danger, icon: 'warning' },
  success: { color: theme.success, icon: 'checkmark-circle' },
};

export function Callout({
  variant = 'info',
  title,
  message,
  action,
  onAction,
  style,
}: {
  variant?: Variant;
  title: string;
  message?: string;
  action?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const look = LOOK[variant];
  const { tap } = useSettings();

  return (
    <GlassCard radius={theme.radius.md} style={style}>
      <View style={styles.inner}>
        <View style={styles.iconSlot}>
          <Ionicons name={look.icon} size={18} color={look.color} />
        </View>

        <View style={styles.body}>
          <CaptionStrong style={styles.title}>{title}</CaptionStrong>
          {message ? <Body style={styles.message}>{message}</Body> : null}
          {action && onAction ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                tap('light');
                onAction();
              }}
              style={styles.action}>
              <Text style={[styles.actionText, { color: look.color }]}>{action}</Text>
              <Ionicons name="arrow-forward" size={13} color={look.color} />
            </Pressable>
          ) : null}
        </View>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  inner: {
    flexDirection: 'row',
    gap: theme.space.md,
    padding: theme.space.lg,
  },
  iconSlot: {
    width: 22,
    paddingTop: 1,
    alignItems: 'center',
  },
  body: {
    flex: 1,
    gap: 3,
  },
  title: {
    fontSize: 14,
  },
  message: {
    fontSize: 13.5,
    lineHeight: 19,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 8,
    alignSelf: 'flex-start',
    ...Platform.select({ web: { cursor: 'pointer' }, default: {} }),
  },
  actionText: {
    fontFamily: theme.font.sans,
    fontSize: 13,
    fontWeight: '700',
  },
});

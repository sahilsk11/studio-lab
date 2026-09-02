import { Ionicons } from '@expo/vector-icons';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/constants/theme';
import { useSettings } from '@/context/SettingsContext';

type Props = {
  label: string;
  selected: boolean;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
};

export function Chip({ label, selected, onPress, icon, disabled }: Props) {
  const { tap } = useSettings();

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled: !!disabled }}
      disabled={disabled}
      onPress={() => {
        tap('light');
        onPress();
      }}
      style={({ pressed }) => [
        styles.chip,
        selected && styles.selected,
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}>
      <View style={styles.content}>
        {icon ? (
          <Ionicons
            name={icon}
            size={13}
            color={selected ? theme.accentDark : theme.textTertiary}
          />
        ) : null}
        <Text style={[styles.label, selected && styles.labelSelected]}>{label}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: 34,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    ...Platform.select({ web: { cursor: 'pointer' }, default: {} }),
  },
  selected: {
    backgroundColor: theme.accentSoft,
    borderColor: theme.accent,
  },
  disabled: { opacity: 0.42 },
  pressed: { opacity: 0.7 },
  content: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  label: {
    fontFamily: theme.font.sans,
    fontSize: 13,
    fontWeight: '500',
    color: theme.textSecondary,
  },
  labelSelected: {
    color: theme.accentDark,
    fontWeight: '600',
  },
});

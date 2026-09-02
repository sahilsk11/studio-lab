import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
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

/** Selection pill. Selected chips pick up the accent rim and a faint inner glow. */
export function Chip({ label, selected, onPress, icon, disabled }: Props) {
  const { blur, accent, tap } = useSettings();

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled: !!disabled }}
      disabled={disabled}
      onPress={() => {
        tap('light');
        onPress();
      }}
      style={[styles.chip, disabled && styles.disabled]}>
      <BlurView
        intensity={blur}
        tint="dark"
        experimentalBlurMethod="dimezisBlurView"
        style={[StyleSheet.absoluteFill, styles.round]}
      />
      <View
        style={[
          StyleSheet.absoluteFill,
          styles.round,
          { backgroundColor: selected ? theme.glass.fillActive : theme.glass.fill },
        ]}
      />
      {selected ? (
        <LinearGradient
          colors={[`${accent.tint}38`, 'transparent']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={[StyleSheet.absoluteFill, styles.round]}
        />
      ) : null}
      <View
        style={[
          StyleSheet.absoluteFill,
          styles.round,
          styles.rim,
          { borderColor: selected ? accent.tint : theme.glass.border },
        ]}
      />

      <View style={styles.content}>
        {icon ? (
          <Ionicons
            name={icon}
            size={14}
            color={selected ? theme.text : theme.textTertiary}
          />
        ) : null}
        <Text
          style={[
            styles.label,
            { color: selected ? theme.text : theme.textSecondary },
            selected && styles.labelSelected,
          ]}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    height: 38,
    paddingHorizontal: 16,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    ...Platform.select({ web: { cursor: 'pointer' }, default: {} }),
  },
  round: {
    borderRadius: theme.radius.pill,
  },
  rim: {
    borderWidth: StyleSheet.hairlineWidth,
  },
  disabled: {
    opacity: 0.4,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  label: {
    fontFamily: theme.font.sans,
    fontSize: 13.5,
    fontWeight: '500',
    letterSpacing: -0.1,
  },
  labelSelected: {
    fontWeight: '600',
  },
});

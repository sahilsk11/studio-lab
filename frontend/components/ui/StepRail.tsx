import { useRouter } from 'expo-router';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/constants/theme';
import { useProject } from '@/context/ProjectContext';
import { useSettings } from '@/context/SettingsContext';
import { canNavigateToStep, stepRoute } from '@/lib/project';
import { STEPS, type Step } from '@/types/project';

/** Seven-step, bidirectional project rail. */
export function StepRail({
  current,
  orientation = 'horizontal',
  dark = false,
}: {
  current: Step;
  orientation?: 'horizontal' | 'vertical';
  dark?: boolean;
}) {
  const router = useRouter();
  const { project } = useProject();
  const { tap } = useSettings();
  const currentIndex = STEPS.indexOf(current);
  const vertical = orientation === 'vertical';

  const items = STEPS.map((step, index) => {
    const reachable = canNavigateToStep(project, step);
    const isCurrent = step === current;
    const isDone = index < currentIndex;
    const isFuture = !isDone && !isCurrent;

    return (
      <Pressable
        key={step}
        accessibilityRole="tab"
        accessibilityState={{ selected: isCurrent, disabled: !reachable }}
        accessibilityLabel={`Step ${index + 1} of ${STEPS.length}: ${step}`}
        disabled={!reachable || isCurrent}
        onPress={() => {
          tap('light');
          router.push(stepRoute(step) as never);
        }}
        style={({ pressed }) => [
          styles.item,
          vertical ? styles.itemVertical : styles.itemHorizontal,
          isCurrent && styles.current,
          isCurrent && dark && styles.currentDark,
          !reachable && isFuture && styles.itemFuture,
          pressed && reachable && styles.pressed,
        ]}>
        <View
          style={[
            styles.dot,
            dark && styles.dotDark,
            isDone && styles.dotDone,
            isCurrent && styles.dotCurrent,
            isFuture && styles.dotFuture,
            isFuture && dark && styles.dotFutureDark,
          ]}
        />
        <Text
          numberOfLines={1}
          style={[
            styles.label,
            dark && styles.labelDark,
            isDone && styles.labelDone,
            isDone && dark && styles.labelDoneDark,
            isCurrent && styles.labelCurrent,
            isFuture && styles.labelFuture,
            isFuture && dark && styles.labelFutureDark,
          ]}>
          {step}
        </Text>
      </Pressable>
    );
  });

  if (vertical) {
    return (
      <View style={[styles.rail, styles.railVertical]} accessibilityRole="tablist">
        {items}
      </View>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      accessibilityRole="tablist"
      contentContainerStyle={styles.railHorizontal}>
      {items}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  rail: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  railVertical: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 1,
  },
  railHorizontal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: 2,
  },
  item: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: theme.radius.sm,
    ...Platform.select({ web: { cursor: 'pointer' }, default: {} }),
  },
  itemHorizontal: {
    minWidth: 74,
    minHeight: 43,
    paddingHorizontal: 8,
  },
  itemVertical: {
    width: '100%',
    minHeight: 32,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    paddingHorizontal: 10,
    gap: 8,
  },
  itemFuture: {
    opacity: 1,
  },
  current: {
    backgroundColor: theme.accentSoft,
  },
  currentDark: { backgroundColor: 'rgba(217,91,56,0.2)' },
  pressed: { opacity: 0.64 },
  dot: {
    width: 7,
    height: 7,
    flexShrink: 0,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: theme.borderStrong,
    backgroundColor: theme.surface,
  },
  dotDark: { borderColor: '#7D746A', backgroundColor: '#4A433C' },
  dotDone: {
    borderColor: theme.info,
    backgroundColor: theme.info,
  },
  dotCurrent: {
    borderColor: theme.accent,
    backgroundColor: theme.accent,
  },
  dotFuture: {
    backgroundColor: 'transparent',
    borderColor: theme.borderStrong,
  },
  dotFutureDark: {
    backgroundColor: 'transparent',
    borderColor: '#7D746A',
  },
  label: {
    fontFamily: theme.font.sans,
    fontSize: 13,
    fontWeight: '500',
    color: theme.textSecondary,
  },
  labelDark: { color: '#AAA095' },
  labelDone: { color: theme.textSecondary },
  labelDoneDark: { color: '#E4D9CC' },
  labelCurrent: {
    color: theme.text,
    fontWeight: '600',
  },
  labelFuture: { color: theme.textQuaternary },
  labelFutureDark: { color: '#7D746A' },
});

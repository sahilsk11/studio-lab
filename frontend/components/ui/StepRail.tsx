import { useRouter } from 'expo-router';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

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

  return (
    <View
      style={[styles.rail, orientation === 'vertical' && styles.railVertical]}
      accessibilityRole="tablist">
      {STEPS.map((step, index) => {
        const reachable = canNavigateToStep(project, step);
        const isCurrent = step === current;
        const isDone = index < currentIndex;

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
              orientation === 'vertical' && styles.itemVertical,
              isCurrent && styles.current,
              isCurrent && dark && styles.currentDark,
              !reachable && styles.unreachable,
              pressed && styles.pressed,
            ]}>
            <View
              style={[
                styles.dot,
                dark && styles.dotDark,
                isDone && styles.dotDone,
                isCurrent && styles.dotCurrent,
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
              ]}>
              {step}
            </Text>
          </Pressable>
        );
      })}
    </View>
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
    gap: 3,
  },
  item: {
    minWidth: 0,
    minHeight: 43,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 2,
    borderRadius: theme.radius.sm,
    ...Platform.select({ web: { cursor: 'pointer' }, default: {} }),
  },
  itemVertical: {
    width: '100%',
    minHeight: 38,
    flex: 0,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    paddingHorizontal: 10,
    gap: 10,
  },
  current: {
    backgroundColor: theme.accentSoft,
  },
  currentDark: { backgroundColor: 'rgba(217,91,56,0.2)' },
  unreachable: { opacity: 0.48 },
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
  label: {
    fontFamily: theme.font.sans,
    fontSize: 9.5,
    fontWeight: '500',
    color: theme.textTertiary,
  },
  labelDark: { color: '#AAA095' },
  labelDone: { color: theme.textSecondary },
  labelDoneDark: { color: '#E4D9CC' },
  labelCurrent: {
    color: theme.accentDark,
    fontWeight: '700',
  },
});

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/constants/theme';
import { useProject } from '@/context/ProjectContext';
import { useSettings } from '@/context/SettingsContext';
import { stepDetail, stepShort } from '@/lib/chrome';
import { canNavigateToStep, stepRoute } from '@/lib/project';
import { STEPS, type Step } from '@/types/project';

/** Seven-step rail with numbered icons and status meta. */
export function StepRail({
  current,
  orientation = 'horizontal',
}: {
  current: Step;
  orientation?: 'horizontal' | 'vertical';
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
    const detail = stepDetail(project, step, current);

    return (
      <Pressable
        key={step}
        accessibilityRole="tab"
        accessibilityState={{ selected: isCurrent, disabled: !reachable }}
        accessibilityLabel={`Step ${index + 1} of ${STEPS.length}: ${stepShort(step)}`}
        disabled={!reachable || isCurrent}
        onPress={() => {
          tap('light');
          router.push(stepRoute(step) as never);
        }}
        style={({ pressed }) => [
          styles.item,
          vertical ? styles.itemVertical : styles.itemHorizontal,
          isCurrent && styles.current,
          pressed && reachable && styles.pressed,
        ]}>
        <StepIcon index={index} done={isDone} current={isCurrent} />
        <Text
          numberOfLines={1}
          style={[
            styles.label,
            isDone && styles.labelDone,
            isCurrent && styles.labelCurrent,
            isFuture && styles.labelFuture,
          ]}>
          {stepShort(step)}
        </Text>
        {detail && vertical ? (
          <Text
            numberOfLines={1}
            style={[styles.meta, isCurrent && styles.metaCurrent, isDone && !isCurrent && styles.metaDone]}>
            {detail}
          </Text>
        ) : null}
      </Pressable>
    );
  });

  if (vertical) {
    return (
      <View style={styles.railVertical} accessibilityRole="tablist">
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

function StepIcon({ index, done, current }: { index: number; done: boolean; current: boolean }) {
  if (done) {
    return (
      <View style={[styles.icon, styles.iconDone]}>
        <Ionicons name="checkmark" size={11} color="#FFFFFF" />
      </View>
    );
  }

  return (
    <View style={[styles.icon, current && styles.iconCurrent, !current && styles.iconFuture]}>
      <Text style={[styles.iconText, current && styles.iconTextCurrent]}>{index + 1}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  railVertical: {
    width: '100%',
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 2,
  },
  railHorizontal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
  },
  item: {
    alignItems: 'center',
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: 'transparent',
    ...Platform.select({ web: { cursor: 'pointer' }, default: {} }),
  },
  itemHorizontal: {
    minWidth: 78,
    minHeight: 44,
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 4,
  },
  itemVertical: {
    width: '100%',
    minHeight: 34,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 8,
  },
  current: {
    backgroundColor: theme.accentSoft,
    borderColor: '#F0C4B4',
  },
  pressed: { opacity: 0.64 },
  icon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  iconDone: { backgroundColor: theme.success },
  iconCurrent: { backgroundColor: theme.accent },
  iconFuture: {
    backgroundColor: theme.surfaceMuted,
    borderWidth: 1,
    borderColor: theme.borderStrong,
  },
  iconText: {
    color: theme.textTertiary,
    fontFamily: theme.font.sans,
    fontSize: 10,
    fontWeight: '700',
  },
  iconTextCurrent: { color: '#FFFFFF' },
  label: {
    flexShrink: 1,
    fontFamily: theme.font.sans,
    fontSize: 13,
    fontWeight: '500',
    color: theme.textSecondary,
  },
  labelDone: { color: theme.text },
  labelCurrent: {
    color: theme.text,
    fontWeight: '700',
  },
  labelFuture: { color: theme.textQuaternary },
  meta: {
    marginLeft: 'auto',
    color: theme.textTertiary,
    fontFamily: theme.font.sans,
    fontSize: 11,
  },
  metaCurrent: {
    color: theme.accentDark,
    fontWeight: '600',
  },
  metaDone: { color: theme.textQuaternary },
});

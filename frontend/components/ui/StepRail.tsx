import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/constants/theme';
import { useProject } from '@/context/ProjectContext';
import { useSettings } from '@/context/SettingsContext';
import { canNavigateToStep, stepRoute } from '@/lib/project';
import { STEPS, type Step } from '@/types/project';

const ICONS: Record<Step, keyof typeof Ionicons.glyphMap> = {
  Idea: 'sparkles',
  Cast: 'people',
  Scenes: 'images',
  Frames: 'layers',
  Video: 'play-circle',
};

/**
 * Wizard progress. Completed steps get a filled accent node and are tappable;
 * the current step gets a metal node with a glow ring.
 */
export function StepRail({ current }: { current: Step }) {
  const router = useRouter();
  const { project } = useProject();
  const { accent, tap } = useSettings();
  const currentIdx = STEPS.indexOf(current);
  const projectReady =
    Array.isArray(project.people) &&
    Array.isArray(project.things) &&
    Array.isArray(project.scenes) &&
    Array.isArray(project.frames);

  return (
    <View style={styles.rail} accessibilityRole="tablist">
      {STEPS.map((step, i) => {
        const reachable = projectReady && canNavigateToStep(project, step);
        const isCurrent = i === currentIdx;
        const isDone = i < currentIdx;
        const active = isCurrent || isDone;

        return (
          <View key={step} style={styles.segment}>
            {i > 0 ? (
              <View style={styles.connector}>
                <View
                  style={[
                    styles.connectorLine,
                    { backgroundColor: active ? accent.tint : 'rgba(255,255,255,0.10)' },
                  ]}
                />
              </View>
            ) : null}

            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: isCurrent, disabled: !reachable }}
              accessibilityLabel={`Step ${i + 1}: ${step}`}
              disabled={!reachable || isCurrent}
              onPress={() => {
                tap('light');
                router.push(stepRoute(step) as never);
              }}
              style={styles.item}>
              <View
                style={[
                  styles.node,
                  { borderColor: active ? accent.tint : 'rgba(255,255,255,0.14)' },
                  isCurrent && [
                    styles.nodeCurrent,
                    Platform.select({
                      web: { boxShadow: `0 0 0 4px ${accent.glow}` },
                      default: {
                        shadowColor: accent.tint,
                        shadowOpacity: 0.7,
                        shadowRadius: 10,
                        shadowOffset: { width: 0, height: 0 },
                      },
                    }),
                  ],
                ]}>
                {isCurrent ? (
                  <LinearGradient
                    colors={theme.metal.chrome}
                    start={{ x: 0.1, y: 0 }}
                    end={{ x: 0.9, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                ) : isDone ? (
                  <LinearGradient
                    colors={accent.ramp}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                ) : null}

                <Ionicons
                  name={isDone ? 'checkmark' : ICONS[step]}
                  size={12}
                  color={active ? theme.textOnMetal : theme.textQuaternary}
                />
              </View>

              <Text
                numberOfLines={1}
                style={[
                  styles.label,
                  {
                    color: isCurrent
                      ? theme.text
                      : isDone
                        ? theme.textSecondary
                        : theme.textQuaternary,
                    fontWeight: isCurrent ? '700' : '500',
                  },
                ]}>
                {step}
              </Text>
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  rail: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: theme.space.xs,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  connector: {
    flex: 1,
    height: 22,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  connectorLine: {
    height: 1.5,
    borderRadius: 1,
    opacity: 0.7,
  },
  item: {
    alignItems: 'center',
    gap: 5,
    // Five labels ("Scenes") have to fit a phone width; shrink before connectors.
    width: 56,
    flexShrink: 1,
    minWidth: 0,
    ...Platform.select({ web: { cursor: 'pointer' }, default: {} }),
  },
  node: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  nodeCurrent: {
    borderColor: 'rgba(255,255,255,0.6)',
  },
  label: {
    fontFamily: theme.font.sans,
    fontSize: 10,
    letterSpacing: -0.05,
  },
});

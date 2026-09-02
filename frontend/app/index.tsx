import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';

import { AppHeader, Button, Container, Screen } from '@/components/ui';
import { theme } from '@/constants/theme';
import { useProject } from '@/context/ProjectContext';
import { useSettings } from '@/context/SettingsContext';
import { DURATIONS, STYLES } from '@/types/project';

const LOOK_COLORS = [
  ['#E7CDC5', '#F4E6DF'],
  ['#C9E5E5', '#E7F2EF'],
  ['#DDD2E9', '#F1E9F5'],
  ['#D9E3C3', '#EFF2E3'],
  ['#DED8CE', '#F1EDE5'],
] as const;

export default function IdeaScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const {
    project,
    hydrated,
    error,
    setIdea,
    setStyle,
    setDuration,
    generateCast,
    generateAllCastImages,
  } = useProject();
  const { settings, tap } = useSettings();
  const [skipping, setSkipping] = useState(false);

  const compact = width < 620;
  const canStart = project.idea.trim().length >= 12;

  useEffect(() => {
    if (hydrated && !STYLES.some((style) => style === project.style)) {
      setStyle(STYLES[0]);
    }
  }, [hydrated, project.style, setStyle]);

  async function skipInterview() {
    if (!canStart || skipping) return;
    setSkipping(true);
    try {
      await generateCast({ replace: true });
      tap('success');
      router.push('/cast');
      if (settings.autoGenerateImages) void generateAllCastImages();
    } finally {
      setSkipping(false);
    }
  }

  if (!hydrated) {
    return (
      <Screen header={<AppHeader />}>
        <View style={styles.loading}>
          <ActivityIndicator color={theme.textSecondary} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen header={<AppHeader />}>
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.scroll, compact && styles.scrollCompact]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <Container style={styles.container}>
            <View style={styles.intro}>
              <Text style={[styles.title, compact && styles.titleCompact]}>
                What&apos;s the video?
              </Text>
              <Text style={styles.subtitle}>
                A sentence is enough. Next I&apos;ll ask four multiple-choice questions,
                then start drawing.
              </Text>
            </View>

            <View style={styles.promptCard}>
              <TextInput
                accessibilityLabel="Describe your video"
                multiline
                value={project.idea}
                onChangeText={setIdea}
                onKeyPress={(event) => {
                  const keyEvent = event.nativeEvent as typeof event.nativeEvent & {
                    metaKey?: boolean;
                    ctrlKey?: boolean;
                  };
                  if (
                    Platform.OS === 'web' &&
                    keyEvent.key === 'Enter' &&
                    (keyEvent.metaKey || keyEvent.ctrlKey) &&
                    canStart
                  ) {
                    router.push('/interview');
                  }
                }}
                placeholder="A courier is late for a delivery and takes a shortcut off a balcony…"
                placeholderTextColor={theme.textTertiary}
                selectionColor={theme.accent}
                textAlignVertical="top"
                style={[styles.prompt, compact && styles.promptCompact]}
              />
              <View style={styles.promptMeta}>
                <Text style={styles.mono}>9:16 · vertical</Text>
                <View style={styles.metaRule} />
                <View style={styles.durationRow}>
                  {DURATIONS.map((duration) => {
                    const selected = project.durationSec === duration;
                    return (
                      <Pressable
                        key={duration}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        onPress={() => {
                          tap('light');
                          setDuration(duration);
                        }}
                        style={[styles.duration, selected && styles.durationSelected]}>
                        <Text
                          style={[
                            styles.durationText,
                            selected && styles.durationTextSelected,
                          ]}>
                          {duration}s
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                {!compact ? <Text style={styles.shortcut}>⌘↵ to start</Text> : null}
              </View>
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <View style={styles.lookSection}>
              <View style={styles.lookHeading}>
                <Text style={styles.eyebrow}>LOOK</Text>
                <Text style={styles.lookHint}>— pick one, change it later</Text>
              </View>
              <ScrollView
                horizontal={compact}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={[styles.lookRow, !compact && styles.lookGrid]}>
                {STYLES.map((look, index) => {
                  const selected = project.style === look;
                  return (
                    <Pressable
                      key={look}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      onPress={() => {
                        tap('light');
                        setStyle(look);
                      }}
                      style={[
                        styles.lookCard,
                        !compact && styles.lookCardWide,
                        selected && styles.lookCardSelected,
                      ]}>
                      <View style={[styles.lookArt, { backgroundColor: LOOK_COLORS[index][1] }]}>
                        {Array.from({ length: 8 }).map((_, stripe) => (
                          <View
                            key={stripe}
                            style={[
                              styles.stripe,
                              {
                                left: stripe * 30 - 42,
                                backgroundColor: LOOK_COLORS[index][0],
                              },
                            ]}
                          />
                        ))}
                      </View>
                      <Text style={[styles.lookLabel, selected && styles.lookLabelSelected]}>
                        {look}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            <View style={[styles.actions, compact && styles.actionsCompact]}>
              <View style={styles.startGroup}>
                <Button
                  label="Start"
                  size="lg"
                  inline={!compact}
                  disabled={!canStart || skipping}
                  onPress={() => router.push('/interview')}
                />
                {!compact ? <Text style={styles.actionHint}>4 questions, ~30 seconds</Text> : null}
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: !canStart || skipping, busy: skipping }}
                disabled={!canStart || skipping}
                onPress={() => void skipInterview()}
                style={({ pressed }) => [styles.skip, pressed && styles.pressed]}>
                {skipping ? (
                  <ActivityIndicator size="small" color={theme.textSecondary} />
                ) : (
                  <Text style={[styles.skipText, !canStart && styles.disabledText]}>
                    Skip questions, just make it
                  </Text>
                )}
              </Pressable>
            </View>
          </Container>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: theme.space.xl,
    paddingVertical: theme.space.xxxl,
  },
  scrollCompact: { justifyContent: 'flex-start', paddingVertical: theme.space.xl },
  container: { maxWidth: 720, gap: 26 },
  intro: { gap: theme.space.sm },
  title: {
    color: theme.text,
    fontFamily: theme.font.sans,
    fontSize: 40,
    fontWeight: '800',
    letterSpacing: -1.4,
    lineHeight: 43,
  },
  titleCompact: { fontSize: 34, lineHeight: 37 },
  subtitle: {
    maxWidth: 640,
    color: theme.textSecondary,
    fontFamily: theme.font.sans,
    fontSize: 15,
    lineHeight: 22,
  },
  promptCard: {
    backgroundColor: theme.bgElevated,
    borderColor: theme.borderStrong,
    borderWidth: 1,
    borderBottomColor: theme.accent,
    borderBottomWidth: 2,
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.space.lg,
    paddingTop: theme.space.md,
    paddingBottom: theme.space.md,
    gap: theme.space.md,
  },
  prompt: {
    minHeight: 62,
    padding: 0,
    color: theme.text,
    fontFamily: theme.font.sans,
    fontSize: 19,
    lineHeight: 28,
    ...Platform.select({ web: { outlineStyle: 'none' } as never, default: {} }),
  },
  promptCompact: { minHeight: 94, fontSize: 17, lineHeight: 25 },
  promptMeta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  mono: { color: theme.textTertiary, fontFamily: theme.font.mono, fontSize: 11 },
  shortcut: {
    marginLeft: 'auto',
    color: theme.textTertiary,
    fontFamily: theme.font.mono,
    fontSize: 11,
  },
  metaRule: { width: 1, height: 13, backgroundColor: theme.borderStrong },
  durationRow: { flexDirection: 'row', gap: 5 },
  duration: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.radius.pill,
    borderColor: theme.borderStrong,
    borderWidth: 1,
    ...Platform.select({ web: { cursor: 'pointer' }, default: {} }),
  },
  durationSelected: { borderColor: theme.text },
  durationText: { color: theme.textSecondary, fontFamily: theme.font.sans, fontSize: 12 },
  durationTextSelected: { color: theme.text, fontWeight: '600' },
  error: { color: theme.danger, fontFamily: theme.font.sans, fontSize: 13 },
  lookSection: { gap: theme.space.md },
  lookHeading: { flexDirection: 'row', alignItems: 'baseline', gap: 9 },
  eyebrow: {
    color: theme.textTertiary,
    fontFamily: theme.font.mono,
    fontSize: 10,
    letterSpacing: 1,
  },
  lookHint: { color: theme.textSecondary, fontFamily: theme.font.sans, fontSize: 13 },
  lookRow: { flexDirection: 'row', gap: theme.space.md, paddingVertical: 3 },
  lookGrid: { width: '100%' },
  lookCard: {
    width: 112,
    overflow: 'hidden',
    backgroundColor: theme.bgElevated,
    borderColor: theme.borderStrong,
    borderWidth: 1,
    borderRadius: theme.radius.sm,
    ...Platform.select({ web: { cursor: 'pointer' }, default: {} }),
  },
  lookCardWide: { flex: 1, width: undefined },
  lookCardSelected: {
    borderColor: theme.accent,
    borderWidth: 1.5,
    ...Platform.select({
      web: { boxShadow: `0 0 0 3px ${theme.accentSoft}` },
      default: { shadowColor: theme.accent, shadowOpacity: 0.16, shadowRadius: 8 },
    }),
  },
  lookArt: { height: 90, overflow: 'hidden' },
  stripe: {
    position: 'absolute',
    top: -35,
    width: 14,
    height: 175,
    transform: [{ rotate: '45deg' }],
  },
  lookLabel: {
    paddingHorizontal: 10,
    paddingVertical: 9,
    color: theme.textSecondary,
    fontFamily: theme.font.sans,
    fontSize: 12.5,
  },
  lookLabelSelected: { color: theme.text, fontWeight: '700' },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
  actionsCompact: { flexDirection: 'column', alignItems: 'stretch' },
  startGroup: { flexDirection: 'row', alignItems: 'center', gap: theme.space.lg },
  actionHint: { color: theme.textSecondary, fontFamily: theme.font.sans, fontSize: 13.5 },
  skip: {
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.space.sm,
    ...Platform.select({ web: { cursor: 'pointer' }, default: {} }),
  },
  skipText: {
    color: theme.textSecondary,
    fontFamily: theme.font.sans,
    fontSize: 13.5,
    textDecorationLine: 'underline',
  },
  pressed: { opacity: 0.6 },
  disabledText: { color: theme.textTertiary },
});

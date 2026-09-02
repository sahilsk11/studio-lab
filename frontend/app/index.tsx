import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import {
  AppHeader,
  Body,
  Button,
  Callout,
  Caption,
  Chip,
  Container,
  Display,
  Field,
  GlassCard,
  Micro,
  Screen,
  StepRail,
  TextField,
} from '@/components/ui';
import { theme } from '@/constants/theme';
import { useProject } from '@/context/ProjectContext';
import { useSettings } from '@/context/SettingsContext';
import { DURATIONS, STYLES } from '@/types/project';

const STYLE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  Cinematic: 'film-outline',
  Documentary: 'videocam-outline',
  Anime: 'color-wand-outline',
  Minimal: 'square-outline',
  Retro: 'radio-outline',
};

export default function IdeaScreen() {
  const router = useRouter();
  const {
    project,
    hydrated,
    testMode,
    error,
    setIdea,
    setStyle,
    setDuration,
    generateCast,
    generateAllCastImages,
    resetProject,
  } = useProject();
  const { settings, tap } = useSettings();
  const [loading, setLoading] = useState(false);

  if (!hydrated) {
    return (
      <Screen header={<AppHeader />}>
        <View style={styles.loading}>
          <ActivityIndicator color={theme.textSecondary} />
        </View>
      </Screen>
    );
  }

  const hasCast = (project.people?.length ?? 0) + (project.things?.length ?? 0) > 0;
  const ideaLength = project.idea.trim().length;
  const canCreate = ideaLength >= 12;

  async function handleCreate() {
    setLoading(true);
    try {
      await generateCast({ replace: true });
      tap('success');
      router.push('/cast');
      if (settings.autoGenerateImages) generateAllCastImages();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen
      header={<AppHeader />}
      footer={
        hasCast || testMode ? (
          <>
            <Button
              label={testMode ? 'Open demo cast' : 'Continue cast'}
              icon="arrow-forward"
              size="lg"
              onPress={() => router.push('/cast')}
            />
            {!testMode ? (
              <View style={styles.footerRow}>
                <Button
                  label="New cast"
                  variant="secondary"
                  icon="add"
                  disabled={!canCreate}
                  loading={loading}
                  onPress={handleCreate}
                  style={styles.flex}
                />
                <Button
                  label="Start over"
                  variant="ghost"
                  onPress={resetProject}
                  style={styles.flex}
                />
              </View>
            ) : null}
          </>
        ) : (
          <Button
            label="Create cast"
            icon="sparkles"
            size="lg"
            disabled={!canCreate}
            loading={loading}
            onPress={handleCreate}
          />
        )
      }>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled">
          <Container style={styles.stack}>
            <GlassCard radius={theme.radius.md} style={styles.railCard}>
              <View style={styles.railInner}>
                <StepRail current="Idea" />
              </View>
            </GlassCard>

            <View style={styles.hero}>
              <Display>Turn an idea{'\n'}into a reel.</Display>
              <Body style={styles.heroSub}>
                Describe what you want to see. We'll lock people and objects first, then
                places, then the keyframes that become your reel.
              </Body>
            </View>

            {hasCast ? (
              <Callout
                variant="info"
                title={`"${project.title || 'Your cast'}" is saved`}
                message={`${project.people.length} people · ${project.things.length} things · ${project.style} · ${project.durationSec}s`}
                action="Pick up where you left off"
                onAction={() => router.push('/cast')}
              />
            ) : null}

            {error ? (
              <Callout variant="error" title="Something went wrong" message={error} />
            ) : null}

            <GlassCard tone="raised" radius={theme.radius.lg}>
              <View style={styles.cardBody}>
                <Field
                  label="Your idea"
                  hint={ideaLength > 0 ? `${ideaLength} characters` : undefined}>
                  <TextField
                    multiline
                    minHeight={148}
                    value={project.idea}
                    onChangeText={setIdea}
                    placeholder="A barista discovers their latte art comes alive at midnight…"
                  />
                </Field>

                {!canCreate ? (
                  <Micro style={styles.hintWarn}>
                    Add a little more detail — at least 12 characters.
                  </Micro>
                ) : null}

                <View style={styles.divider} />

                <Field label="Style">
                  <View style={styles.chips}>
                    {STYLES.map((s) => (
                      <Chip
                        key={s}
                        label={s}
                        icon={STYLE_ICONS[s]}
                        selected={project.style === s}
                        onPress={() => setStyle(s)}
                      />
                    ))}
                  </View>
                </Field>

                <View style={styles.divider} />

                <Field label="Duration" hint="15, 30 or 60 seconds">
                  <View style={styles.chips}>
                    {DURATIONS.map((d) => (
                      <Chip
                        key={d}
                        label={`${d}s`}
                        selected={project.durationSec === d}
                        onPress={() => setDuration(d)}
                      />
                    ))}
                  </View>
                </Field>
              </View>
            </GlassCard>

            <View style={styles.pipeline}>
              <Ionicons name="information-circle-outline" size={14} color={theme.textQuaternary} />
              <Caption style={styles.pipelineText}>
                Cast is free to draft. You only pay when you render images.
              </Caption>
            </View>
          </Container>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    paddingHorizontal: theme.space.xl,
    paddingTop: theme.space.sm,
    paddingBottom: theme.space.xxl,
  },
  stack: {
    gap: theme.space.xl,
  },
  railCard: {
    alignSelf: 'stretch',
  },
  railInner: {
    paddingVertical: theme.space.md,
    paddingHorizontal: theme.space.sm,
  },
  hero: {
    gap: theme.space.md,
    paddingTop: theme.space.xs,
  },
  heroSub: {
    maxWidth: 460,
  },
  cardBody: {
    padding: theme.space.xl,
    gap: theme.space.lg,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.glass.border,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.space.sm,
  },
  hintWarn: {
    color: theme.textQuaternary,
  },
  pipeline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: theme.space.xs,
  },
  pipelineText: {
    color: theme.textQuaternary,
    fontSize: 12,
    flex: 1,
  },
  footerRow: {
    flexDirection: 'row',
    gap: theme.space.md,
  },
});

import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import {
  AppHeader,
  Button,
  Caption,
  CaptionStrong,
  Chip,
  Container,
  Mono,
  Row,
  Screen,
  Section,
  TextField,
  Toggle,
} from '@/components/ui';
import {
  ACCENT_IDS,
  ACCENTS,
  GLASS_LEVEL_IDS,
  GLASS_LEVELS,
  theme,
} from '@/constants/theme';
import { useProject } from '@/context/ProjectContext';
import { useSettings } from '@/context/SettingsContext';
import { checkHealth, DEFAULT_API_URL } from '@/lib/api';
import { confirm } from '@/lib/confirm';
import { DURATIONS, STYLES } from '@/types/project';

const BUDGET_OPTIONS = [0, 1, 5, 10, 25];

type HealthState =
  | { kind: 'idle' }
  | { kind: 'checking' }
  | { kind: 'ok'; hasKey: boolean }
  | { kind: 'error'; message: string };

export default function SettingsScreen() {
  const router = useRouter();
  const { settings, accent, set, resetSettings, tap } = useSettings();
  const { project, setTestMode, resetProject } = useProject();

  const [urlDraft, setUrlDraft] = useState(settings.apiUrl);
  const [health, setHealth] = useState<HealthState>({ kind: 'idle' });

  async function testConnection() {
    const url = urlDraft.trim() || DEFAULT_API_URL;
    set('apiUrl', url);
    setHealth({ kind: 'checking' });
    try {
      const res = await checkHealth(url);
      setHealth({ kind: 'ok', hasKey: !!res.hasKey });
      tap('success');
    } catch (err) {
      setHealth({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Could not reach the server',
      });
      tap('error');
    }
  }

  async function handleClearProject() {
    const ok = await confirm({
      title: 'Discard current project?',
      message: 'Your cast, scenes, frames and generated images will be removed from the server.',
      confirmLabel: 'Discard',
      destructive: true,
    });
    if (!ok) return;
    await resetProject();
    tap('warning');
  }

  async function handleResetSettings() {
    const ok = await confirm({
      title: 'Reset all settings?',
      message: 'Every preference returns to its default. Your project is not affected.',
      confirmLabel: 'Reset',
      destructive: true,
    });
    if (!ok) return;
    await resetSettings();
    setUrlDraft(DEFAULT_API_URL);
    setHealth({ kind: 'idle' });
    tap('warning');
  }

  const version = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <Screen
      header={<AppHeader title="Settings" onBack={() => router.back()} showSettings={false} />}
      footer={<Button label="Done" icon="checkmark" onPress={() => router.back()} />}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled">
        <Container style={styles.stack}>
          {/* ---------------------------------------------------------- */}
          <Section
            title="Appearance"
            footnote="Accent drives progress fills, focus rings and ambient lighting.">
            <Row label="Accent" description="Tint applied across the interface">
              <View style={styles.chipRow}>
                {ACCENT_IDS.map((id) => (
                  <AccentSwatch
                    key={id}
                    id={id}
                    selected={settings.accent === id}
                    onPress={() => set('accent', id)}
                  />
                ))}
              </View>
            </Row>

            <Row label="Material" description="How strongly panels frost the background">
              <View style={styles.chipRow}>
                {GLASS_LEVEL_IDS.map((id) => (
                  <Chip
                    key={id}
                    label={GLASS_LEVELS[id].label}
                    selected={settings.glassLevel === id}
                    onPress={() => set('glassLevel', id)}
                  />
                ))}
              </View>
            </Row>

            <Row
              icon="accessibility-outline"
              label="Reduce motion"
              description="Stops ambient drift, shimmer and spring animations"
              right={
                <Toggle
                  accessibilityLabel="Reduce motion"
                  value={settings.reduceMotion}
                  onValueChange={(v) => set('reduceMotion', v)}
                />
              }
            />

            <Row
              icon="pulse-outline"
              label="Haptics"
              description={
                Platform.OS === 'web' ? 'Unavailable on web' : 'Vibrate on taps and completions'
              }
              disabled={Platform.OS === 'web'}
              right={
                <Toggle
                  accessibilityLabel="Haptics"
                  disabled={Platform.OS === 'web'}
                  value={settings.haptics}
                  onValueChange={(v) => set('haptics', v)}
                />
              }
            />
          </Section>

          {/* ---------------------------------------------------------- */}
          <Section
            title="Generation"
            footnote="Defaults apply to new projects. The current project keeps its own settings.">
            <Row label="Default style">
              <View style={styles.chipRow}>
                {STYLES.map((s) => (
                  <Chip
                    key={s}
                    label={s}
                    selected={settings.defaultStyle === s}
                    onPress={() => set('defaultStyle', s)}
                  />
                ))}
              </View>
            </Row>

            <Row label="Default duration">
              <View style={styles.chipRow}>
                {DURATIONS.map((d) => (
                  <Chip
                    key={d}
                    label={`${d}s`}
                    selected={settings.defaultDuration === d}
                    onPress={() => set('defaultDuration', d)}
                  />
                ))}
              </View>
            </Row>

            <Row
              icon="flash-outline"
              label="Auto-generate images"
              description="Start rendering sheets as soon as a cast is created"
              right={
                <Toggle
                  accessibilityLabel="Auto-generate images"
                  value={settings.autoGenerateImages}
                  onValueChange={(v) => set('autoGenerateImages', v)}
                />
              }
            />
          </Section>

          {/* ---------------------------------------------------------- */}
          <Section
            title="Budget"
            footnote={`Spent on this project so far: $${project.totalCost.toFixed(2)}.`}>
            <Row
              icon="cash-outline"
              label="Show cost estimates"
              description="Display per-image and running project cost"
              right={
                <Toggle
                  accessibilityLabel="Show cost estimates"
                  value={settings.showCosts}
                  onValueChange={(v) => set('showCosts', v)}
                />
              }
            />

            <Row
              label="Spend cap"
              description="Batch generation stops once the project reaches this total">
              <View style={styles.chipRow}>
                {BUDGET_OPTIONS.map((amount) => (
                  <Chip
                    key={amount}
                    label={amount === 0 ? 'Off' : `$${amount}`}
                    selected={settings.budgetCap === amount}
                    onPress={() => set('budgetCap', amount)}
                  />
                ))}
              </View>
            </Row>
          </Section>

          {/* ---------------------------------------------------------- */}
          <Section title="Connection" footnote="Point the app at your Studio Lab API.">
            <Row label="API endpoint">
              <View style={styles.stackSm}>
                <TextField
                  value={urlDraft}
                  onChangeText={setUrlDraft}
                  onBlur={() => set('apiUrl', urlDraft.trim() || DEFAULT_API_URL)}
                  placeholder={DEFAULT_API_URL}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  returnKeyType="done"
                  onSubmitEditing={testConnection}
                />

                <View style={styles.connectionRow}>
                  <Button
                    label={health.kind === 'checking' ? 'Checking…' : 'Test connection'}
                    variant="secondary"
                    size="sm"
                    icon="pulse"
                    inline
                    loading={health.kind === 'checking'}
                    onPress={testConnection}
                  />
                  <HealthPill state={health} />
                </View>
              </View>
            </Row>
          </Section>

          {/* ---------------------------------------------------------- */}
          <Section
            title="Developer"
            footnote="Demo mode swaps in bundled placeholder assets so you can explore every screen without spending credits.">
            <Row
              icon="flask-outline"
              iconColor={theme.warning}
              label="Demo mode"
              description="Use sample assets, skip all API calls"
              right={
                <Toggle
                  accessibilityLabel="Demo mode"
                  value={settings.testMode}
                  onValueChange={setTestMode}
                />
              }
            />
          </Section>

          {/* ---------------------------------------------------------- */}
          <Section title="Data">
            <Row
              icon="trash-outline"
              label="Discard project"
              description={
                (project.people?.length ?? 0) +
                  (project.things?.length ?? 0) +
                  (project.scenes?.length ?? 0) +
                  (project.frames?.length ?? 0) >
                0
                  ? 'Cast, scenes and frames stored on this device'
                  : 'Nothing stored yet'
              }
              destructive
              onPress={handleClearProject}
            />
            <Row
              icon="refresh-outline"
              label="Reset settings"
              description="Restore every preference to its default"
              destructive
              onPress={handleResetSettings}
            />
          </Section>

          {/* ---------------------------------------------------------- */}
          <Section title="About">
            <Row
              icon="film-outline"
              label="Studio Lab"
              description="AI vertical video studio"
              right={<Mono>v{version}</Mono>}
            />
            <Row
              icon="sparkles-outline"
              label="Text model"
              right={<Mono>gemini-2.5-flash</Mono>}
            />
            <Row
              icon="image-outline"
              label="Image model"
              right={<Mono>seedream-4.5</Mono>}
            />
          </Section>

          <Caption style={styles.credit}>
            Studio Lab · {accent.label} · {GLASS_LEVELS[settings.glassLevel].label} material
          </Caption>
        </Container>
      </ScrollView>
    </Screen>
  );
}

function AccentSwatch({
  id,
  selected,
  onPress,
}: {
  id: keyof typeof ACCENTS;
  selected: boolean;
  onPress: () => void;
}) {
  const a = ACCENTS[id];
  const { tap } = useSettings();

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={a.label}
      onPress={() => {
        tap('light');
        onPress();
      }}
      style={styles.swatchWrap}>
      <View
        style={[
          styles.swatchRing,
          { borderColor: selected ? a.tint : 'transparent' },
        ]}>
        <View style={styles.swatch}>
          <LinearGradient
            colors={a.ramp}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          {selected ? (
            <Ionicons name="checkmark" size={15} color={theme.textOnMetal} />
          ) : null}
        </View>
      </View>
      <Caption style={[styles.swatchLabel, selected && { color: theme.text }]}>
        {a.label}
      </Caption>
    </Pressable>
  );
}

function HealthPill({ state }: { state: HealthState }) {
  if (state.kind === 'idle') return null;

  if (state.kind === 'checking') {
    return <Caption style={styles.health}>Contacting server…</Caption>;
  }

  if (state.kind === 'error') {
    return (
      <View style={styles.healthRow}>
        <Ionicons name="close-circle" size={14} color={theme.danger} />
        <Caption style={[styles.health, { color: theme.danger }]} numberOfLines={2}>
          {state.message}
        </Caption>
      </View>
    );
  }

  const good = state.hasKey;
  return (
    <View style={styles.healthRow}>
      <Ionicons
        name={good ? 'checkmark-circle' : 'alert-circle'}
        size={14}
        color={good ? theme.success : theme.warning}
      />
      <CaptionStrong
        style={[styles.health, { color: good ? theme.success : theme.warning }]}>
        {good ? 'Connected' : 'Connected · no API key set'}
      </CaptionStrong>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: theme.space.xl,
    paddingTop: theme.space.sm,
    paddingBottom: theme.space.xxxl,
  },
  stack: {
    gap: theme.space.xl,
  },
  stackSm: {
    gap: theme.space.md,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.space.sm,
  },
  connectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.md,
    flexWrap: 'wrap',
  },
  health: {
    fontSize: 12,
    flexShrink: 1,
  },
  healthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexShrink: 1,
  },
  swatchWrap: {
    alignItems: 'center',
    gap: 6,
    width: 62,
  },
  swatchRing: {
    padding: 3,
    borderRadius: theme.radius.pill,
    borderWidth: 1.5,
  },
  swatch: {
    width: 34,
    height: 34,
    borderRadius: 17,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchLabel: {
    fontSize: 11,
    color: theme.textTertiary,
  },
  credit: {
    textAlign: 'center',
    color: theme.textQuaternary,
    fontSize: 11.5,
    marginTop: theme.space.sm,
  },
});

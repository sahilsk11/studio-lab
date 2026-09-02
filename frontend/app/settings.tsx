import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import {
  AppHeader,
  Button,
  Caption,
  CaptionStrong,
  Chip,
  Container,
  Row,
  Screen,
  Section,
  TextField,
  Toggle,
} from '@/components/ui';
import { theme } from '@/constants/theme';
import { useProject } from '@/context/ProjectContext';
import { useSettings } from '@/context/SettingsContext';
import { checkHealth, DEFAULT_API_URL } from '@/lib/api';
import { DURATIONS, STYLES } from '@/types/project';

const BUDGET_OPTIONS = [0, 1, 5, 10, 25];

type HealthState =
  | { kind: 'idle' }
  | { kind: 'checking' }
  | { kind: 'ok'; hasKey: boolean }
  | { kind: 'error'; message: string };

export default function SettingsScreen() {
  const router = useRouter();
  const { settings, set, tap } = useSettings();
  const { project, setTestMode } = useProject();
  const [urlDraft, setUrlDraft] = useState(settings.apiUrl);
  const [health, setHealth] = useState<HealthState>({ kind: 'idle' });

  async function testConnection() {
    const url = urlDraft.trim() || DEFAULT_API_URL;
    set('apiUrl', url);
    setHealth({ kind: 'checking' });

    try {
      const response = await checkHealth(url);
      setHealth({ kind: 'ok', hasKey: !!response.hasKey });
      tap('success');
    } catch (error) {
      setHealth({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Could not reach the server',
      });
      tap('error');
    }
  }

  return (
    <Screen
      header={<AppHeader title="Settings" onBack={() => router.back()} showSettings={false} />}
      footer={<Button label="Done" icon="checkmark" onPress={() => router.back()} />}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scroll}>
        <Container style={styles.stack}>
          <View style={styles.intro}>
            <CaptionStrong style={styles.kicker}>REEL SETUP</CaptionStrong>
            <Caption style={styles.introCopy}>
              Keep the defaults you use every time. Everything else stays close to the work.
            </Caption>
          </View>

          <Section
            title="Generation"
            footnote="These choices are used when you start a new reel.">
            <Row label="Default look">
              <View style={styles.chipRow}>
                {STYLES.map((style) => (
                  <Chip
                    key={style}
                    label={style}
                    selected={settings.defaultStyle === style}
                    onPress={() => set('defaultStyle', style)}
                  />
                ))}
              </View>
            </Row>

            <Row label="Default length">
              <View style={styles.chipRow}>
                {DURATIONS.map((duration) => (
                  <Chip
                    key={duration}
                    label={`${duration}s`}
                    selected={settings.defaultDuration === duration}
                    onPress={() => set('defaultDuration', duration)}
                  />
                ))}
              </View>
            </Row>

            <Row
              icon="flash-outline"
              label="Start images automatically"
              description="Render the next visual set as soon as its plan is ready"
              right={
                <Toggle
                  accessibilityLabel="Start images automatically"
                  value={settings.autoGenerateImages}
                  onValueChange={(value) => set('autoGenerateImages', value)}
                />
              }
            />
          </Section>

          <Section
            title="Budget"
            footnote={`This reel has used $${project.totalCost.toFixed(2)} so far.`}>
            <Row
              icon="receipt-outline"
              label="Show estimates"
              description="Show generation cost before and after a render"
              right={
                <Toggle
                  accessibilityLabel="Show cost estimates"
                  value={settings.showCosts}
                  onValueChange={(value) => set('showCosts', value)}
                />
              }
            />

            <Row label="Spend cap" description="Pause batch generation at this project total">
              <View style={styles.chipRow}>
                {BUDGET_OPTIONS.map((amount) => (
                  <Chip
                    key={amount}
                    label={amount === 0 ? 'No cap' : `$${amount}`}
                    selected={settings.budgetCap === amount}
                    onPress={() => set('budgetCap', amount)}
                  />
                ))}
              </View>
            </Row>
          </Section>

          <Section title="Connection" footnote="The API address is saved on this device.">
            <Row label="Studio API">
              <View style={styles.inputStack}>
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
                    inline
                    loading={health.kind === 'checking'}
                    onPress={testConnection}
                  />
                  <HealthStatus state={health} />
                </View>
              </View>
            </Row>
          </Section>

          <Section
            title="Demo"
            footnote="Demo mode uses included sample assets and never sends a paid generation request.">
            <Row
              icon="flask-outline"
              iconColor={theme.warning}
              label="Demo mode"
              description="Explore the full flow without spending credits"
              right={
                <Toggle
                  accessibilityLabel="Demo mode"
                  value={settings.testMode}
                  onValueChange={setTestMode}
                />
              }
            />
          </Section>
        </Container>
      </ScrollView>
    </Screen>
  );
}

function HealthStatus({ state }: { state: HealthState }) {
  if (state.kind === 'idle') return null;
  if (state.kind === 'checking') return <Caption>Contacting server…</Caption>;

  if (state.kind === 'error') {
    return (
      <View style={styles.healthRow}>
        <Ionicons name="close-circle" size={14} color={theme.danger} />
        <Caption style={styles.healthError} numberOfLines={2}>
          {state.message}
        </Caption>
      </View>
    );
  }

  return (
    <View style={styles.healthRow}>
      <Ionicons
        name={state.hasKey ? 'checkmark-circle' : 'alert-circle'}
        size={14}
        color={state.hasKey ? theme.success : theme.warning}
      />
      <CaptionStrong style={{ color: state.hasKey ? theme.success : theme.warning }}>
        {state.hasKey ? 'Connected' : 'Connected · API key missing'}
      </CaptionStrong>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: theme.space.xl,
    paddingTop: theme.space.xl,
    paddingBottom: theme.space.xxxl,
  },
  stack: {
    maxWidth: 760,
    gap: theme.space.xl,
  },
  intro: {
    gap: 6,
    paddingHorizontal: theme.space.xs,
  },
  kicker: {
    fontFamily: theme.font.mono,
    fontSize: 10,
    letterSpacing: 1.1,
    color: theme.accentDark,
  },
  introCopy: {
    maxWidth: 500,
    color: theme.textSecondary,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.space.sm,
  },
  inputStack: { gap: theme.space.md },
  connectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: theme.space.md,
  },
  healthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexShrink: 1,
  },
  healthError: {
    color: theme.danger,
    flexShrink: 1,
  },
});

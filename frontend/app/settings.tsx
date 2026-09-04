import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import {
  Caption,
  Chip,
  Container,
  Row,
  Screen,
  Toggle,
} from '@/components/ui';
import { theme } from '@/constants/theme';
import { useProject } from '@/context/ProjectContext';
import { useSettings } from '@/context/SettingsContext';
import { furthestStepIndex } from '@/lib/project';
import { STEPS } from '@/types/project';

const BUDGET_OPTIONS = [0, 1, 5, 10, 25];

export default function SettingsScreen() {
  const router = useRouter();
  const { settings, set, tap } = useSettings();
  const { project, setTestMode } = useProject();
  const sidebarStep = STEPS[furthestStepIndex(project)];

  function save() {
    tap('success');
    router.back();
  }

  return (
    <Screen
      currentStep={sidebarStep}
      title="Settings"
      subtitle="Demo mode never sends a paid generation request. Other changes save automatically."
      previous={{ label: 'Back', onPress: () => router.back() }}
      next={{ label: 'Save', onPress: save }}>
      <Container style={styles.stack}>
        <View style={styles.panel}>
          <Row
            icon="flask-outline"
            iconColor={theme.warning}
            label="Demo mode"
            description="Explore the full flow with bundled sample assets"
            right={
              <Toggle
                accessibilityLabel="Demo mode"
                value={settings.testMode}
                onValueChange={setTestMode}
              />
            }
          />

          <View style={styles.rule} />

          <Row
            icon="receipt-outline"
            label="Show estimates"
            description="Display generation cost on render screens"
            right={
              <Toggle
                accessibilityLabel="Show cost estimates"
                value={settings.showCosts}
                onValueChange={(value) => set('showCosts', value)}
              />
            }
          />

          <View style={styles.rule} />

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
        </View>

        <Caption style={styles.hint}>Changes apply immediately. Save just returns you to the project.</Caption>
      </Container>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: {
    maxWidth: 640,
    gap: theme.space.lg,
  },
  panel: {
    backgroundColor: theme.bgElevated,
    borderColor: theme.border,
    borderWidth: 1,
    borderRadius: theme.radius.md,
    overflow: 'hidden',
  },
  rule: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.border,
    marginHorizontal: theme.space.lg,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.space.sm,
  },
  hint: {
    color: theme.textTertiary,
    paddingHorizontal: theme.space.xs,
  },
});

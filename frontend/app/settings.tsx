import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  Button,
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
    <Screen currentStep={sidebarStep}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scroll}>
        <Container style={styles.stack}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>Settings</Text>
            <Button label="Save" size="sm" inline onPress={save} />
          </View>

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

          <Caption style={styles.hint}>
            Demo mode never sends a paid generation request. Other changes save automatically.
          </Caption>
        </Container>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: theme.space.xl,
    paddingTop: theme.space.lg,
    paddingBottom: theme.space.xxxl,
  },
  stack: {
    maxWidth: 640,
    gap: theme.space.lg,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.space.md,
  },
  title: {
    flex: 1,
    color: theme.text,
    fontFamily: theme.font.sans,
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.9,
    lineHeight: 36,
  },
  panel: {
    backgroundColor: theme.surface,
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

import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import {
  AppHeader,
  Body,
  Button,
  Callout,
  CaptionStrong,
  Container,
  CONTENT_MAX_WIDTH,
  Eyebrow,
  GlassCard,
  Mono,
  ProgressCard,
  Screen,
  SheetFrame,
  StatusBadge,
  StepRail,
  Title,
} from '@/components/ui';
import { ItemEditor, type EditorTarget } from '@/components/ItemEditor';
import { theme } from '@/constants/theme';
import { useProject } from '@/context/ProjectContext';
import { useSettings } from '@/context/SettingsContext';
import { confirm } from '@/lib/confirm';
import { castItems, imageProgress, needsImage } from '@/lib/project';
import type { Person, Thing } from '@/types/project';

const H_PAD = theme.space.xl;
const GAP = theme.space.md;
const PERSON_VIEWS = ['Torso', 'Back', 'Face'] as const;

export default function CastScreen() {
  const router = useRouter();
  const { width: windowWidth } = useWindowDimensions();
  const {
    project,
    hydrated,
    testMode,
    error,
    generatePersonImage,
    generateThingImage,
    generateAllCastImages,
    generateScenes,
    generateAllSceneImages,
    generateCast,
    generateImage,
    updateItem,
    removeItem,
  } = useProject();
  const { settings, tap } = useSettings();
  const [advancing, setAdvancing] = useState(false);
  const [redoing, setRedoing] = useState(false);
  const [editing, setEditing] = useState<EditorTarget | null>(null);

  const contentWidth = Math.min(windowWidth, CONTENT_MAX_WIDTH);
  const columns = contentWidth >= 620 ? 2 : 1;
  const cardWidth = (contentWidth - H_PAD * 2 - GAP * (columns - 1)) / columns;

  const empty = project.people.length === 0 && project.things.length === 0;
  const progress = imageProgress(castItems(project));
  const needsWork = progress.pending + progress.stale + progress.errors;
  const allReady = progress.total > 0 && needsWork === 0 && progress.generating === 0;
  const showRender = needsWork > 0;

  useEffect(() => {
    if (!hydrated) return;
    if (empty && !testMode) router.replace('/');
  }, [hydrated, empty, testMode, router]);

  function handleGenerateAll() {
    void generateAllCastImages();
  }

  async function handleRedo() {
    const ok = await confirm({
      title: 'Redo people and things?',
      message:
        'The model will draft a new cast from your idea. Scenes, frames, and video are cleared.',
      confirmLabel: 'Redo cast',
      destructive: true,
    });
    if (!ok) return;
    setRedoing(true);
    try {
      await generateCast({ replace: true });
      tap('success');
    } finally {
      setRedoing(false);
    }
  }

  async function handleNext() {
    setAdvancing(true);
    try {
      await generateScenes({ replace: true });
      tap('success');
      router.push('/scenes');
      if (settings.autoGenerateImages) generateAllSceneImages();
    } finally {
      setAdvancing(false);
    }
  }

  if (!hydrated || (empty && !testMode)) {
    return (
      <Screen header={<AppHeader title="Cast" onBack={() => router.push('/')} />}>
        <View style={styles.loading}>
          <ActivityIndicator color={theme.textSecondary} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      header={<AppHeader title="Cast" onBack={() => router.push('/')} />}
      footer={
        <>
          {showRender ? (
            <Button
              label={`Render ${needsWork} sheet${needsWork === 1 ? '' : 's'}`}
              icon="sparkles"
              size="lg"
              onPress={handleGenerateAll}
            />
          ) : (
            <Button
              label="Next: scenes"
              icon="arrow-forward"
              size="lg"
              disabled={!allReady || advancing}
              loading={advancing}
              onPress={handleNext}
            />
          )}
        </>
      }>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <Container style={styles.stack}>
          <GlassCard radius={theme.radius.md}>
            <View style={styles.railInner}>
              <StepRail current="Cast" />
            </View>
          </GlassCard>

          <View style={styles.heading}>
            <View style={styles.headingTop}>
              <Title numberOfLines={2} style={styles.headingTitle}>
                {project.title || 'Cast'}
              </Title>
              <Button
                label="Redo"
                variant="ghost"
                size="sm"
                inline
                icon="refresh-outline"
                loading={redoing}
                disabled={redoing || advancing}
                onPress={() => void handleRedo()}
              />
            </View>
            <View style={styles.metaRow}>
              {project.people.length > 0 ? (
                <MetaPill icon="people-outline" label={`${project.people.length} people`} />
              ) : null}
              {project.things.length > 0 ? (
                <MetaPill icon="cube-outline" label={`${project.things.length} things`} />
              ) : null}
              <MetaPill icon="color-palette-outline" label={project.style} />
              <MetaPill icon="time-outline" label={`${project.durationSec}s`} />
              {settings.showCosts && project.totalCost > 0 ? (
                <MetaPill icon="cash-outline" label={`$${project.totalCost.toFixed(2)}`} />
              ) : null}
            </View>
          </View>

          <ProgressCard
            label="Sheets ready"
            value={progress.done}
            total={progress.total}
            detail={
              progress.generating > 0
                ? `Rendering ${progress.generating} sheet${progress.generating === 1 ? '' : 's'}…`
                : progress.stale > 0
                  ? `${progress.stale} need re-rendering after your edits`
                  : progress.errors > 0
                    ? `${progress.errors} failed — tap a card to retry`
                    : 'Tap any sheet to render it'
            }
          />

          {error ? <Callout variant="error" title="Generation stopped" message={error} /> : null}

          {project.people.length > 0 ? (
            <View style={styles.section}>
              <View style={styles.sectionHead}>
                <Eyebrow>People</Eyebrow>
                <Mono color={theme.textQuaternary}>{project.people.length}</Mono>
              </View>
              <View style={[styles.grid, { gap: GAP }]}>
                {project.people.map((person, i) => (
                  <PersonCard
                    key={person.id}
                    person={person}
                    index={i}
                    width={cardWidth}
                    showCost={settings.showCosts}
                    onGenerate={() => generatePersonImage(person.id)}
                    onEdit={() => setEditing({ kind: 'person', item: person })}
                  />
                ))}
              </View>
            </View>
          ) : null}

          {project.things.length > 0 ? (
            <View style={styles.section}>
              <View style={styles.sectionHead}>
                <Eyebrow>Things</Eyebrow>
                <Mono color={theme.textQuaternary}>{project.things.length}</Mono>
              </View>
              <View style={[styles.grid, { gap: GAP }]}>
                {project.things.map((thing, i) => (
                  <ThingCard
                    key={thing.id}
                    thing={thing}
                    index={i}
                    width={cardWidth}
                    showCost={settings.showCosts}
                    onGenerate={() => generateThingImage(thing.id)}
                    onEdit={() => setEditing({ kind: 'thing', item: thing })}
                  />
                ))}
              </View>
            </View>
          ) : null}
        </Container>
      </ScrollView>
      <ItemEditor
        target={editing}
        onClose={() => setEditing(null)}
        onSave={updateItem}
        onDelete={removeItem}
        onRender={generateImage}
      />
    </Screen>
  );
}

function MetaPill({
  icon,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}) {
  return (
    <View style={styles.metaPill}>
      <Ionicons name={icon} size={12} color={theme.textTertiary} />
      <Text style={styles.metaText}>{label}</Text>
    </View>
  );
}

function SheetCardChrome({
  index,
  title,
  subtitle,
  status,
  stale,
  uri,
  width,
  emptyLabel,
  accessibilityLabel,
  canGenerate,
  onGenerate,
  viewLabels,
  look,
  error,
  showCost,
  cost,
  onEdit,
}: {
  index: number;
  title: string;
  subtitle?: string;
  status: Person['imageStatus'];
  stale?: boolean;
  uri?: string;
  width: number;
  emptyLabel: string;
  accessibilityLabel: string;
  canGenerate: boolean;
  onGenerate: () => void;
  viewLabels: readonly string[];
  look: string;
  error?: string;
  showCost: boolean;
  cost?: number;
  onEdit: () => void;
}) {
  const { accent } = useSettings();
  const sheetWidth = Math.min(width - 40, 420);

  return (
    <GlassCard
      tone="raised"
      radius={theme.radius.lg}
      style={{ width }}
      glowColor={status === 'generating' ? accent.glow : undefined}>
      <View style={styles.cardHeader}>
        <View style={styles.sceneNum}>
          <LinearGradient
            colors={theme.metal.chrome}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <Text style={styles.sceneNumText}>{index + 1}</Text>
        </View>

        <View style={styles.cardTitleBlock}>
          <CaptionStrong numberOfLines={1}>{title}</CaptionStrong>
          {subtitle ? <Mono numberOfLines={1}>{subtitle}</Mono> : null}
        </View>

        <StatusBadge status={status} stale={stale} />
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={
          status === 'generating' ? undefined : canGenerate ? onGenerate : onEdit
        }
        style={styles.imageWrap}>
        <SheetFrame
          uri={uri}
          width={sheetWidth}
          status={status}
          emptyLabel={emptyLabel}
        />

        <View style={[styles.viewRow, { width: sheetWidth }]}>
          {viewLabels.map((label) => (
            <Text key={label} style={styles.viewLabel} numberOfLines={1}>
              {label}
            </Text>
          ))}
        </View>

        {stale && uri ? (
          <View style={styles.staleOverlay} pointerEvents="none">
            <View style={styles.stalePill}>
              <Ionicons name="alert-circle" size={11} color={theme.warning} />
              <Text style={styles.stalePillText}>Outdated</Text>
            </View>
          </View>
        ) : null}
      </Pressable>

      {error ? (
        <View style={styles.errorRow}>
          <Ionicons name="warning-outline" size={12} color={theme.danger} />
          <Text style={styles.errorText} numberOfLines={2}>
            {error}
          </Text>
        </View>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Edit ${title}`}
        onPress={onEdit}
        style={styles.descBlock}>
        <Body style={styles.descText} numberOfLines={4}>
          {look}
        </Body>
      </Pressable>

      <View style={styles.cardFooter}>
        {showCost ? (
          <Mono>{cost != null ? `$${cost.toFixed(2)}` : '~$0.04'}</Mono>
        ) : (
          <View />
        )}

        <View style={styles.cardActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Edit ${title}`}
            onPress={onEdit}
            style={styles.regenLink}>
            <Ionicons name="create-outline" size={13} color={theme.text} />
            <Text style={styles.regenText}>Edit</Text>
          </Pressable>
          {status !== 'generating' ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={uri ? `Re-render ${title}` : `Render ${title}`}
              onPress={onGenerate}
              style={styles.regenLink}>
              <Ionicons name={uri ? 'refresh' : 'sparkles'} size={13} color={theme.text} />
              <Text style={styles.regenText}>{uri ? 'Re-render' : 'Render'}</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </GlassCard>
  );
}

function PersonCard({
  person,
  index,
  width,
  showCost,
  onGenerate,
  onEdit,
}: {
  person: Person;
  index: number;
  width: number;
  showCost: boolean;
  onGenerate: () => void;
  onEdit: () => void;
}) {
  const canGenerate = needsImage(person) && person.imageStatus !== 'generating';

  return (
    <SheetCardChrome
      index={index}
      title={person.name}
      subtitle={person.role}
      status={person.imageStatus}
      stale={person.imageStale}
      uri={person.imageUri}
      width={width}
      emptyLabel="Tap to render"
      accessibilityLabel={
        canGenerate ? `Render sheet for ${person.name}` : `Edit ${person.name}`
      }
      canGenerate={canGenerate}
      onGenerate={onGenerate}
      onEdit={onEdit}
      viewLabels={PERSON_VIEWS}
      look={person.look}
      error={person.imageError}
      showCost={showCost}
      cost={person.imageCost}
    />
  );
}

function ThingCard({
  thing,
  index,
  width,
  showCost,
  onGenerate,
  onEdit,
}: {
  thing: Thing;
  index: number;
  width: number;
  showCost: boolean;
  onGenerate: () => void;
  onEdit: () => void;
}) {
  const canGenerate = needsImage(thing) && thing.imageStatus !== 'generating';

  return (
    <SheetCardChrome
      index={index}
      title={thing.name}
      status={thing.imageStatus}
      stale={thing.imageStale}
      uri={thing.imageUri}
      width={width}
      emptyLabel="Tap to render"
      accessibilityLabel={
        canGenerate ? `Render sheet for ${thing.name}` : `Edit ${thing.name}`
      }
      canGenerate={canGenerate}
      onGenerate={onGenerate}
      onEdit={onEdit}
      viewLabels={[thing.views[0].label, thing.views[1].label]}
      look={thing.look}
      error={thing.imageError}
      showCost={showCost}
      cost={thing.imageCost}
    />
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    paddingHorizontal: H_PAD,
    paddingTop: theme.space.sm,
    paddingBottom: theme.space.xxl,
  },
  stack: {
    gap: theme.space.lg,
  },
  railInner: {
    paddingVertical: theme.space.md,
    paddingHorizontal: theme.space.sm,
  },
  heading: {
    gap: theme.space.md,
  },
  headingTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.md,
  },
  headingTitle: {
    flex: 1,
    minWidth: 0,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.space.sm,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    height: 26,
    borderRadius: theme.radius.pill,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.glass.border,
  },
  metaText: {
    fontFamily: theme.font.sans,
    fontSize: 11.5,
    fontWeight: '500',
    color: theme.textSecondary,
  },
  section: {
    gap: theme.space.md,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.space.xs,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.md,
    paddingHorizontal: theme.space.lg,
    paddingTop: theme.space.lg,
    paddingBottom: theme.space.md,
  },
  sceneNum: {
    width: 24,
    height: 24,
    borderRadius: 8,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sceneNumText: {
    fontFamily: theme.font.mono,
    fontSize: 12,
    fontWeight: '700',
    color: theme.textOnMetal,
  },
  cardTitleBlock: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  imageWrap: {
    alignItems: 'center',
    paddingHorizontal: theme.space.lg,
    paddingBottom: theme.space.md,
    gap: theme.space.sm,
    ...Platform.select({ web: { cursor: 'pointer' }, default: {} }),
  },
  viewRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewLabel: {
    flex: 1,
    textAlign: 'center',
    fontFamily: theme.font.sans,
    fontSize: 10.5,
    fontWeight: '600',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: theme.textQuaternary,
  },
  staleOverlay: {
    position: 'absolute',
    top: 8,
    right: theme.space.lg + 8,
  },
  stalePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    height: 22,
    borderRadius: theme.radius.pill,
    backgroundColor: 'rgba(20,16,4,0.82)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(251,191,36,0.45)',
  },
  stalePillText: {
    fontFamily: theme.font.sans,
    fontSize: 10,
    fontWeight: '700',
    color: theme.warning,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 5,
    paddingHorizontal: theme.space.lg,
    paddingBottom: theme.space.md,
  },
  errorText: {
    flex: 1,
    fontFamily: theme.font.sans,
    fontSize: 11,
    fontWeight: '500',
    color: theme.danger,
  },
  descBlock: {
    paddingHorizontal: theme.space.lg,
    paddingTop: theme.space.md,
    paddingBottom: theme.space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.glass.border,
  },
  descText: {
    fontSize: 13.5,
    lineHeight: 19.5,
    color: theme.textSecondary,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
    paddingHorizontal: theme.space.lg,
    paddingVertical: theme.space.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.glass.border,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.lg,
  },
  regenLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    ...Platform.select({ web: { cursor: 'pointer' }, default: {} }),
  },
  regenText: {
    fontFamily: theme.font.sans,
    fontSize: 12.5,
    fontWeight: '700',
    color: theme.text,
  },
});

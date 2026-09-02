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
  GlassCard,
  Mono,
  ProgressCard,
  Screen,
  StatusBadge,
  StepRail,
  Title,
  VerticalFrame,
} from '@/components/ui';
import { ItemEditor, type EditorTarget } from '@/components/ItemEditor';
import { theme } from '@/constants/theme';
import { useProject } from '@/context/ProjectContext';
import { useSettings } from '@/context/SettingsContext';
import { confirm } from '@/lib/confirm';
import { imageProgress, needsImage } from '@/lib/project';
import type { Project, Scene } from '@/types/project';

const H_PAD = theme.space.xl;
const GAP = theme.space.md;

export default function ScenesScreen() {
  const router = useRouter();
  const { width: windowWidth } = useWindowDimensions();
  const {
    project,
    hydrated,
    testMode,
    error,
    generateSceneImage,
    generateAllSceneImages,
    generateScenes,
    generateFrames,
    generateAllFrameImages,
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

  const progress = imageProgress(project.scenes);
  const needsWork = progress.pending + progress.stale + progress.errors;
  const allReady = progress.total > 0 && needsWork === 0 && progress.generating === 0;
  const showRender = needsWork > 0;

  useEffect(() => {
    if (!hydrated) return;
    if (project.scenes.length === 0 && !testMode) router.replace('/cast');
  }, [hydrated, project.scenes.length, testMode, router]);

  function handleGenerateAll() {
    void generateAllSceneImages();
  }

  async function handleRedo() {
    const ok = await confirm({
      title: 'Redo places?',
      message: 'The model will draft new locations from the locked cast. Keyframes and video are cleared.',
      confirmLabel: 'Redo scenes',
      destructive: true,
    });
    if (!ok) return;
    setRedoing(true);
    try {
      await generateScenes({ replace: true });
      tap('success');
    } finally {
      setRedoing(false);
    }
  }

  async function handleNext() {
    setAdvancing(true);
    try {
      await generateFrames();
      tap('success');
      router.push('/frames');
      if (settings.autoGenerateImages) generateAllFrameImages();
    } finally {
      setAdvancing(false);
    }
  }

  if (!hydrated || (project.scenes.length === 0 && !testMode)) {
    return (
      <Screen header={<AppHeader title="Scenes" onBack={() => router.push('/cast')} />}>
        <View style={styles.loading}>
          <ActivityIndicator color={theme.textSecondary} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      header={<AppHeader title="Scenes" onBack={() => router.push('/cast')} />}
      footer={
        <>
          {showRender ? (
            <Button
              label={`Render ${needsWork} image${needsWork === 1 ? '' : 's'}`}
              icon="sparkles"
              size="lg"
              onPress={handleGenerateAll}
            />
          ) : (
            <Button
              label="Next: frames"
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
              <StepRail current="Scenes" />
            </View>
          </GlassCard>

          <View style={styles.heading}>
            <View style={styles.headingTop}>
              <Title numberOfLines={2} style={styles.headingTitle}>
                {project.title || 'Scenes'}
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
              <MetaPill icon="images-outline" label={`${project.scenes.length} scenes`} />
              <MetaPill icon="color-palette-outline" label={project.style} />
              <MetaPill icon="time-outline" label={`${project.durationSec}s`} />
              {settings.showCosts && project.totalCost > 0 ? (
                <MetaPill icon="cash-outline" label={`$${project.totalCost.toFixed(2)}`} />
              ) : null}
            </View>
          </View>

          <ProgressCard
            label="Stills ready"
            value={progress.done}
            total={progress.total}
            detail={
              progress.generating > 0
                ? `Rendering ${progress.generating} scene${progress.generating === 1 ? '' : 's'}…`
                : progress.stale > 0
                  ? `${progress.stale} need re-rendering after your edits`
                  : progress.errors > 0
                    ? `${progress.errors} failed — tap a card to retry`
                    : 'Tap any still to render it'
            }
          />

          {error ? <Callout variant="error" title="Generation stopped" message={error} /> : null}

          <View style={[styles.grid, { gap: GAP }]}>
            {project.scenes.map((scene, i) => (
              <SceneCard
                key={scene.id}
                scene={scene}
                index={i}
                width={cardWidth}
                project={project}
                showCost={settings.showCosts}
                onGenerate={() => generateSceneImage(scene.id)}
                onEdit={() => setEditing({ kind: 'scene', item: scene })}
              />
            ))}
          </View>
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

function citedNames(project: Project, scene: Scene): string[] {
  const names: string[] = [];
  for (const id of scene.peopleIds) {
    const person = project.people.find((p) => p.id === id);
    if (person) names.push(person.name);
  }
  for (const id of scene.thingIds) {
    const thing = project.things.find((t) => t.id === id);
    if (thing) names.push(thing.name);
  }
  return names;
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

function Tag({ label }: { label: string }) {
  return (
    <View style={styles.tag}>
      <Text style={styles.tagText} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function SceneCard({
  scene,
  index,
  width,
  project,
  showCost,
  onGenerate,
  onEdit,
}: {
  scene: Scene;
  index: number;
  width: number;
  project: Project;
  showCost: boolean;
  onGenerate: () => void;
  onEdit: () => void;
}) {
  const { accent } = useSettings();
  const canGenerate = needsImage(scene) && scene.imageStatus !== 'generating';
  const imageWidth = Math.min(width - 40, 168);
  const names = citedNames(project, scene);

  return (
    <GlassCard
      tone="raised"
      radius={theme.radius.lg}
      style={{ width }}
      glowColor={scene.imageStatus === 'generating' ? accent.glow : undefined}>
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
          <CaptionStrong numberOfLines={2}>{scene.title}</CaptionStrong>
        </View>

        <StatusBadge status={scene.imageStatus} stale={scene.imageStale} />
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          canGenerate ? `Render image for scene ${index + 1}` : `Edit scene ${index + 1}`
        }
        onPress={
          scene.imageStatus === 'generating' ? undefined : canGenerate ? onGenerate : onEdit
        }
        style={styles.imageWrap}>
        <VerticalFrame
          uri={scene.imageUri}
          width={imageWidth}
          status={scene.imageStatus}
          emptyLabel="Tap to render"
        />

        {scene.imageStale && scene.imageUri ? (
          <View style={styles.staleOverlay} pointerEvents="none">
            <View style={styles.stalePill}>
              <Ionicons name="alert-circle" size={11} color={theme.warning} />
              <Text style={styles.stalePillText}>Outdated</Text>
            </View>
          </View>
        ) : null}
      </Pressable>

      {scene.imageError ? (
        <View style={styles.errorRow}>
          <Ionicons name="warning-outline" size={12} color={theme.danger} />
          <MicroError text={scene.imageError} />
        </View>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Edit scene ${index + 1}`}
        onPress={onEdit}
        style={styles.descBlock}>
        <Body style={styles.descText} numberOfLines={4}>
          {scene.look}
        </Body>
        {names.length > 0 ? (
          <View style={styles.tagRow}>
            {names.map((name) => (
              <Tag key={name} label={name} />
            ))}
          </View>
        ) : null}
      </Pressable>

      <View style={styles.cardFooter}>
        {showCost ? (
          <Mono>{scene.imageCost != null ? `$${scene.imageCost.toFixed(2)}` : '~$0.04'}</Mono>
        ) : (
          <View />
        )}

        <View style={styles.cardActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Edit scene ${index + 1}`}
            onPress={onEdit}
            style={styles.regenLink}>
            <Ionicons name="create-outline" size={13} color={theme.text} />
            <Text style={styles.regenText}>Edit</Text>
          </Pressable>
          {scene.imageStatus !== 'generating' ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                scene.imageUri ? `Re-render scene ${index + 1}` : `Render scene ${index + 1}`
              }
              onPress={onGenerate}
              style={styles.regenLink}>
              <Ionicons
                name={scene.imageUri ? 'refresh' : 'sparkles'}
                size={13}
                color={theme.text}
              />
              <Text style={styles.regenText}>{scene.imageUri ? 'Re-render' : 'Render'}</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </GlassCard>
  );
}

function MicroError({ text }: { text: string }) {
  return (
    <Text style={styles.errorText} numberOfLines={2}>
      {text}
    </Text>
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
    paddingBottom: theme.space.lg,
    ...Platform.select({ web: { cursor: 'pointer' }, default: {} }),
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
    gap: theme.space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.glass.border,
  },
  descText: {
    fontSize: 13.5,
    lineHeight: 19.5,
    color: theme.textSecondary,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    paddingHorizontal: 8,
    height: 22,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.glass.border,
    maxWidth: '100%',
  },
  tagText: {
    fontFamily: theme.font.sans,
    fontSize: 11,
    fontWeight: '500',
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

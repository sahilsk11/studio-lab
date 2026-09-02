import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
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
  Caption,
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
import type { Frame, Project } from '@/types/project';

const H_PAD = theme.space.xl;
const GAP = theme.space.md;

function frameTitle(action: string): string {
  const first = (action.split(/[.!?\n]/)[0] ?? action).trim() || action.trim();
  if (first.length <= 40) return first;
  const clipped = first.slice(0, 40);
  const sp = clipped.lastIndexOf(' ');
  return `${(sp > 16 ? clipped.slice(0, sp) : clipped).trimEnd()}…`;
}

export default function FramesScreen() {
  const router = useRouter();
  const { width: windowWidth } = useWindowDimensions();
  const {
    project,
    hydrated,
    error,
    generateFrames,
    generateFrameImage,
    generateAllFrameImages,
    generateImage,
    updateItem,
    removeItem,
  } = useProject();
  const { settings, tap } = useSettings();
  const [drafting, setDrafting] = useState(false);
  const [redoing, setRedoing] = useState(false);
  const [editing, setEditing] = useState<EditorTarget | null>(null);
  const requestedFrames = useRef(false);

  const contentWidth = Math.min(windowWidth, CONTENT_MAX_WIDTH);
  const columns = contentWidth >= 620 ? 2 : 1;
  const cardWidth = (contentWidth - H_PAD * 2 - GAP * (columns - 1)) / columns;

  const frames = [...project.frames].sort((a, b) => a.order - b.order);
  const progress = imageProgress(frames);
  const needsWork = progress.pending + progress.stale + progress.errors;
  const allReady = progress.total > 0 && needsWork === 0 && progress.generating === 0;
  const showRender = needsWork > 0;

  useEffect(() => {
    if (!hydrated) return;
    if (project.frames.length > 0) return;
    if (project.scenes.length === 0) {
      router.replace('/scenes');
      return;
    }
    if (requestedFrames.current) return;
    requestedFrames.current = true;
    void draftFrames();
  }, [
    hydrated,
    project.frames.length,
    project.scenes.length,
    router,
  ]);

  async function draftFrames() {
    setDrafting(true);
    try {
      await generateFrames({ replace: true });
    } finally {
      setDrafting(false);
    }
  }

  function handleGenerateAll() {
    void generateAllFrameImages();
  }

  async function handleRedo() {
    const ok = await confirm({
      title: 'Redo keyframes?',
      message: 'The model will draft a new shot list from the locked places. Video is cleared.',
      confirmLabel: 'Redo frames',
      destructive: true,
    });
    if (!ok) return;
    setRedoing(true);
    try {
      await generateFrames({ replace: true });
      tap('success');
    } finally {
      setRedoing(false);
    }
  }

  if (!hydrated || (project.frames.length === 0 && (drafting || !requestedFrames.current))) {
    return (
      <Screen header={<AppHeader title="Keyframes" onBack={() => router.push('/scenes')} />}>
        <View style={styles.loading}>
          <ActivityIndicator color={theme.textSecondary} />
        </View>
      </Screen>
    );
  }

  if (project.frames.length === 0) {
    return (
      <Screen header={<AppHeader title="Keyframes" onBack={() => router.push('/scenes')} />}>
        <View style={styles.empty}>
          <Title>No keyframes</Title>
          <Body style={styles.sub}>Draft a shot list from the locked places, or go back and change a scene.</Body>
          <Button
            label="Draft keyframes"
            icon="sparkles"
            loading={drafting}
            onPress={() => {
              requestedFrames.current = true;
              void draftFrames();
            }}
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      header={<AppHeader title="Keyframes" onBack={() => router.push('/scenes')} />}
      footer={
        <>
          {showRender ? (
            <Button
              label={`Render ${needsWork} frame${needsWork === 1 ? '' : 's'}`}
              icon="sparkles"
              size="lg"
              onPress={handleGenerateAll}
            />
          ) : (
            <Button
              label="Generate video"
              icon="play"
              size="lg"
              disabled={!allReady}
              onPress={() => router.push('/generate')}
            />
          )}
        </>
      }>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <Container style={styles.stack}>
          <GlassCard radius={theme.radius.md}>
            <View style={styles.railInner}>
              <StepRail current="Frames" />
            </View>
          </GlassCard>

          <View style={styles.heading}>
            <View style={styles.headingTop}>
              <Title style={styles.headingTitle}>Keyframes</Title>
              <Button
                label="Redo"
                variant="ghost"
                size="sm"
                inline
                icon="refresh-outline"
                loading={redoing}
                disabled={redoing}
                onPress={() => void handleRedo()}
              />
            </View>
            <Body style={styles.sub}>
              The important stills, in order. Video interpolates between them.
            </Body>
          </View>

          <ProgressCard
            label="Frames ready"
            value={progress.done}
            total={progress.total}
            detail={
              progress.generating > 0
                ? `Rendering ${progress.generating} frame${progress.generating === 1 ? '' : 's'}…`
                : progress.stale > 0
                  ? `${progress.stale} need re-rendering after your edits`
                  : progress.errors > 0
                    ? `${progress.errors} failed — tap a card to retry`
                    : 'Tap any frame to render it'
            }
          />

          {error ? <Callout variant="error" title="Generation stopped" message={error} /> : null}

          <View style={[styles.grid, { gap: GAP }]}>
            {frames.map((frame, i) => (
              <FrameCard
                key={frame.id}
                frame={frame}
                index={i}
                width={cardWidth}
                project={project}
                showCost={settings.showCosts}
                onGenerate={() => generateFrameImage(frame.id)}
                onEdit={() => setEditing({ kind: 'frame', item: frame })}
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

function Tag({ label }: { label: string }) {
  return (
    <View style={styles.tag}>
      <Text style={styles.tagText} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function FrameCard({
  frame,
  index,
  width,
  project,
  showCost,
  onGenerate,
  onEdit,
}: {
  frame: Frame;
  index: number;
  width: number;
  project: Project;
  showCost: boolean;
  onGenerate: () => void;
  onEdit: () => void;
}) {
  const { accent } = useSettings();
  const canGenerate = needsImage(frame) && frame.imageStatus !== 'generating';
  const imageWidth = Math.min(width - 40, 168);
  const scene = project.scenes.find((s) => s.id === frame.sceneId);
  const peopleNames = frame.peopleIds
    .map((id) => project.people.find((p) => p.id === id)?.name)
    .filter((name): name is string => !!name);
  const chips = [scene?.title, ...peopleNames].filter((n): n is string => !!n);

  return (
    <GlassCard
      tone="raised"
      radius={theme.radius.lg}
      style={{ width }}
      glowColor={frame.imageStatus === 'generating' ? accent.glow : undefined}>
      <View style={styles.cardHeader}>
        <Text style={styles.index}>{String(index + 1).padStart(2, '0')}</Text>
        <CaptionStrong style={styles.cardTitle} numberOfLines={2}>
          {frameTitle(frame.action)}
        </CaptionStrong>
        <StatusBadge status={frame.imageStatus} stale={frame.imageStale} />
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          canGenerate ? `Render keyframe ${index + 1}` : `Edit keyframe ${index + 1}`
        }
        onPress={
          frame.imageStatus === 'generating' ? undefined : canGenerate ? onGenerate : onEdit
        }
        style={styles.imageWrap}>
        <VerticalFrame
          uri={frame.imageUri}
          width={imageWidth}
          status={frame.imageStatus}
          emptyLabel="Tap to render"
        />

        {frame.imageStale && frame.imageUri ? (
          <View style={styles.staleOverlay} pointerEvents="none">
            <View style={styles.stalePill}>
              <Ionicons name="alert-circle" size={11} color={theme.warning} />
              <Text style={styles.stalePillText}>Outdated</Text>
            </View>
          </View>
        ) : null}
      </Pressable>

      {frame.imageError ? (
        <View style={styles.errorRow}>
          <Ionicons name="warning-outline" size={12} color={theme.danger} />
          <Text style={styles.errorText} numberOfLines={2}>
            {frame.imageError}
          </Text>
        </View>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Edit keyframe ${index + 1}`}
        onPress={onEdit}
        style={styles.descBlock}>
        <Caption style={styles.action}>{frame.action}</Caption>
        {frame.camera ? (
          <View style={styles.cameraRow}>
            <Ionicons name="videocam-outline" size={13} color={theme.textQuaternary} />
            <Caption style={styles.camera} numberOfLines={2}>
              {frame.camera}
            </Caption>
          </View>
        ) : null}
        {chips.length > 0 ? (
          <View style={styles.tagRow}>
            {chips.map((label) => (
              <Tag key={label} label={label} />
            ))}
          </View>
        ) : null}
      </Pressable>

      <View style={styles.cardFooter}>
        {showCost ? (
          <Mono>{frame.imageCost != null ? `$${frame.imageCost.toFixed(2)}` : '~$0.04'}</Mono>
        ) : (
          <View />
        )}

        <View style={styles.cardActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Edit keyframe ${index + 1}`}
            onPress={onEdit}
            style={styles.regenLink}>
            <Ionicons name="create-outline" size={13} color={theme.text} />
            <Text style={styles.regenText}>Edit</Text>
          </Pressable>
          {frame.imageStatus !== 'generating' ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                frame.imageUri ? `Re-render keyframe ${index + 1}` : `Render keyframe ${index + 1}`
              }
              onPress={onGenerate}
              style={styles.regenLink}>
              <Ionicons
                name={frame.imageUri ? 'refresh' : 'sparkles'}
                size={13}
                color={theme.text}
              />
              <Text style={styles.regenText}>{frame.imageUri ? 'Re-render' : 'Render'}</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </GlassCard>
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
    gap: theme.space.sm,
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
  sub: {
    maxWidth: 480,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.space.xl,
    gap: theme.space.lg,
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
  index: {
    fontFamily: theme.font.mono,
    fontSize: 12,
    color: theme.textQuaternary,
  },
  cardTitle: {
    flex: 1,
    minWidth: 0,
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
  action: {
    fontSize: 13.5,
    lineHeight: 19.5,
    color: theme.textSecondary,
  },
  cameraRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.space.sm,
  },
  camera: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 18,
    color: theme.textTertiary,
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

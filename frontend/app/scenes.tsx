import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { ItemEditor, type EditorTarget } from '@/components/ItemEditor';
import {
  Button,
  Callout,
  Caption,
  CaptionStrong,
  GlassCard,
  Mono,
  ProgressRail,
  Screen,
  Shimmer,
  StatusBadge,
} from '@/components/ui';
import { theme } from '@/constants/theme';
import { useProject } from '@/context/ProjectContext';
import { useSettings } from '@/context/SettingsContext';
import { useContinueAfterSignIn } from '@/components/ui/SignInGate';
import { imageProgress } from '@/lib/project';
import type { Frame, Project } from '@/types/project';

export default function ScenesReviewScreen() {
  const router = useRouter();
  const {
    project,
    hydrated,
    error,
    generateFrameImage,
    generateAllFrameImages,
    generateImage,
    updateItem,
    removeItem,
  } = useProject();
  const { settings, tap } = useSettings();
  const { authReady, requiresSignIn, continueOrSignIn } = useContinueAfterSignIn(() => {
    tap('success');
    router.push('/watch');
  });
  const needsSignIn = requiresSignIn && !settings.testMode;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<EditorTarget | null>(null);

  const frames = useMemo(
    () => [...project.frames].sort((a, b) => a.order - b.order),
    [project.frames],
  );
  const selected = frames.find((frame) => frame.id === selectedId) ?? frames[0];
  const progress = imageProgress(frames);
  const outstanding = progress.pending + progress.stale + progress.errors;
  const rendering = progress.generating > 0;
  const allReady = progress.total > 0 && outstanding === 0 && !rendering;

  useEffect(() => {
    if (!hydrated) return;
    if (project.frames.length === 0) router.replace('/action');
  }, [hydrated, project.frames.length, router]);

  if (!hydrated || project.frames.length === 0) {
    return <Screen currentStep="Scenes" loading />;
  }

  const nextAction =
    outstanding > 0 || rendering
      ? {
          label: rendering
            ? `Rendering ${progress.generating}…`
            : `Render ${outstanding} scene${outstanding === 1 ? '' : 's'}`,
          onPress: () => void generateAllFrameImages(),
          loading: rendering && outstanding === 0,
          disabled: rendering && outstanding === 0,
        }
      : {
          label: needsSignIn ? 'Sign in to generate video' : 'Generate video',
          onPress: continueOrSignIn,
          loading: !authReady && !settings.testMode,
          disabled: (!allReady && !needsSignIn) || (!authReady && !settings.testMode),
        };

  return (
    <Screen
      currentStep="Scenes"
      title="The moments that matter"
      subtitle="Review the whole cut at once. These 9:16 stills anchor the motion and continuity between beats."
      stats={[
        { label: 'Scenes', value: `${progress.done}/${progress.total}` },
        { label: 'Look', value: project.style },
        ...(settings.showCosts ? [{ label: 'Cost', value: `$${project.totalCost.toFixed(2)}` }] : []),
      ]}
      next={nextAction}>
      <View style={styles.stack}>
        <View style={styles.progressBlock}>
          <View style={styles.progressHeader}>
            <CaptionStrong>Key scenes</CaptionStrong>
            <Mono>
              {progress.done}/{progress.total}
            </Mono>
          </View>
          <ProgressRail value={progress.done} total={progress.total} />
        </View>

        {error ? <Callout variant="error" title="Scene rendering paused" message={error} /> : null}

        <View style={styles.grid}>
          {frames.map((frame, index) => (
            <SceneFrameCard
              key={frame.id}
              frame={frame}
              project={project}
              index={index}
              selected={frame.id === selected?.id}
              onPress={() => {
                tap('light');
                setSelectedId(frame.id);
              }}
            />
          ))}
        </View>

        {selected ? (
          <GlassCard tone="raised" radius={theme.radius.lg}>
            <View style={styles.continuityPanel}>
              <View style={styles.continuityIcon}>
                <Ionicons name="git-compare-outline" size={18} color={theme.textSecondary} />
              </View>
              <View style={styles.continuityCopy}>
                <Mono>SELECTED · FRAME {String(selected.order).padStart(2, '0')}</Mono>
                <CaptionStrong numberOfLines={2}>{selected.action}</CaptionStrong>
                <Caption numberOfLines={2}>{selected.camera}</Caption>
              </View>
              <View style={styles.continuityActions}>
                <Button
                  label="Edit"
                  icon="create-outline"
                  size="sm"
                  variant="secondary"
                  onPress={() => setEditing({ kind: 'frame', item: selected })}
                  style={styles.actionFlex}
                />
                <Button
                  label="Try another"
                  icon="refresh-outline"
                  size="sm"
                  variant="ghost"
                  loading={selected.imageStatus === 'generating'}
                  onPress={() => void generateFrameImage(selected.id)}
                  style={styles.actionFlex}
                />
              </View>
            </View>
          </GlassCard>
        ) : null}

        <View style={styles.timelineRow}>
          <Mono>TIMELINE</Mono>
          <View style={styles.timelineSegments}>
            {frames.map((frame, index) => (
              <View
                key={frame.id}
                style={[
                  styles.timelineSegment,
                  frame.imageStatus === 'done' && !frame.imageStale
                    ? styles.timelineDone
                    : frame.imageStatus === 'generating'
                      ? styles.timelineRendering
                      : null,
                  { flex: index === Math.floor(frames.length / 2) ? 0.7 : 1 },
                ]}
              />
            ))}
          </View>
        </View>
      </View>

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

function SceneFrameCard({
  frame,
  project,
  index,
  selected,
  onPress,
}: {
  frame: Frame;
  project: Project;
  index: number;
  selected: boolean;
  onPress: () => void;
}) {
  const scene = project.scenes.find((item) => item.id === frame.sceneId);
  const label = index === 0 ? 'opening' : index === project.frames.length - 1 ? 'closing' : index === Math.floor(project.frames.length / 2) ? 'key' : `beat ${index + 1}`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`Select frame ${index + 1}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.cardPressable,
        selected && styles.cardSelected,
        pressed && styles.pressed,
      ]}>
      <View style={styles.frameImage}>
        {frame.imageUri ? (
          <Image
            source={{ uri: frame.imageUri }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
            accessibilityIgnoresInvertColors
          />
        ) : scene?.imageUri ? (
          <Image
            source={{ uri: scene.imageUri }}
            style={[StyleSheet.absoluteFill, styles.sceneFallback]}
            resizeMode="cover"
            accessibilityIgnoresInvertColors
          />
        ) : (
          <View style={styles.emptyFrame}>
            <Ionicons name="image-outline" size={20} color={theme.textQuaternary} />
          </View>
        )}
        {frame.imageStatus === 'generating' ? <Shimmer /> : null}
        <View style={styles.frameLabel}>
          <Text style={styles.frameLabelText}>{label}</Text>
        </View>
        <View style={styles.frameStatus}>
          <StatusBadge status={frame.imageStatus} stale={frame.imageStale} compact />
        </View>
      </View>
      <View style={styles.frameCaption}>
        <CaptionStrong numberOfLines={2}>{frame.action}</CaptionStrong>
        <Mono numberOfLines={1}>{scene?.title ?? frame.camera}</Mono>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  stack: { gap: theme.space.xl },
  progressBlock: { gap: theme.space.sm },
  progressHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.space.md },
  cardPressable: {
    overflow: 'hidden',
    flexGrow: 1,
    flexBasis: 150,
    maxWidth: 220,
    borderRadius: theme.radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.borderStrong,
    backgroundColor: theme.surface,
    ...theme.shadow.md,
    ...Platform.select({ web: { cursor: 'pointer' }, default: {} }),
  },
  cardSelected: { borderWidth: 1.5, borderColor: theme.warning },
  pressed: { opacity: 0.82 },
  frameImage: { width: '100%', aspectRatio: 9 / 16, overflow: 'hidden', backgroundColor: theme.bgSunken },
  sceneFallback: { opacity: 0.56 },
  emptyFrame: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  frameLabel: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: theme.radius.xs,
    backgroundColor: 'rgba(6,7,11,0.78)',
  },
  frameLabelText: {
    color: theme.text,
    fontFamily: theme.font.mono,
    fontSize: 9,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  frameStatus: { position: 'absolute', right: 7, top: 7 },
  frameCaption: { minHeight: 82, padding: theme.space.md, gap: 5 },
  continuityPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: theme.space.lg,
    padding: theme.space.lg,
  },
  continuityIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.borderStrong,
  },
  continuityCopy: { flex: 1, minWidth: 0, gap: 5 },
  continuityActions: { flexGrow: 1, flexDirection: 'row', gap: theme.space.sm, flexWrap: 'wrap' },
  actionFlex: { flexGrow: 1 },
  timelineRow: { flexDirection: 'row', alignItems: 'center', gap: theme.space.md },
  timelineSegments: { flex: 1, height: 24, flexDirection: 'row', gap: 4 },
  timelineSegment: {
    borderRadius: theme.radius.xs,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.borderStrong,
    backgroundColor: theme.surface,
  },
  timelineDone: { backgroundColor: theme.successDim, borderColor: theme.success },
  timelineRendering: { backgroundColor: theme.infoDim, borderColor: theme.info },
});

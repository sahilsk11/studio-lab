import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
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
  Screen,
  StatusBadge,
} from '@/components/ui';
import { theme } from '@/constants/theme';
import { useProject } from '@/context/ProjectContext';
import { useSettings } from '@/context/SettingsContext';
import type { Project, Scene } from '@/types/project';

export default function PlacesScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const {
    project,
    hydrated,
    testMode,
    error,
    generateFrames,
    generateImage,
    updateItem,
    removeItem,
  } = useProject();
  const { settings, tap } = useSettings();
  const [editing, setEditing] = useState<EditorTarget | null>(null);
  const [advancing, setAdvancing] = useState(false);
  const [kept, setKept] = useState<string[]>([]);
  const compact = width < 700;

  useEffect(() => {
    if (!hydrated) return;
    if (project.scenes.length === 0 && !testMode) router.replace('/cast');
  }, [hydrated, project.scenes.length, testMode, router]);

  useEffect(() => {
    setKept((current) => {
      const currentIds = new Set(project.scenes.map((scene) => scene.id));
      const surviving = current.filter((id) => currentIds.has(id));
      const rendered = project.scenes
        .filter((scene) => scene.imageStatus === 'done' && !scene.imageStale)
        .map((scene) => scene.id);
      return Array.from(new Set([...surviving, ...rendered]));
    });
  }, [project.scenes]);

  async function handleNext() {
    setAdvancing(true);
    try {
      if (project.frames.length === 0) await generateFrames();
      tap('success');
      router.push('/action');
    } finally {
      setAdvancing(false);
    }
  }

  const remaining = Math.max(0, project.scenes.length - kept.length);
  const nextHint =
    remaining > 0
      ? remaining === project.scenes.length && project.scenes.length === 2
        ? 'keep both to continue'
        : `keep ${remaining} more to continue`
      : undefined;

  if (!hydrated || (project.scenes.length === 0 && !testMode)) {
    return <Screen currentStep="Places" loading />;
  }

  return (
    <Screen
      currentStep="Places"
      title="Where it happens"
      subtitle="Two locations, generated as wide establishing plates. Tune a prompt before you keep it."
      stats={[
        { label: 'Places', value: String(project.scenes.length) },
        { label: 'Kept', value: String(kept.length) },
        { label: 'Look', value: project.style },
      ]}
      next={{
        label: 'Next: Action',
        onPress: () => void handleNext(),
        disabled: advancing,
        loading: advancing,
        hint: nextHint,
      }}>
      {error ? <Callout variant="error" title="Places paused" message={error} /> : null}

      <View style={[styles.grid, compact && styles.gridCompact]}>
        {project.scenes.map((scene, index) => (
          <PlaceCard
            key={scene.id}
            scene={scene}
            project={project}
            index={index}
            kept={kept.includes(scene.id)}
            showCost={settings.showCosts}
            onToggleKeep={() => {
              tap('light');
              setKept((current) =>
                current.includes(scene.id)
                  ? current.filter((id) => id !== scene.id)
                  : [...current, scene.id],
              );
            }}
            onEdit={() => setEditing({ kind: 'scene', item: scene })}
          />
        ))}
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

function PlaceCard({
  scene,
  project,
  index,
  kept,
  showCost,
  onToggleKeep,
  onEdit,
}: {
  scene: Scene;
  project: Project;
  index: number;
  kept: boolean;
  showCost: boolean;
  onToggleKeep: () => void;
  onEdit: () => void;
}) {
  const canKeep = scene.imageStatus === 'done' && !scene.imageStale;
  const names = [
    ...scene.peopleIds.map((id) => project.people.find((person) => person.id === id)?.name),
    ...scene.thingIds.map((id) => project.things.find((thing) => thing.id === id)?.name),
  ].filter(Boolean) as string[];

  return (
    <GlassCard
      radius={theme.radius.md}
      tone={kept ? 'active' : 'raised'}
      style={styles.placeCard}
      glowColor={kept ? theme.accent : undefined}>
      <Pressable onPress={onEdit} accessibilityRole="button" accessibilityLabel={`Edit ${scene.title}`}>
        <View style={styles.imagePair}>
          <PlaceImage uri={scene.imageUri} label="wide plate" />
          <PlaceImage uri={scene.imageUri} label="shoot angle" narrow />
          <View style={styles.indexBadge}>
            <Mono color={theme.text}>{String(index + 1).padStart(2, '0')}</Mono>
          </View>
        </View>
      </Pressable>

      <View style={styles.cardBody}>
        <View style={styles.cardTitleRow}>
          <View style={styles.cardTitle}>
            <CaptionStrong numberOfLines={1}>{scene.title}</CaptionStrong>
            <Mono>{Math.max(1, scene.peopleIds.length + scene.thingIds.length)} refs</Mono>
          </View>
          <StatusBadge status={scene.imageStatus} stale={scene.imageStale} compact />
        </View>
        <Caption numberOfLines={2}>{scene.look}</Caption>
        {names.length > 0 ? (
          <View style={styles.tags}>
            {names.slice(0, 3).map((name) => (
              <View key={name} style={styles.tag}>
                <Text style={styles.tagText}>{name}</Text>
              </View>
            ))}
          </View>
        ) : null}
        {scene.imageError ? <Caption style={styles.error}>{scene.imageError}</Caption> : null}
        {showCost && scene.imageCost ? <Mono>${scene.imageCost.toFixed(2)} image</Mono> : null}

        <View style={styles.actions}>
          <Button
            label={kept ? 'Kept' : 'Keep'}
            icon={kept ? 'checkmark' : undefined}
            size="sm"
            variant={kept ? 'secondary' : 'primary'}
            disabled={!canKeep}
            onPress={onToggleKeep}
            style={styles.flex}
          />
          <Button label="Edit" icon="create-outline" size="sm" variant="ghost" onPress={onEdit} />
        </View>
      </View>
    </GlassCard>
  );
}

function PlaceImage({ uri, label, narrow }: { uri?: string; label: string; narrow?: boolean }) {
  return (
    <View style={[styles.placeImage, narrow && styles.placeImageNarrow]}>
      {uri ? (
        <Image
          source={{ uri }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
          accessibilityIgnoresInvertColors
        />
      ) : (
        <View style={styles.imageEmpty}>
          <Ionicons name="image-outline" size={20} color={theme.textQuaternary} />
        </View>
      )}
      <View style={styles.imageLabel}>
        <Text style={styles.imageLabelText}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.space.md },
  gridCompact: { flexDirection: 'column', flexWrap: 'nowrap' },
  placeCard: { overflow: 'hidden', flexGrow: 1, flexBasis: 320, minWidth: 280 },
  imagePair: { height: 154, flexDirection: 'row', gap: 2, backgroundColor: theme.bgSunken },
  placeImage: { flex: 1.55, overflow: 'hidden', backgroundColor: theme.surface },
  placeImageNarrow: { flex: 1 },
  imageEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  imageLabel: {
    position: 'absolute',
    left: 8,
    bottom: 8,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: theme.radius.xs,
    backgroundColor: 'rgba(6,7,11,0.72)',
  },
  imageLabelText: {
    color: theme.text,
    fontFamily: theme.font.mono,
    fontSize: 9,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  indexBadge: {
    position: 'absolute',
    right: 8,
    top: 8,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: theme.radius.xs,
    backgroundColor: 'rgba(6,7,11,0.72)',
  },
  cardBody: { padding: theme.space.lg, gap: theme.space.md },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: theme.space.sm },
  cardTitle: { flex: 1, flexDirection: 'row', alignItems: 'baseline', gap: theme.space.sm },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: {
    borderRadius: theme.radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.borderStrong,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  tagText: { color: theme.textTertiary, fontFamily: theme.font.sans, fontSize: 11 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: theme.space.sm },
  error: { color: theme.danger },
});

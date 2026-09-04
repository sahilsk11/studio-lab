import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
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
  GlassCard,
  Mono,
  Screen,
} from '@/components/ui';
import { theme } from '@/constants/theme';
import { useProject } from '@/context/ProjectContext';
import { useSettings } from '@/context/SettingsContext';
import { confirm } from '@/lib/confirm';
import type { Frame, Project } from '@/types/project';

export default function ActionScreen() {
  const router = useRouter();
  const {
    project,
    hydrated,
    error,
    generateFrames,
    generateAllFrameImages,
    generateImage,
    updateItem,
    removeItem,
  } = useProject();
  const { settings, tap } = useSettings();
  const [drafting, setDrafting] = useState(false);
  const [rewriting, setRewriting] = useState(false);
  const [editing, setEditing] = useState<EditorTarget | null>(null);
  const requested = useRef(false);

  const frames = [...project.frames].sort((a, b) => a.order - b.order);
  const keyIndex = Math.max(0, Math.floor(frames.length / 2));

  useEffect(() => {
    if (!hydrated || project.frames.length > 0 || requested.current) return;
    if (project.scenes.length === 0) {
      router.replace('/places');
      return;
    }
    requested.current = true;
    void draftAction();
  }, [hydrated, project.frames.length, project.scenes.length, router]);

  async function draftAction() {
    setDrafting(true);
    try {
      await generateFrames({ replace: true });
    } finally {
      setDrafting(false);
    }
  }

  async function rewriteAll() {
    const ok = await confirm({
      title: 'Rewrite the action?',
      message: 'This replaces the beat sequence and clears rendered key moments.',
      confirmLabel: 'Rewrite',
      destructive: true,
    });
    if (!ok) return;
    setRewriting(true);
    try {
      await generateFrames({ replace: true });
      tap('success');
    } finally {
      setRewriting(false);
    }
  }

  function handleNext() {
    if (settings.autoGenerateImages) void generateAllFrameImages();
    tap('success');
    router.push('/scenes');
  }

  if (!hydrated || (drafting && frames.length === 0)) {
    return <Screen currentStep="Action" loading />;
  }

  if (frames.length === 0) {
    return (
      <Screen
        currentStep="Action"
        title="No action yet"
        subtitle="Draft a readable sequence from the cast and places you kept."
        next={{ label: 'Draft the action', onPress: () => void draftAction() }}>
        {error ? <Callout variant="error" title="Draft paused" message={error} /> : null}
      </Screen>
    );
  }

  return (
    <Screen
      currentStep="Action"
      title="Here's what happens"
      subtitle={`${frames.length} beats, ${project.durationSec} seconds. Tap any line to edit the action or camera direction.`}
      stats={[
        { label: 'Beats', value: String(frames.length) },
        { label: 'Length', value: `${project.durationSec}s` },
      ]}
      extra={
        <Button
          label="Rewrite all"
          icon="refresh-outline"
          size="sm"
          variant="ghost"
          inline
          loading={rewriting}
          onPress={() => void rewriteAll()}
        />
      }
      next={{ label: 'Next: Scenes', onPress: handleNext }}>
      <View style={styles.stack}>
        <BeatRail frames={frames} keyIndex={keyIndex} />

        {error ? <Callout variant="error" title="Action paused" message={error} /> : null}

        <View style={styles.beatList}>
          {frames.map((frame, index) => (
            <BeatCard
              key={frame.id}
              frame={frame}
              project={project}
              index={index}
              count={frames.length}
              durationSec={project.durationSec}
              isKey={index === keyIndex}
              onPress={() => setEditing({ kind: 'frame', item: frame })}
            />
          ))}
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

function BeatRail({ frames, keyIndex }: { frames: Frame[]; keyIndex: number }) {
  const { accent } = useSettings();
  return (
    <View style={styles.beatRail} accessibilityLabel="Beat timing overview">
      {frames.map((frame, index) => (
        <View
          key={frame.id}
          style={[
            styles.beatRailSegment,
            {
              flex: index === keyIndex ? 0.72 : index % 2 === 0 ? 1.2 : 1,
              backgroundColor: index === keyIndex ? accent.tint : `${accent.tint}${index % 2 ? '66' : '99'}`,
            },
          ]}
        />
      ))}
    </View>
  );
}

function BeatCard({
  frame,
  project,
  index,
  count,
  durationSec,
  isKey,
  onPress,
}: {
  frame: Frame;
  project: Project;
  index: number;
  count: number;
  durationSec: number;
  isKey: boolean;
  onPress: () => void;
}) {
  const start = (durationSec * index) / count;
  const end = (durationSec * (index + 1)) / count;
  const scene = project.scenes.find((item) => item.id === frame.sceneId);
  const people = frame.peopleIds
    .map((id) => project.people.find((person) => person.id === id)?.name)
    .filter(Boolean) as string[];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Edit beat ${index + 1}`}
      onPress={onPress}
      style={({ pressed }) => [styles.beatPressable, pressed && styles.pressed]}>
      <GlassCard
        radius={theme.radius.md}
        tone={isKey ? 'active' : 'raised'}
        glowColor={isKey ? theme.warning : undefined}>
        <View style={styles.beatCard}>
          <View style={styles.timeCol}>
            <Mono color={isKey ? theme.warning : theme.textTertiary}>
              {start.toFixed(1)}–{end.toFixed(1)}
            </Mono>
            <Text style={styles.beatNumber}>{String(index + 1).padStart(2, '0')}</Text>
          </View>

          <View style={styles.beatCopy}>
            {isKey ? (
              <View style={styles.keyRow}>
                <View style={styles.keyBadge}>
                  <Text style={styles.keyText}>KEY BEAT</Text>
                </View>
                <Caption>This becomes a featured frame.</Caption>
              </View>
            ) : null}
            <Text style={styles.actionText}>{frame.action}</Text>
            <View style={styles.metaRow}>
              {scene ? <Mono>{scene.title}</Mono> : null}
              {people.map((name) => <Mono key={name}>{name}</Mono>)}
              <Mono>{frame.camera}</Mono>
            </View>
          </View>

          <View style={styles.editHint}>
            <Ionicons name="create-outline" size={15} color={theme.textTertiary} />
            <Text style={styles.editText}>edit</Text>
          </View>
        </View>
      </GlassCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  stack: { gap: theme.space.xl },
  beatRail: { flexDirection: 'row', height: 6, gap: 3 },
  beatRailSegment: { height: 6, borderRadius: theme.radius.pill },
  beatList: { gap: theme.space.md },
  beatPressable: {
    borderRadius: theme.radius.md,
    ...Platform.select({ web: { cursor: 'pointer' }, default: {} }),
  },
  pressed: { opacity: 0.8 },
  beatCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.space.lg,
    padding: theme.space.lg,
  },
  timeCol: { width: 74, gap: 7 },
  beatNumber: {
    color: theme.textQuaternary,
    fontFamily: theme.font.sans,
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -1,
  },
  beatCopy: { flex: 1, minWidth: 0, gap: theme.space.sm },
  actionText: {
    color: theme.text,
    fontFamily: theme.font.sans,
    fontSize: 16,
    lineHeight: 23,
    letterSpacing: -0.15,
  },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.space.md },
  keyRow: { flexDirection: 'row', alignItems: 'center', gap: theme.space.sm, flexWrap: 'wrap' },
  keyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.radius.xs,
    backgroundColor: theme.warningDim,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.warning,
  },
  keyText: {
    color: theme.warning,
    fontFamily: theme.font.mono,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  editHint: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingTop: 2 },
  editText: { color: theme.textTertiary, fontFamily: theme.font.sans, fontSize: 12 },
});

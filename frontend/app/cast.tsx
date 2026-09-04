import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { ItemEditor, type EditorTarget } from '@/components/ItemEditor';
import { Button, Screen } from '@/components/ui';
import { theme } from '@/constants/theme';
import { useProject } from '@/context/ProjectContext';
import { useSettings } from '@/context/SettingsContext';
import type { Person, Thing } from '@/types/project';

type CastSelection =
  | { kind: 'person'; item: Person }
  | { kind: 'thing'; item: Thing };

export default function CastScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const {
    project,
    hydrated,
    testMode,
    error,
    generateScenes,
    generateAllSceneImages,
    generateImage,
    updateItem,
    removeItem,
  } = useProject();
  const { settings, tap } = useSettings();
  const [kept, setKept] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<EditorTarget | null>(null);
  const [advancing, setAdvancing] = useState(false);

  const compact = width < 700;
  const empty = project.people.length === 0 && project.things.length === 0;
  const people: CastSelection[] = project.people.map((item) => ({ kind: 'person', item }));
  const objects: CastSelection[] = project.things.map((item) => ({ kind: 'thing', item }));

  useEffect(() => {
    if (!hydrated) return;
    if (empty && !testMode) router.replace('/');
  }, [empty, hydrated, router, testMode]);

  function keyFor(selection: CastSelection) {
    return `${selection.kind}:${selection.item.id}`;
  }

  function toggleKeep(selection: CastSelection) {
    const key = keyFor(selection);
    tap('medium');
    setKept((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function openPlaces() {
    if (advancing) return;
    setAdvancing(true);
    try {
      if (project.scenes.length === 0) await generateScenes({ replace: true });
      tap('success');
      router.push('/places');
      if (settings.autoGenerateImages) void generateAllSceneImages();
    } finally {
      setAdvancing(false);
    }
  }

  if (!hydrated || empty) {
    return <Screen currentStep="Cast" loading />;
  }

  return (
    <Screen
      currentStep="Cast"
      title="Meet the cast"
      subtitle="Keep the ones you want, or edit any card before moving on."
      stats={[
        { label: 'Cast', value: String(people.length) },
        { label: 'Objects', value: String(objects.length) },
        { label: 'Look', value: project.style },
      ]}
      next={{
        label: 'Next: Places',
        onPress: () => void openPlaces(),
        loading: advancing,
        disabled: advancing,
      }}>
      {error ? (
        <View style={styles.errorBox}>
          <Ionicons name="warning-outline" size={15} color={theme.danger} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.stack}>
        {people.length > 0 ? (
          <CastSection
            title="Cast"
            selections={people}
            kept={kept}
            compact={compact}
            keyFor={keyFor}
            onKeep={toggleKeep}
            onEdit={setEditing}
          />
        ) : null}

        {objects.length > 0 ? (
          <CastSection
            title="Objects"
            selections={objects}
            kept={kept}
            compact={compact}
            keyFor={keyFor}
            onKeep={toggleKeep}
            onEdit={setEditing}
          />
        ) : null}
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

function CastSection({
  title,
  selections,
  kept,
  compact,
  keyFor,
  onKeep,
  onEdit,
}: {
  title: string;
  selections: CastSelection[];
  kept: Set<string>;
  compact: boolean;
  keyFor: (selection: CastSelection) => string;
  onKeep: (selection: CastSelection) => void;
  onEdit: (selection: CastSelection) => void;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={[styles.castGrid, compact && styles.castGridCompact]}>
        {selections.map((selection) => {
          const key = keyFor(selection);
          return (
            <CastCard
              key={key}
              selection={selection}
              kept={kept.has(key)}
              compact={compact}
              onKeep={() => onKeep(selection)}
              onEdit={() => onEdit(selection)}
            />
          );
        })}
      </View>
    </View>
  );
}

function CastCard({
  selection,
  kept,
  compact,
  onKeep,
  onEdit,
}: {
  selection: CastSelection;
  kept: boolean;
  compact: boolean;
  onKeep: () => void;
  onEdit: () => void;
}) {
  const { item } = selection;

  return (
    <View style={[styles.castCard, compact && styles.castCardCompact]}>
      <View style={styles.cardImage}>
        {item.imageUri ? (
          <Image source={{ uri: item.imageUri }} resizeMode="contain" style={StyleSheet.absoluteFill} />
        ) : (
          <PatternPreview status={item.imageStatus} />
        )}
        {kept ? (
          <View style={styles.keptBadge}>
            <Ionicons name="checkmark" size={11} color={theme.surface} />
          </View>
        ) : null}
      </View>

      <View style={styles.cardBody}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.cardKind} numberOfLines={1}>
            {'role' in item ? item.role : 'object'}
          </Text>
        </View>
        <Text style={styles.cardLook} numberOfLines={2}>
          {item.look}
        </Text>
        {item.imageError ? <Text style={styles.cardError} numberOfLines={1}>{item.imageError}</Text> : null}
      </View>

      <View style={styles.cardActions}>
        <Button
          label={kept ? 'Kept' : 'Keep'}
          icon={kept ? 'checkmark' : undefined}
          size="sm"
          variant={kept ? 'secondary' : 'primary'}
          onPress={onKeep}
          style={styles.flex}
        />
        <Button label="Edit" size="sm" variant="secondary" onPress={onEdit} />
      </View>
    </View>
  );
}

function PatternPreview({ status }: { status: Person['imageStatus'] }) {
  return (
    <View style={styles.pattern}>
      <View style={styles.patternLabel}>
        {status === 'generating' ? (
          <ActivityIndicator size="small" color={theme.info} />
        ) : (
          <Ionicons name="images-outline" size={22} color={theme.textTertiary} />
        )}
        <Text style={styles.patternText}>
          {status === 'generating' ? 'drawing now…' : 'sheet pending'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  stack: { gap: theme.space.xl },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.space.sm,
    padding: theme.space.md,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.danger,
    borderRadius: theme.radius.sm,
  },
  errorText: { flex: 1, color: theme.danger, fontFamily: theme.font.sans, fontSize: 13 },
  section: { gap: theme.space.md },
  sectionTitle: {
    color: theme.textTertiary,
    fontFamily: theme.font.mono,
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  castGrid: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'stretch', gap: theme.space.md },
  castGridCompact: { flexDirection: 'column', flexWrap: 'nowrap' },
  castCard: {
    width: 230,
    minWidth: 205,
    overflow: 'hidden',
    backgroundColor: theme.surface,
    borderColor: theme.border,
    borderWidth: 1,
    borderRadius: theme.radius.md,
  },
  castCardCompact: { width: '100%', minWidth: 0 },
  cardImage: {
    height: 124,
    overflow: 'hidden',
    backgroundColor: theme.surfaceMuted,
    borderBottomColor: theme.border,
    borderBottomWidth: 1,
  },
  keptBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.info,
  },
  cardBody: { padding: theme.space.md, gap: theme.space.sm },
  cardTitleRow: { flexDirection: 'row', alignItems: 'baseline', gap: theme.space.sm },
  cardTitle: {
    flex: 1,
    color: theme.text,
    fontFamily: theme.font.sans,
    fontSize: 15,
    fontWeight: '700',
  },
  cardKind: {
    maxWidth: '45%',
    color: theme.textTertiary,
    fontFamily: theme.font.mono,
    fontSize: 10,
  },
  cardLook: {
    minHeight: 34,
    color: theme.textSecondary,
    fontFamily: theme.font.sans,
    fontSize: 12.5,
    lineHeight: 17,
  },
  cardError: { color: theme.danger, fontFamily: theme.font.sans, fontSize: 11 },
  cardActions: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: theme.space.md,
    paddingBottom: theme.space.md,
  },
  pattern: { flex: 1, backgroundColor: theme.surfaceMuted },
  patternLabel: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 },
  patternText: { color: theme.textTertiary, fontFamily: theme.font.mono, fontSize: 10 },
});

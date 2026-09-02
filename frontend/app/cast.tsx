import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { ItemEditor, type EditorTarget } from '@/components/ItemEditor';
import {
  AppHeader,
  Button,
  Container,
  Screen,
  SIDEBAR_INSET,
  StepSidebar,
  useDesktopLayout,
} from '@/components/ui';
import { theme } from '@/constants/theme';
import { useProject } from '@/context/ProjectContext';
import { useSettings } from '@/context/SettingsContext';
import { castItems, imageProgress } from '@/lib/project';
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
    generatePersonImage,
    generateThingImage,
    generateAllCastImages,
    generateScenes,
    generateAllSceneImages,
    generateImage,
    updateItem,
    removeItem,
  } = useProject();
  const { settings, tap } = useSettings();
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [kept, setKept] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<EditorTarget | null>(null);
  const [advancing, setAdvancing] = useState(false);

  const compact = width < 700;
  const desktop = useDesktopLayout();
  const empty = project.people.length === 0 && project.things.length === 0;
  const items = useMemo<CastSelection[]>(
    () => [
      ...project.people.map((item) => ({ kind: 'person' as const, item })),
      ...project.things.map((item) => ({ kind: 'thing' as const, item })),
    ],
    [project.people, project.things],
  );
  const selected = items.find(({ kind, item }) => `${kind}:${item.id}` === selectedKey) ?? items[0];
  const progress = imageProgress(castItems(project));
  const pending = progress.pending + progress.stale + progress.errors;

  useEffect(() => {
    if (!hydrated) return;
    if (empty && !testMode) router.replace('/');
  }, [empty, hydrated, router, testMode]);

  useEffect(() => {
    if (
      items[0] &&
      !items.some(({ kind, item }) => `${kind}:${item.id}` === selectedKey)
    ) {
      setSelectedKey(`${items[0].kind}:${items[0].item.id}`);
    }
  }, [items, selectedKey]);

  function keyFor(selection: CastSelection) {
    return `${selection.kind}:${selection.item.id}`;
  }

  function generate(selection: CastSelection) {
    if (selection.kind === 'person') return generatePersonImage(selection.item.id);
    return generateThingImage(selection.item.id);
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

  if (!hydrated || !selected) {
    return (
      <Screen header={<AppHeader title="Cast" onBack={() => router.push('/interview')} />}>
        <View style={styles.loading}>
          <ActivityIndicator color={theme.textSecondary} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      header={
        <AppHeader
          title={project.title || 'Cast'}
          onBack={() => router.push('/interview')}
          right={
            pending > 0 ? (
              <Button
                label={`Render ${pending}`}
                size="sm"
                variant="secondary"
                inline
                onPress={() => void generateAllCastImages()}
              />
            ) : undefined
          }
        />
      }
      footer={
        <View style={[styles.footer, compact && styles.footerCompact]}>
          <Button
            label="Next: Places"
            iconRight="arrow-forward"
            size="lg"
            inline={!compact}
            loading={advancing}
            disabled={advancing}
            onPress={() => void openPlaces()}
          />
          <Text style={styles.footerNote}>
            {kept.size > 0
              ? `${kept.size} of ${items.length} kept`
              : 'You can tune or render any card later.'}
          </Text>
        </View>
      }>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <Container style={[styles.container, desktop && { paddingLeft: SIDEBAR_INSET }]}>
          <StepSidebar current="Cast" />

          <View style={[styles.heading, compact && styles.headingCompact]}>
            <View style={styles.headingCopy}>
              <Text style={styles.title}>Meet the cast</Text>
              <Text style={styles.subtitle}>
                The whole set, at a useful size. Select a card to inspect its visual rules.
              </Text>
            </View>
            <Text style={styles.readout}>
              {progress.done}/{progress.total} sheets ready
            </Text>
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="warning-outline" size={15} color={theme.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={[styles.castGrid, compact && styles.castGridCompact]}>
            {items.map((selection) => {
              const key = keyFor(selection);
              return (
                <CastCard
                  key={key}
                  selection={selection}
                  selected={key === keyFor(selected)}
                  kept={kept.has(key)}
                  compact={compact}
                  onSelect={() => {
                    tap('light');
                    setSelectedKey(key);
                  }}
                  onKeep={() => toggleKeep(selection)}
                  onRender={() => void generate(selection)}
                />
              );
            })}
          </View>

          <View style={[styles.detailPanel, compact && styles.detailPanelCompact]}>
            <View style={[styles.selectionPanel, compact && styles.selectionPanelCompact]}>
              <Text style={styles.eyebrow}>SELECTED · {selected.item.name.toUpperCase()}</Text>
              <View style={styles.previewRow}>
                {selected.item.imageUri ? (
                  <Image
                    source={{ uri: selected.item.imageUri }}
                    resizeMode="contain"
                    style={styles.detailImage}
                    accessibilityLabel={`${selected.item.name} reference sheet`}
                  />
                ) : (
                  <PatternPreview status={selected.item.imageStatus} />
                )}
              </View>
              <Text style={styles.sourceNote}>
                {selected.kind === 'person' ? 'front · three-quarter · detail' : 'primary · reverse'}
              </Text>
            </View>

            <View style={[styles.attributesPanel, compact && styles.attributesPanelCompact]}>
              <Text style={styles.eyebrow}>ATTRIBUTES</Text>
              <Text style={styles.detailTitle}>{selected.item.name}</Text>
              {'role' in selected.item ? (
                <Text style={styles.role}>{selected.item.role}</Text>
              ) : null}
              <View style={styles.attributeChips}>
                {attributesFor(selected.item.look).map((attribute) => (
                  <View key={attribute} style={styles.attributeChip}>
                    <Text style={styles.attributeText}>{attribute}</Text>
                  </View>
                ))}
              </View>
              <Text style={styles.lookText}>{selected.item.look}</Text>
              <View style={styles.panelActions}>
                <Button
                  label={kept.has(keyFor(selected)) ? 'Kept' : `Keep ${selected.item.name}`}
                  size="sm"
                  inline
                  onPress={() => toggleKeep(selected)}
                />
                <Button
                  label="Tune details"
                  size="sm"
                  variant="secondary"
                  inline
                  onPress={() => setEditing(selected)}
                />
              </View>
            </View>

            <View style={[styles.biblePanel, compact && styles.biblePanelCompact]}>
              <Text style={styles.eyebrow}>VISUAL BIBLE</Text>
              <View style={styles.bibleMeta}>
                <BibleTag label={project.style} />
                <BibleTag label={`${project.durationSec}s`} />
                <BibleTag label="9:16 vertical" />
              </View>
              <Text style={styles.bibleText}>
                {project.styleNotes ||
                  `${project.style} treatment with a consistent palette, lighting direction, lens language, and material finish across every sheet.`}
              </Text>
              <View style={styles.bibleRule} />
              <Text style={styles.bibleCaption}>
                Shared by cast, places, action, and every final scene.
              </Text>
            </View>
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

function CastCard({
  selection,
  selected,
  kept,
  compact,
  onSelect,
  onKeep,
  onRender,
}: {
  selection: CastSelection;
  selected: boolean;
  kept: boolean;
  compact: boolean;
  onSelect: () => void;
  onKeep: () => void;
  onRender: () => void;
}) {
  const { item } = selection;

  return (
    <View
      style={[
        styles.castCard,
        compact && styles.castCardCompact,
        selected && styles.castCardSelected,
      ]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected }}
        accessibilityLabel={`Select ${item.name}`}
        onPress={onSelect}
        style={({ pressed }) => pressed && styles.pressed}>
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
            <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.cardKind} numberOfLines={1}>
              {'role' in item ? item.role : 'object'}
            </Text>
          </View>
          <Text style={styles.cardLook} numberOfLines={2}>{item.look}</Text>
          {item.imageError ? <Text style={styles.cardError} numberOfLines={1}>{item.imageError}</Text> : null}
        </View>
      </Pressable>
      <View style={styles.cardActions}>
        <MiniAction label={kept ? 'Kept' : 'Keep'} primary={!kept} onPress={onKeep} />
        <MiniAction
          label={item.imageStatus === 'generating' ? 'Drawing…' : item.imageUri ? 'Redo' : 'Render'}
          disabled={item.imageStatus === 'generating'}
          onPress={onRender}
        />
      </View>
    </View>
  );
}

function PatternPreview({ status }: { status: Person['imageStatus'] }) {
  return (
    <View style={styles.pattern}>
      {Array.from({ length: 12 }).map((_, index) => (
        <View key={index} style={[styles.patternStripe, { left: index * 33 - 80 }]} />
      ))}
      <View style={styles.patternLabel}>
        {status === 'generating' ? (
          <ActivityIndicator size="small" color={theme.info} />
        ) : (
          <Ionicons name="image-outline" size={18} color={theme.textTertiary} />
        )}
        <Text style={styles.patternText}>
          {status === 'generating' ? 'drawing now…' : 'ready to render'}
        </Text>
      </View>
    </View>
  );
}

function MiniAction({
  label,
  primary,
  disabled,
  onPress,
}: {
  label: string;
  primary?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={(event) => {
        event.stopPropagation();
        onPress();
      }}
      style={({ pressed }) => [
        styles.miniAction,
        primary && styles.miniActionPrimary,
        disabled && styles.miniActionDisabled,
        pressed && styles.pressed,
      ]}>
      <Text style={[styles.miniActionText, primary && styles.miniActionTextPrimary]}>{label}</Text>
    </Pressable>
  );
}

function BibleTag({ label }: { label: string }) {
  return (
    <View style={styles.bibleTag}>
      <Text style={styles.bibleTagText}>{label}</Text>
    </View>
  );
}

function attributesFor(look: string) {
  const attributes = [...new Set(look
    .split(/[,;.]|\band\b/i)
    .map((part) => part.trim())
    .filter((part) => part.length >= 3 && part.length <= 30)
    .slice(0, 5))];
  return attributes.length > 0 ? attributes : ['consistent silhouette', 'locked palette'];
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: {
    paddingHorizontal: theme.space.xl,
    paddingTop: theme.space.sm,
    paddingBottom: theme.space.xxxl,
  },
  container: { maxWidth: 1120, gap: theme.space.xl },
  heading: { flexDirection: 'row', alignItems: 'flex-end', gap: theme.space.xl },
  headingCompact: { flexDirection: 'column', alignItems: 'flex-start' },
  headingCopy: { flex: 1, gap: 5 },
  title: {
    color: theme.text,
    fontFamily: theme.font.sans,
    fontSize: 29,
    fontWeight: '800',
    letterSpacing: -0.8,
    lineHeight: 34,
  },
  subtitle: {
    maxWidth: 680,
    color: theme.textSecondary,
    fontFamily: theme.font.sans,
    fontSize: 14,
    lineHeight: 21,
  },
  readout: { color: theme.textTertiary, fontFamily: theme.font.mono, fontSize: 11 },
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
    ...Platform.select({ web: { cursor: 'pointer' }, default: {} }),
  },
  castCardCompact: { width: '100%', minWidth: 0 },
  castCardSelected: {
    borderColor: theme.accent,
    borderWidth: 1.5,
    ...Platform.select({
      web: { boxShadow: `0 0 0 3px ${theme.accentSoft}` },
      default: { shadowColor: theme.accent, shadowOpacity: 0.14, shadowRadius: 8 },
    }),
  },
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
  miniAction: {
    flex: 1,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    borderColor: theme.border,
    borderWidth: 1,
    borderRadius: 7,
    backgroundColor: theme.bgElevated,
  },
  miniActionPrimary: { backgroundColor: theme.accent, borderColor: theme.accent },
  miniActionDisabled: { opacity: 0.45 },
  miniActionText: {
    color: theme.textSecondary,
    fontFamily: theme.font.sans,
    fontSize: 12,
    fontWeight: '600',
  },
  miniActionTextPrimary: { color: theme.surface },
  detailPanel: {
    minHeight: 238,
    flexDirection: 'row',
    overflow: 'hidden',
    backgroundColor: theme.surface,
    borderColor: theme.border,
    borderWidth: 1,
    borderRadius: theme.radius.md,
  },
  detailPanelCompact: { flexDirection: 'column' },
  selectionPanel: {
    width: 290,
    padding: theme.space.lg,
    gap: theme.space.md,
    borderRightColor: theme.border,
    borderRightWidth: 1,
  },
  selectionPanelCompact: {
    width: '100%',
    borderRightWidth: 0,
    borderBottomColor: theme.border,
    borderBottomWidth: 1,
  },
  eyebrow: {
    color: theme.textTertiary,
    fontFamily: theme.font.mono,
    fontSize: 10,
    letterSpacing: 1,
  },
  previewRow: { flex: 1, minHeight: 138, overflow: 'hidden', borderRadius: theme.radius.sm },
  detailImage: { width: '100%', height: '100%', backgroundColor: theme.surfaceMuted },
  sourceNote: { color: theme.textTertiary, fontFamily: theme.font.mono, fontSize: 10.5 },
  attributesPanel: {
    flex: 1,
    minWidth: 250,
    padding: theme.space.lg,
    gap: theme.space.md,
    borderRightColor: theme.border,
    borderRightWidth: 1,
  },
  attributesPanelCompact: {
    minWidth: 0,
    borderRightWidth: 0,
    borderBottomColor: theme.border,
    borderBottomWidth: 1,
  },
  detailTitle: {
    color: theme.text,
    fontFamily: theme.font.sans,
    fontSize: 21,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  role: { marginTop: -8, color: theme.textTertiary, fontFamily: theme.font.mono, fontSize: 11 },
  attributeChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  attributeChip: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: theme.borderStrong,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.bgElevated,
  },
  attributeText: { color: theme.textSecondary, fontFamily: theme.font.sans, fontSize: 12.5 },
  lookText: {
    color: theme.textSecondary,
    fontFamily: theme.font.sans,
    fontSize: 13,
    lineHeight: 19,
  },
  panelActions: { marginTop: 'auto', flexDirection: 'row', flexWrap: 'wrap', gap: theme.space.sm },
  biblePanel: { width: 260, padding: theme.space.lg, gap: theme.space.md, backgroundColor: theme.surfaceMuted },
  biblePanelCompact: { width: '100%' },
  bibleMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  bibleTag: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surface,
  },
  bibleTagText: { color: theme.textSecondary, fontFamily: theme.font.mono, fontSize: 10.5 },
  bibleText: { color: theme.textSecondary, fontFamily: theme.font.sans, fontSize: 13, lineHeight: 19 },
  bibleRule: { height: 1, backgroundColor: theme.border },
  bibleCaption: { color: theme.textTertiary, fontFamily: theme.font.sans, fontSize: 11.5, lineHeight: 17 },
  pattern: { flex: 1, overflow: 'hidden', backgroundColor: theme.surfaceMuted },
  patternStripe: {
    position: 'absolute',
    top: -70,
    width: 14,
    height: 280,
    backgroundColor: theme.accentSoft,
    transform: [{ rotate: '45deg' }],
  },
  patternLabel: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 },
  patternText: { color: theme.textTertiary, fontFamily: theme.font.mono, fontSize: 10 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: theme.space.lg },
  footerCompact: { flexDirection: 'column', alignItems: 'stretch' },
  footerNote: { color: theme.textSecondary, fontFamily: theme.font.sans, fontSize: 13 },
  pressed: { opacity: 0.65 },
});

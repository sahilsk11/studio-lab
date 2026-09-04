import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/constants/theme';
import { useProject } from '@/context/ProjectContext';
import { useSettings } from '@/context/SettingsContext';
import { modSymbol, projectListMeta, projectTriggerMeta } from '@/lib/chrome';
import { furthestStepIndex, stepRoute } from '@/lib/project';
import type { ProjectSummary } from '@/types/project';
import { STEPS } from '@/types/project';

import { Button } from './Button';
import { ProjectThumb } from './ProjectThumb';
import { SidebarFooter } from './AuthControls';
import { Eyebrow } from './Typography';
import { useDesktopLayout } from './layout';

export function ProjectPicker({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const { project, projects, activeProjectId, selectProject, startFresh } = useProject();
  const { tap } = useSettings();
  const desktop = useDesktopLayout();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<View>(null);

  const label = project.title.trim() || 'New project';
  const named = projects.filter((item) => item.title.trim());
  const updatedAt = named.find((item) => item.id === activeProjectId)?.updatedAt;
  const recent = named.slice(0, 6);
  const showing = open && !desktop ? named : recent;
  const shortcut = modSymbol();

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const doc = globalThis.document;
    if (!doc) return;

    const onPointer = (event: Event) => {
      if (!open || !desktop) return;
      const target = event.target as Node | null;
      const node = rootRef.current as unknown as Node | null;
      if (node && target && !node.contains(target)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }
      const mod = event.metaKey || event.ctrlKey;
      if (mod && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((value) => !value);
      }
      if (mod && event.key.toLowerCase() === 'n') {
        event.preventDefault();
        createNew();
      }
      if (event.key === 'Escape') setOpen(false);
    };

    doc.addEventListener('mousedown', onPointer);
    doc.addEventListener('keydown', onKey);
    return () => {
      doc.removeEventListener('mousedown', onPointer);
      doc.removeEventListener('keydown', onKey);
    };
  }, [open, desktop]);

  async function choose(id: string) {
    tap('light');
    setOpen(false);
    if (id === activeProjectId) return;
    const next = await selectProject(id);
    const step = STEPS[furthestStepIndex(next)];
    router.replace(stepRoute(step) as never);
  }

  function createNew() {
    tap('light');
    setOpen(false);
    startFresh();
    router.replace('/');
  }

  const trigger = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Project: ${label}`}
      accessibilityState={{ expanded: open }}
      onPress={() => {
        tap('light');
        setOpen((value) => !value);
      }}
      style={({ pressed }) => [
        styles.trigger,
        open && desktop && styles.triggerOpen,
        pressed && styles.pressed,
      ]}>
      <ProjectThumb id={project.id || label} size={compact ? 28 : 34} />
      <View style={styles.triggerCopy}>
        <Text numberOfLines={1} style={styles.triggerTitle}>
          {label}
        </Text>
        {!compact ? (
          <Text numberOfLines={1} style={styles.triggerMeta}>
            {projectTriggerMeta(project, updatedAt)}
          </Text>
        ) : (
          <Text numberOfLines={1} style={styles.triggerMeta}>
            {project.durationSec}s · 9:16
          </Text>
        )}
      </View>
      <Ionicons
        name={open ? 'chevron-up' : 'chevron-down'}
        size={14}
        color={open ? theme.accent : theme.textTertiary}
      />
    </Pressable>
  );

  const list = (
    <ProjectMenu
      items={showing}
      activeId={activeProjectId}
      total={named.length}
      shortcut={shortcut}
      sheet={!desktop}
      onChoose={(id) => void choose(id)}
      onCreate={createNew}
      onClose={() => setOpen(false)}
    />
  );

  if (!desktop) {
    return (
      <>
        {trigger}
        <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
          <View style={styles.sheetRoot}>
            <Pressable style={styles.sheetDim} onPress={() => setOpen(false)} />
            <View style={styles.sheet}>
              <View style={styles.handle} />
              {list}
              <View style={styles.sheetFooter}>
                <Button label="+ New project" variant="ink" onPress={createNew} />
                <SidebarFooter labeledSettings />
              </View>
            </View>
          </View>
        </Modal>
      </>
    );
  }

  return (
    <View ref={rootRef} style={styles.root}>
      {trigger}
      {open ? <View style={styles.menu}>{list}</View> : null}
    </View>
  );
}

function ProjectMenu({
  items,
  activeId,
  total,
  shortcut,
  sheet,
  onChoose,
  onCreate,
  onClose,
}: {
  items: ProjectSummary[];
  activeId: string | null;
  total: number;
  shortcut: string;
  sheet: boolean;
  onChoose: (id: string) => void;
  onCreate: () => void;
  onClose: () => void;
}) {
  const { project } = useProject();

  return (
    <View>
      <View style={styles.menuHead}>
        <Eyebrow>{sheet ? 'Projects' : 'Recent'}</Eyebrow>
        {sheet ? (
          <Text style={styles.allLink}>All {total}</Text>
        ) : (
          <Text style={styles.shortcut}>{shortcut}K to search</Text>
        )}
      </View>

      {items.map((item) => {
        const selected = item.id === activeId;
        return (
          <Pressable
            key={item.id}
            accessibilityRole="menuitem"
            accessibilityState={{ selected }}
            onPress={() => onChoose(item.id)}
            style={({ pressed }) => [styles.item, selected && styles.itemSelected, pressed && styles.pressed]}>
            <ProjectThumb id={item.id} size={32} />
            <View style={styles.itemCopy}>
              <Text numberOfLines={1} style={[styles.itemTitle, selected && styles.itemTitleSelected]}>
                {item.title}
              </Text>
              <Text numberOfLines={1} style={styles.itemMeta}>
                {projectListMeta(item, project)}
              </Text>
            </View>
            {selected ? (
              <Ionicons name="checkmark" size={16} color={theme.accent} />
            ) : item.id === project.id && project.videoReady ? (
              <View style={styles.statusDot} />
            ) : null}
          </Pressable>
        );
      })}

      {sheet ? null : (
        <>
          <Pressable
            accessibilityRole="menuitem"
            onPress={onCreate}
            style={({ pressed }) => [styles.item, pressed && styles.pressed]}>
            <View style={styles.plusBox}>
              <Ionicons name="add" size={16} color={theme.textSecondary} />
            </View>
            <Text style={styles.itemTitle}>New project</Text>
            <Text style={styles.shortcut}>{shortcut}N</Text>
          </Pressable>
          <Pressable
            accessibilityRole="menuitem"
            onPress={onClose}
            style={({ pressed }) => [styles.item, pressed && styles.pressed]}>
            <View style={styles.listIcon}>
              <Ionicons name="albums-outline" size={15} color={theme.textSecondary} />
            </View>
            <Text style={styles.itemTitle}>All projects</Text>
            <Text style={styles.count}>{total}</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'relative',
    zIndex: 40,
    width: '100%',
  },
  trigger: {
    width: '100%',
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: theme.radius.md,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    ...theme.shadow.sm,
    ...Platform.select({ web: { cursor: 'pointer' }, default: {} }),
  },
  triggerOpen: {
    borderColor: theme.accent,
  },
  triggerCopy: { flex: 1, minWidth: 0, gap: 2 },
  triggerTitle: {
    color: theme.text,
    fontFamily: theme.font.sans,
    fontSize: 13.5,
    fontWeight: '700',
  },
  triggerMeta: {
    color: theme.textTertiary,
    fontFamily: theme.font.sans,
    fontSize: 11,
  },
  menu: {
    position: 'absolute',
    top: 56,
    left: 0,
    right: 0,
    paddingVertical: 8,
    backgroundColor: theme.surface,
    borderColor: theme.border,
    borderWidth: 1,
    borderRadius: theme.radius.md,
    zIndex: 80,
    elevation: 24,
    ...theme.shadow.lg,
    ...Platform.select({
      web: { position: 'absolute', zIndex: 80 } as object,
      default: {},
    }),
  },
  menuHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 6,
  },
  shortcut: {
    color: theme.textQuaternary,
    fontFamily: theme.font.mono,
    fontSize: 10,
  },
  allLink: {
    color: theme.accentDark,
    fontFamily: theme.font.sans,
    fontSize: 12,
    fontWeight: '600',
  },
  item: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    ...Platform.select({ web: { cursor: 'pointer' }, default: {} }),
  },
  itemSelected: { backgroundColor: theme.accentSoft },
  itemCopy: { flex: 1, minWidth: 0, gap: 1 },
  itemTitle: {
    color: theme.text,
    fontFamily: theme.font.sans,
    fontSize: 13,
    fontWeight: '600',
  },
  itemTitleSelected: { color: theme.text },
  itemMeta: {
    color: theme.textTertiary,
    fontFamily: theme.font.sans,
    fontSize: 11,
  },
  plusBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: theme.borderStrong,
  },
  listIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  count: {
    color: theme.textTertiary,
    fontFamily: theme.font.sans,
    fontSize: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.success,
  },
  sheetRoot: { flex: 1, justifyContent: 'flex-end' },
  sheetDim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(48,44,39,0.46)',
  },
  sheet: {
    backgroundColor: theme.surface,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    paddingHorizontal: theme.space.md,
    paddingBottom: theme.space.lg,
    gap: theme.space.sm,
    ...theme.shadow.xl,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.borderStrong,
    marginTop: 10,
    marginBottom: 6,
  },
  sheetFooter: {
    gap: theme.space.md,
    paddingTop: theme.space.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.border,
  },
  pressed: { opacity: 0.72 },
});

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/constants/theme';
import { useProject } from '@/context/ProjectContext';
import { useSettings } from '@/context/SettingsContext';
import { furthestStepIndex, stepRoute } from '@/lib/project';
import { STEPS } from '@/types/project';

export function ProjectPicker() {
  const router = useRouter();
  const { project, projects, activeProjectId, testMode, selectProject, startFresh } = useProject();
  const { tap } = useSettings();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<View>(null);

  const label = project.title.trim() || (activeProjectId ? 'Untitled reel' : 'New project');
  const named = projects.filter((item) => item.title.trim());

  useEffect(() => {
    if (Platform.OS !== 'web' || !open) return;
    const doc = globalThis.document;
    if (!doc) return;
    const onPointer = (event: Event) => {
      const target = event.target as Node | null;
      const node = rootRef.current as unknown as Node | null;
      if (node && target && !node.contains(target)) setOpen(false);
    };
    doc.addEventListener('mousedown', onPointer);
    return () => doc.removeEventListener('mousedown', onPointer);
  }, [open]);

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

  return (
    <View ref={rootRef} style={styles.root}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Project: ${label}`}
        accessibilityState={{ expanded: open }}
        onPress={() => {
          tap('light');
          setOpen((value) => !value);
        }}
        style={({ pressed }) => [styles.trigger, pressed && styles.pressed]}>
        <Text numberOfLines={1} style={styles.triggerLabel}>
          {label}
        </Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={12} color={theme.textTertiary} />
      </Pressable>

      {open ? (
        <View style={styles.menu} accessibilityRole="menu">
          {named.map((item) => {
            const selected = item.id === activeProjectId;
            return (
              <Pressable
                key={item.id}
                accessibilityRole="menuitem"
                accessibilityState={{ selected }}
                onPress={() => void choose(item.id)}
                style={({ pressed }) => [
                  styles.item,
                  selected && styles.itemSelected,
                  pressed && styles.pressed,
                ]}>
                <Text numberOfLines={1} style={[styles.itemLabel, selected && styles.itemLabelSelected]}>
                  {item.title}
                </Text>
              </Pressable>
            );
          })}
          {named.length > 0 ? <View style={styles.rule} /> : null}
          <Pressable
            accessibilityRole="menuitem"
            onPress={createNew}
            style={({ pressed }) => [styles.item, pressed && styles.pressed]}>
            <Text style={styles.createLabel}>{testMode ? 'New demo' : 'Create new'}</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'relative',
    zIndex: 20,
    maxWidth: 280,
    flexShrink: 1,
  },
  trigger: {
    minHeight: 32,
    maxWidth: 280,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.borderStrong,
    backgroundColor: theme.bgElevated,
    ...Platform.select({ web: { cursor: 'pointer' }, default: {} }),
  },
  triggerLabel: {
    flexShrink: 1,
    color: theme.text,
    fontFamily: theme.font.sans,
    fontSize: 13,
    fontWeight: '600',
  },
  menu: {
    position: 'absolute',
    top: 38,
    left: 0,
    minWidth: 220,
    maxWidth: 320,
    paddingVertical: 6,
    backgroundColor: theme.surface,
    borderColor: theme.borderStrong,
    borderWidth: 1,
    borderRadius: theme.radius.sm,
    zIndex: 30,
    ...Platform.select({
      web: { boxShadow: '0 8px 24px rgba(48,44,39,0.12)' },
      default: theme.shadow.sm,
    }),
  },
  item: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    ...Platform.select({ web: { cursor: 'pointer' }, default: {} }),
  },
  itemSelected: { backgroundColor: theme.accentSoft },
  itemLabel: {
    color: theme.textSecondary,
    fontFamily: theme.font.sans,
    fontSize: 13,
  },
  itemLabelSelected: { color: theme.text, fontWeight: '600' },
  createLabel: {
    color: theme.accentDark,
    fontFamily: theme.font.sans,
    fontSize: 13,
    fontWeight: '600',
  },
  rule: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.border,
    marginVertical: 4,
  },
  pressed: { opacity: 0.7 },
});

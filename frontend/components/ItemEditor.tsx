import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { Button, Caption, Field, GlassCard, TextField, Title } from '@/components/ui';
import { theme } from '@/constants/theme';
import { confirm } from '@/lib/confirm';
import type { Frame, ImageKind, Person, Scene, Thing } from '@/types/project';

export type EditorTarget =
  | { kind: 'person'; item: Person }
  | { kind: 'thing'; item: Thing }
  | { kind: 'scene'; item: Scene }
  | { kind: 'frame'; item: Frame };

export type ItemFields = {
  name?: string;
  role?: string;
  look?: string;
  title?: string;
  action?: string;
  camera?: string;
};

function draftFrom(target: EditorTarget): ItemFields {
  switch (target.kind) {
    case 'person':
      return { name: target.item.name, role: target.item.role, look: target.item.look };
    case 'thing':
      return { name: target.item.name, look: target.item.look };
    case 'scene':
      return { title: target.item.title, look: target.item.look };
    case 'frame':
      return { action: target.item.action, camera: target.item.camera };
  }
}

function heading(kind: ImageKind): string {
  switch (kind) {
    case 'person':
      return 'Edit person';
    case 'thing':
      return 'Edit thing';
    case 'scene':
      return 'Edit place';
    case 'frame':
      return 'Edit moment';
  }
}

function deleteCopy(kind: ImageKind): { title: string; message: string } {
  switch (kind) {
    case 'person':
      return {
        title: 'Remove this person?',
        message: 'They come off the cast. Places and moments that cite them will drop the reference.',
      };
    case 'thing':
      return {
        title: 'Remove this thing?',
        message:
          'It comes off the cast. Use this for one-off props that belong in a moment, not a locked sheet.',
      };
    case 'scene':
      return {
        title: 'Remove this place?',
        message: 'This deletes the location and any moments that use it.',
      };
    case 'frame':
      return {
        title: 'Remove this moment?',
        message: 'This still comes out of the timeline.',
      };
  }
}

export function ItemEditor({
  target,
  onClose,
  onSave,
  onDelete,
  onRender,
}: {
  target: EditorTarget | null;
  onClose: () => void;
  onSave: (kind: ImageKind, id: string, fields: ItemFields) => Promise<void>;
  onDelete: (kind: ImageKind, id: string) => Promise<void>;
  onRender?: (kind: ImageKind, id: string) => Promise<void>;
}) {
  const [draft, setDraft] = useState<ItemFields>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (target) setDraft(draftFrom(target));
  }, [target]);

  if (!target) return null;

  const id = target.item.id;
  const kind = target.kind;
  const set = (key: keyof ItemFields, value: string) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  async function handleSave(render: boolean) {
    setSaving(true);
    try {
      await onSave(kind, id, draft);
      onClose();
      if (render) void onRender?.(kind, id);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    const copy = deleteCopy(kind);
    const ok = await confirm({ ...copy, confirmLabel: 'Remove', destructive: true });
    if (!ok) return;
    setSaving(true);
    try {
      await onDelete(kind, id);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close editor" />
        <GlassCard tone="raised" radius={theme.radius.lg} style={styles.sheet}>
          <View style={styles.body}>
            <Title>{heading(target.kind)}</Title>
            <Caption>
              Change the prompt, then Save & re-render to generate a new still.
            </Caption>

            {target.kind === 'person' ? (
              <>
                <Field label="Name">
                  <TextField value={draft.name ?? ''} onChangeText={(v) => set('name', v)} />
                </Field>
                <Field label="Role">
                  <TextField value={draft.role ?? ''} onChangeText={(v) => set('role', v)} />
                </Field>
                <Field label="Look" hint="This is the image prompt">
                  <TextField
                    multiline
                    minHeight={120}
                    value={draft.look ?? ''}
                    onChangeText={(v) => set('look', v)}
                  />
                </Field>
              </>
            ) : null}

            {target.kind === 'thing' ? (
              <>
                <Field label="Name">
                  <TextField value={draft.name ?? ''} onChangeText={(v) => set('name', v)} />
                </Field>
                <Field label="Look" hint="This is the image prompt">
                  <TextField
                    multiline
                    minHeight={120}
                    value={draft.look ?? ''}
                    onChangeText={(v) => set('look', v)}
                  />
                </Field>
              </>
            ) : null}

            {target.kind === 'scene' ? (
              <>
                <Field label="Title">
                  <TextField value={draft.title ?? ''} onChangeText={(v) => set('title', v)} />
                </Field>
                <Field label="Look" hint="This is the image prompt">
                  <TextField
                    multiline
                    minHeight={120}
                    value={draft.look ?? ''}
                    onChangeText={(v) => set('look', v)}
                  />
                </Field>
              </>
            ) : null}

            {target.kind === 'frame' ? (
              <>
                <Field label="Action" hint="This is the image prompt">
                  <TextField
                    multiline
                    minHeight={120}
                    value={draft.action ?? ''}
                    onChangeText={(v) => set('action', v)}
                  />
                </Field>
                <Field label="Camera">
                  <TextField
                    multiline
                    minHeight={80}
                    value={draft.camera ?? ''}
                    onChangeText={(v) => set('camera', v)}
                  />
                </Field>
              </>
            ) : null}

            {onRender ? (
              <Button
                label="Save & re-render"
                icon="sparkles"
                size="md"
                loading={saving}
                onPress={() => void handleSave(true)}
              />
            ) : null}
            <Button
              label="Save"
              icon="checkmark"
              variant={onRender ? 'ghost' : 'primary'}
              size="md"
              disabled={saving}
              loading={!onRender && saving}
              onPress={() => void handleSave(false)}
            />
            <View style={styles.row}>
              <Button
                label="Remove"
                variant="danger"
                size="sm"
                disabled={saving}
                onPress={() => void handleDelete()}
                style={styles.flex}
              />
              <Button
                label="Cancel"
                variant="ghost"
                size="sm"
                disabled={saving}
                onPress={onClose}
                style={styles.flex}
              />
            </View>
          </View>
        </GlassCard>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(48, 44, 39, 0.34)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.space.xl,
  },
  sheet: {
    width: '100%',
    maxWidth: 460,
    zIndex: 1,
  },
  body: {
    padding: theme.space.xl,
    gap: theme.space.lg,
  },
  row: {
    flexDirection: 'row',
    gap: theme.space.md,
  },
  flex: {
    flex: 1,
  },
});

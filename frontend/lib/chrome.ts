import { furthestStepIndex } from '@/lib/project';
import { STEPS, type Project, type ProjectSummary, type Step } from '@/types/project';

export const STEP_SHORT: Record<Step, string> = {
  Idea: 'Idea',
  'Clarify project': 'Clarify',
  Cast: 'Cast',
  Places: 'Places',
  Action: 'Action',
  Scenes: 'Scenes',
  Watch: 'Watch',
};

export function stepShort(step: Step): string {
  return STEP_SHORT[step];
}

export function adjacentStep(step: Step, dir: -1 | 1): Step | null {
  return STEPS[STEPS.indexOf(step) + dir] ?? null;
}

export function formatRelativeTime(iso?: string): string {
  if (!iso) return 'now';
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms)) return 'now';
  const minutes = Math.max(0, Math.round(ms / 60_000));
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d`;
  return `${Math.round(days / 7)}w`;
}

function agoLabel(iso?: string): string {
  const value = formatRelativeTime(iso);
  if (value === 'now') return 'just now';
  if (value === 'yesterday') return 'yesterday';
  if (value.endsWith('m') || value.endsWith('h') || value.endsWith('d') || value.endsWith('w')) {
    return `${value} ago`;
  }
  return value;
}

export function projectTriggerMeta(project: Project, updatedAt?: string): string {
  const edited = formatRelativeTime(updatedAt);
  const editedLabel =
    edited === 'now' ? 'edited now' : edited === 'yesterday' ? 'edited yesterday' : `edited ${edited}`;
  return `${project.durationSec}s · 9:16 · ${editedLabel}`;
}

export function projectListMeta(summary: ProjectSummary, active?: Project): string {
  const when = agoLabel(summary.updatedAt);
  if (active?.id === summary.id) {
    if (active.videoReady) return `rendered · ${when}`;
    const step = STEPS[furthestStepIndex(active)];
    return `step ${STEPS.indexOf(step) + 1} · ${stepShort(step).toLowerCase()} · ${when}`;
  }
  return `${summary.durationSec}s · ${when}`;
}

export function stepDetail(project: Project, step: Step, current: Step): string | undefined {
  const index = STEPS.indexOf(step);
  const currentIndex = STEPS.indexOf(current);
  const done = index < currentIndex;
  const isCurrent = step === current;
  const castCount = project.people.length + project.things.length;

  switch (step) {
    case 'Idea':
      return done ? 'edit' : undefined;
    case 'Clarify project':
      return done ? 'answered' : undefined;
    case 'Cast':
      if (!castCount) return undefined;
      return done ? `${castCount} kept` : isCurrent ? `${castCount}` : undefined;
    case 'Places': {
      if (!project.scenes.length) return undefined;
      const left = project.scenes.filter((scene) => scene.imageStatus !== 'done' || scene.imageStale).length;
      if (isCurrent && left > 0) return `${left} left`;
      return done ? String(project.scenes.length) : undefined;
    }
    case 'Action':
      return project.frames.length && (done || isCurrent) ? `${project.frames.length} beats` : undefined;
    case 'Scenes': {
      if (!project.frames.length) return undefined;
      const ready = project.frames.filter((frame) => frame.imageStatus === 'done' && !frame.imageStale).length;
      return done || isCurrent ? `${ready}/${project.frames.length}` : undefined;
    }
    case 'Watch':
      return project.videoReady ? 'ready' : undefined;
  }
}

const THUMBS: [string, string][] = [
  ['#F6C9C0', '#E07A5F'],
  ['#C9D9E8', '#7BA3C4'],
  ['#D5D6A8', '#8A8A4A'],
  ['#DCC8E4', '#8A6AA3'],
  ['#C8DDD0', '#5A9A7A'],
];

export function thumbColors(id: string): [string, string] {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return THUMBS[hash % THUMBS.length];
}

export function isMacPlatform(): boolean {
  return typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform);
}

export function modSymbol(): string {
  return isMacPlatform() ? '⌘' : 'Ctrl';
}

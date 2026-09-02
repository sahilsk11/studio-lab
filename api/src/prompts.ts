import { IMAGE_ASPECT_RATIO, SHEET_ASPECT_RATIO } from './config.js';
import type { ImageSubject, Person, Scene, Thing } from './types.js';

/** Hard medium lock so a style chip is not just the word "Anime" next to a photoreal look. */
const STYLE_LOCK: Record<string, string> = {
  Cinematic:
    'Cinematic live-action film still: naturalistic lighting, shallow depth of field, production-design realism. Not illustration, not 3D animation.',
  Documentary:
    'Observational documentary still: available light, handheld naturalism, unstaged. Not stylized illustration, not cinematic polish.',
  Anime:
    '2D Japanese anime: hand-drawn cel animation, clean linework, flat or softly painted color, expressive faces. Not photoreal, not live-action, not 3D CGI, not Pixar.',
  Minimal:
    'Minimal graphic still: sparse shapes, limited palette, poster-like composition. Not photoreal, not cinematic live-action.',
  Retro:
    'Vintage analog film: grain, period color science, slightly worn. Not modern digital cleanliness, not 3D animation.',
};

export type WorldInput = {
  idea: string;
  style: string;
  styleNotes?: string;
  durationSec?: number;
  people?: Pick<Person, 'id' | 'name' | 'role' | 'look'>[];
  things?: Pick<Thing, 'id' | 'name' | 'look'>[];
  scenes?: Pick<Scene, 'id' | 'title' | 'look'>[];
};

export function styleDirective(style: string): string {
  const lock = STYLE_LOCK[style];
  return lock ? `${style}. ${lock}` : `${style} style.`;
}

export function formatPeople(people: Pick<Person, 'id' | 'name' | 'role' | 'look'>[]): string {
  if (!people.length) return 'People: (none)';
  return `People:\n${people.map((p) => `- ${p.id}: ${p.name} (${p.role}) — ${p.look}`).join('\n')}`;
}

export function formatThings(things: Pick<Thing, 'id' | 'name' | 'look'>[]): string {
  if (!things.length) return 'Things: (none)';
  return `Things:\n${things.map((t) => `- ${t.id}: ${t.name} — ${t.look}`).join('\n')}`;
}

export function formatScenes(scenes: Pick<Scene, 'id' | 'title' | 'look'>[]): string {
  if (!scenes.length) return 'Scenes: (none)';
  return `Scenes:\n${scenes.map((s) => `- ${s.id}: ${s.title} — ${s.look}`).join('\n')}`;
}

/** Shared universe block for every LLM step and every image call. */
export function worldBible(input: WorldInput): string {
  const lines = [`Idea: ${input.idea}`, `Style: ${styleDirective(input.style)}`];
  const notes = input.styleNotes?.trim();
  if (notes) lines.push(`Style bible: ${notes}`);
  if (input.durationSec != null) lines.push(`Duration: ${input.durationSec} seconds`);
  if (input.people) lines.push(formatPeople(input.people));
  if (input.things) lines.push(formatThings(input.things));
  if (input.scenes) lines.push(formatScenes(input.scenes));
  return lines.join('\n\n');
}

export const CAST_SYSTEM = `You are a video art director. Extract the recurring PEOPLE and THINGS that need locked looks for a vertical video. Do not invent scenes, action, or camera. People can be empty. Things can be empty. Ids must be unique kebab-case slugs. views is always exactly two entries — you choose what two angles of the object to show on a reference sheet.

styleNotes is a shared visual bible for THIS idea (2–4 sentences): the medium (what the pictures physically are), palette, lighting, and design language that EVERY person and object must share. Be explicit about what this is not (for Anime: not photoreal, not 3D CGI). Do not describe a single character; describe the universe.

look describes how this subject appears IN that medium. Materials and clothing are interpreted through the style — an espresso machine in Anime is a drawn anime prop, not a photograph. All people and things must belong to one show.

Only lock PEOPLE and THINGS that RECUR across the clip and need a consistent design. Skip one-off props, garnish, a single foam heart, a cup that appears in one shot — those belong in a keyframe action, not the cast. Prefer fewer, load-bearing subjects.`;

export const SCENES_SYSTEM = `You are a video art director. Output locations and settings only — the establishing look of each PLACE, empty of staged action. Scene count is dynamic; 1 is valid. peopleIds and thingIds must be a subset of the provided ids. Do not write beats or camera moves. Describe each place as it appears in the given style and style bible, consistent with the locked people and things.`;

export function framesSystem(range: string, durationSec: number): string {
  return `You are a video director. Output chronological KEYFRAMES for the whole clip — the important stills, NOT start/end pairs per cut. order is 1-based and increasing. sceneId must be one of the provided scene ids. peopleIds and thingIds must be a subset of the provided ids. Aim for roughly ${range} frames for a ${durationSec}s clip. Keep action and camera consistent with the locked style, people, things, and places.`;
}

const SAME_UNIVERSE =
  'This is one film. Every person, object, and place shares this medium and design language. Interpret materials (chrome, ceramic, fabric, skin) through the style — never switch to photoreal or 3D because the subject is an object or a close-up. Only render the subject named in THIS SHEET; the roster is world context so this drawing belongs to the same film.';

export function assembleImagePrompt(input: {
  idea: string;
  style: string;
  styleNotes?: string;
  people: Pick<Person, 'id' | 'name' | 'role' | 'look'>[];
  things: Pick<Thing, 'id' | 'name' | 'look'>[];
  scenes?: Pick<Scene, 'id' | 'title' | 'look'>[];
  subject: ImageSubject;
  hasRefs?: boolean;
}): { prompt: string; aspectRatio: string } {
  const bible = worldBible({
    idea: input.idea,
    style: input.style,
    styleNotes: input.styleNotes,
    people: input.people,
    things: input.things,
    scenes: input.scenes,
  });
  const refs = input.hasRefs
    ? 'Attached images are the locked sheets from earlier in this film. Match their medium, palette, character design, and object design exactly. Do not invent a new style.'
    : '';
  const head = [bible, SAME_UNIVERSE, refs].filter(Boolean).join('\n\n');
  const { subject } = input;

  switch (subject.type) {
    case 'person':
      return {
        aspectRatio: SHEET_ASPECT_RATIO,
        prompt: [
          head,
          `THIS SHEET: character reference sheet of ${subject.name} (${subject.role}), three equal vertical panels, same character, consistent design, no text, no labels, no watermark, neutral seamless background.`,
          `Left panel: waist-up torso from the front. ${subject.look}`,
          `Center panel: full body seen from behind.`,
          `Right panel: close-up of the face.`,
        ].join('\n'),
      };
    case 'thing': {
      const left = subject.views[0] ?? { label: 'Front', hint: 'hero view' };
      const right = subject.views[1] ?? { label: 'Detail', hint: 'close detail' };
      return {
        aspectRatio: SHEET_ASPECT_RATIO,
        prompt: [
          head,
          `THIS SHEET: object reference sheet of ${subject.name}, two equal vertical panels, same object, consistent design, no text, no labels, no watermark, neutral seamless background.`,
          `Left panel (${left.label}): ${left.hint}. ${subject.look}`,
          `Right panel (${right.label}): ${right.hint}.`,
        ].join('\n'),
      };
    }
    case 'scene':
      return {
        aspectRatio: IMAGE_ASPECT_RATIO,
        prompt: [
          head,
          `THIS SHEET: vertical video frame, 9:16. Establishing shot of ${subject.title}, empty of staged action.`,
          subject.look,
        ].join('\n'),
      };
    case 'frame':
      return {
        aspectRatio: IMAGE_ASPECT_RATIO,
        prompt: [
          head,
          `THIS SHEET: vertical video frame, 9:16, in ${subject.sceneTitle || 'this location'}.`,
          subject.sceneLook ? `Place: ${subject.sceneLook}` : '',
          subject.action,
          `Camera: ${subject.camera}`,
        ]
          .filter(Boolean)
          .join('\n'),
      };
  }
}

export function assembleVideoPrompt(input: {
  idea: string;
  style: string;
  styleNotes?: string;
  people: Pick<Person, 'id' | 'name' | 'role' | 'look'>[];
  things: Pick<Thing, 'id' | 'name' | 'look'>[];
  scenes: Pick<Scene, 'id' | 'title' | 'look'>[];
  frames: { order: number; action: string; camera: string }[];
  durationSec: number;
}): string {
  const beats = [...input.frames]
    .sort((a, b) => a.order - b.order)
    .map((frame, i) => `${i + 1}. ${frame.action} Camera: ${frame.camera}`)
    .join('\n');

  return [
    worldBible({
      idea: input.idea,
      style: input.style,
      styleNotes: input.styleNotes,
      people: input.people,
      things: input.things,
      scenes: input.scenes,
    }),
    `Vertical 9:16 video, ${input.durationSec} seconds, continuous motion, matching audio. Same universe as the attached keyframes.`,
    'Play this sequence in order. Start on the first attached frame and finish on the last. The other attached images are locked keyframes — pass through those compositions rather than inventing new looks or a new medium.',
    beats,
  ].join('\n\n');
}

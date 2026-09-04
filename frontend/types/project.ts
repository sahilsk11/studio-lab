export type ImageStatus = 'pending' | 'generating' | 'done' | 'error';

export type VideoPhase =
  | 'idle'
  | 'queued'
  | 'rendering'
  | 'downloading'
  | 'stitching'
  | 'ready'
  | 'error';

export type ImageFields = {
  imageStatus: ImageStatus;
  imageUri?: string;
  imageCost?: number;
  imageError?: string;
  /** True when the look was edited after the image was generated */
  imageStale?: boolean;
};

export type ThingView = {
  label: string;
  hint: string;
};

export type Person = ImageFields & {
  id: string;
  name: string;
  role: string;
  look: string;
};

export type Thing = ImageFields & {
  id: string;
  name: string;
  look: string;
  views: [ThingView, ThingView];
};

export type Scene = ImageFields & {
  id: string;
  title: string;
  look: string;
  peopleIds: string[];
  thingIds: string[];
};

export type Frame = ImageFields & {
  id: string;
  order: number;
  sceneId: string;
  peopleIds: string[];
  thingIds: string[];
  action: string;
  camera: string;
};

export type ProjectSummary = {
  id: string;
  title: string;
  idea: string;
  style: string;
  durationSec: number;
  updatedAt: string;
};

export type Project = {
  id: string;
  userId: string;
  title: string;
  idea: string;
  style: string;
  /** Shared visual bible for this idea. Injected into every later LLM step and image prompt. */
  styleNotes: string;
  durationSec: number;
  people: Person[];
  things: Thing[];
  scenes: Scene[];
  frames: Frame[];
  videoReady: boolean;
  videoPosterUri?: string;
  videoUri?: string;
  videoError?: string;
  videoPhase?: VideoPhase;
  videoClipIndex?: number;
  videoClipTotal?: number;
  videoStartedAt?: number;
  totalCost: number;
};

export const STYLES = [
  'Grainy film',
  'Flat vector',
  'Anime cel',
  'Claymation',
  'Photoreal',
] as const;
export const DURATIONS = [15, 30, 60] as const;

export const STEPS = [
  'Idea',
  'Clarify project',
  'Cast',
  'Places',
  'Action',
  'Scenes',
  'Watch',
] as const;
export type Step = (typeof STEPS)[number];

export type CastResponse = {
  title: string;
  styleNotes: string;
  people: Pick<Person, 'id' | 'name' | 'role' | 'look'>[];
  things: Pick<Thing, 'id' | 'name' | 'look' | 'views'>[];
  cost: number;
};

export type ScenesResponse = {
  scenes: Pick<Scene, 'id' | 'title' | 'look' | 'peopleIds' | 'thingIds'>[];
  cost: number;
};

export type FramesResponse = {
  frames: Pick<
    Frame,
    'id' | 'order' | 'sceneId' | 'peopleIds' | 'thingIds' | 'action' | 'camera'
  >[];
  cost: number;
};

export type ImageResponse = {
  base64: string;
  mediaType: string;
  cost: number;
};

export type ImageSubject =
  | { type: 'person'; name: string; role: string; look: string }
  | { type: 'thing'; name: string; look: string; views: [ThingView, ThingView] }
  | { type: 'scene'; title: string; look: string }
  | { type: 'frame'; action: string; camera: string; sceneTitle: string; sceneLook: string };

export type ImageKind = 'person' | 'thing' | 'scene' | 'frame';

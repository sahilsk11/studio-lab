import type {
  CastResponse,
  Frame,
  FramesResponse,
  Person,
  Project,
  Scene,
  ScenesResponse,
  Thing,
} from '@/types/project';
import { scenePlaceholder, videoPosterPlaceholder } from './placeholders';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const FIXTURE_DELAY = {
  cast: 400,
  scenes: 400,
  frames: 400,
  image: 600,
  video: 800,
} as const;

const LLM_COST = 0.001;
const IMAGE_COST = 0.04;

const PLACEHOLDER_BY_ID: Record<string, string> = {
  maya: '1',
  'latte-cup': '2',
  'espresso-machine': '3',
  'night-shop': '4',
  'empty-shop': '1',
  'maya-at-counter': '2',
  'swan-lifts': '3',
  'on-the-saucer': '4',
  'shared-secret': '5',
};

function placeholderUri(id: string): string {
  return scenePlaceholder(PLACEHOLDER_BY_ID[id] ?? id);
}

const MOCK_PEOPLE: Pick<Person, 'id' | 'name' | 'role' | 'look'>[] = [
  {
    id: 'maya',
    name: 'Maya',
    role: 'raccoon barista',
    look: 'Small upright raccoon, green apron, bent left ear, dark eyes.',
  },
];

const MOCK_THINGS: Pick<Thing, 'id' | 'name' | 'look' | 'views'>[] = [
  {
    id: 'latte-cup',
    name: 'Latte cup',
    look: 'White ceramic cup and saucer, swan foam art.',
    views: [
      { label: 'Side', hint: 'cup and saucer in profile' },
      { label: 'Top', hint: 'latte art from above' },
    ],
  },
  {
    id: 'espresso-machine',
    name: 'Espresso machine',
    look: 'Chrome espresso machine, midnight shop lighting.',
    views: [
      { label: 'Front', hint: 'Whole machine' },
      { label: 'Group head', hint: 'Close detail' },
    ],
  },
];

const MOCK_SCENES: Pick<Scene, 'id' | 'title' | 'look' | 'peopleIds' | 'thingIds'>[] = [
  {
    id: 'night-shop',
    title: 'Night coffee shop',
    look: 'Warm wood bar, neon OPEN, moonlight on the counter, empty of action.',
    peopleIds: ['maya'],
    thingIds: ['latte-cup', 'espresso-machine'],
  },
];

const MOCK_FRAMES: Pick<
  Frame,
  'id' | 'order' | 'sceneId' | 'peopleIds' | 'thingIds' | 'action' | 'camera'
>[] = [
  {
    id: 'empty-shop',
    order: 1,
    sceneId: 'night-shop',
    peopleIds: [],
    thingIds: ['latte-cup', 'espresso-machine'],
    action: 'Empty shop, one cup on the bar, machine idle.',
    camera: 'Wide, moonlight through the window.',
  },
  {
    id: 'maya-at-counter',
    order: 2,
    sceneId: 'night-shop',
    peopleIds: ['maya'],
    thingIds: ['latte-cup', 'espresso-machine'],
    action: 'Maya steams a cup at the counter. Bent ear, green apron.',
    camera: 'Medium shot behind the bar.',
  },
  {
    id: 'swan-lifts',
    order: 3,
    sceneId: 'night-shop',
    peopleIds: ['maya'],
    thingIds: ['latte-cup'],
    action: 'Maya leans in as the foam swan peels off the milk.',
    camera: 'Over-shoulder close on the cup.',
  },
  {
    id: 'on-the-saucer',
    order: 4,
    sceneId: 'night-shop',
    peopleIds: ['maya'],
    thingIds: ['latte-cup'],
    action: 'Swan standing on the saucer. Maya watching, still.',
    camera: 'Close on the saucer, Maya in soft focus.',
  },
  {
    id: 'shared-secret',
    order: 5,
    sceneId: 'night-shop',
    peopleIds: ['maya'],
    thingIds: ['latte-cup'],
    action: 'Maya smiles, the swan perched on the rim.',
    camera: 'Close-up of Maya holding the cup.',
  },
];

export async function mockCast(_input: {
  idea: string;
  style: string;
  durationSec: number;
}): Promise<CastResponse> {
  await delay(FIXTURE_DELAY.cast);
  return {
    title: 'Latte Revolution',
    styleNotes: '2D animated night interior, warm wood, soft neon, painterly light.',
    people: MOCK_PEOPLE,
    things: MOCK_THINGS,
    cost: LLM_COST,
  };
}

export async function mockScenes(_input: {
  idea: string;
  style: string;
  durationSec: number;
  people: Pick<Person, 'id' | 'name' | 'role' | 'look'>[];
  things: Pick<Thing, 'id' | 'name' | 'look'>[];
}): Promise<ScenesResponse> {
  await delay(FIXTURE_DELAY.scenes);
  return { scenes: MOCK_SCENES, cost: LLM_COST };
}

export async function mockFrames(_input: {
  idea: string;
  style: string;
  durationSec: number;
  people: Pick<Person, 'id' | 'name' | 'role' | 'look'>[];
  things: Pick<Thing, 'id' | 'name' | 'look'>[];
  scenes: Pick<Scene, 'id' | 'title' | 'look'>[];
}): Promise<FramesResponse> {
  await delay(FIXTURE_DELAY.frames);
  return { frames: MOCK_FRAMES, cost: LLM_COST };
}

export async function mockImage(id: string): Promise<{ uri: string; cost: number }> {
  await delay(FIXTURE_DELAY.image);
  return { uri: placeholderUri(id), cost: IMAGE_COST };
}

function withDoneImage<T extends { id: string }>(item: T) {
  return {
    ...item,
    imageStatus: 'done' as const,
    imageUri: placeholderUri(item.id),
    imageCost: IMAGE_COST,
    imageStale: false,
  };
}

export function createDemoProject(): Project {
  const people = MOCK_PEOPLE.map(withDoneImage);
  const things = MOCK_THINGS.map(withDoneImage);
  const scenes = MOCK_SCENES.map(withDoneImage);
  const frames = MOCK_FRAMES.map(withDoneImage);
  const imageCount = people.length + things.length + scenes.length + frames.length;

  return {
    id: 'demo',
    title: 'Latte Revolution',
    idea: 'Maya, a tiny raccoon barista, finds her latte art comes alive at midnight.',
    style: 'Cinematic',
    styleNotes: '2D animated night interior, warm wood, soft neon, painterly light.',
    durationSec: 30,
    people,
    things,
    scenes,
    frames,
    videoReady: true,
    videoPhase: 'ready',
    videoPosterUri: videoPosterPlaceholder(),
    totalCost: LLM_COST * 3 + IMAGE_COST * imageCount,
  };
}

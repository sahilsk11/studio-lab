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
  dog: '2',
  'delivery-bag': '3',
  rooftop: '4',
  alley: '5',
  'phone-buzzes': '1',
  'looks-over': '2',
  jump: '3',
  landing: '4',
  delivered: '5',
};

function placeholderUri(id: string): string {
  return scenePlaceholder(PLACEHOLDER_BY_ID[id] ?? id);
}

const MOCK_PEOPLE: Pick<Person, 'id' | 'name' | 'role' | 'look'>[] = [
  {
    id: 'maya',
    name: 'Maya',
    role: 'bike courier',
    look: 'Late 20s, cropped dark hair, rust windbreaker, black cargo trousers.',
  },
  {
    id: 'dog',
    name: 'Alley dog',
    role: 'deadpan witness',
    look: 'Small cream terrier with one dark ear and a permanently unimpressed stare.',
  },
];

const MOCK_THINGS: Pick<Thing, 'id' | 'name' | 'look' | 'views'>[] = [
  {
    id: 'delivery-bag',
    name: 'Delivery bag',
    look: 'Boxy tomato-red insulated backpack, reflective silver piping, slightly scuffed.',
    views: [
      { label: 'Front', hint: 'straps and reflective piping' },
      { label: 'Side', hint: 'square profile and zipper pull' },
    ],
  },
];

const MOCK_SCENES: Pick<Scene, 'id' | 'title' | 'look' | 'peopleIds' | 'thingIds'>[] = [
  {
    id: 'rooftop',
    title: 'Rain-dark rooftop',
    look: 'Low brick parapet, wet tar roof, blue dusk skyline, red aircraft lights.',
    peopleIds: ['maya'],
    thingIds: ['delivery-bag'],
  },
  {
    id: 'alley',
    title: 'Delivery alley',
    look: 'Narrow service alley below, amber doorway, wet pavement and stacked crates.',
    peopleIds: ['maya', 'dog'],
    thingIds: ['delivery-bag'],
  },
];

const MOCK_FRAMES: Pick<
  Frame,
  'id' | 'order' | 'sceneId' | 'peopleIds' | 'thingIds' | 'action' | 'camera'
>[] = [
  {
    id: 'phone-buzzes',
    order: 1,
    sceneId: 'rooftop',
    peopleIds: ['maya'],
    thingIds: ['delivery-bag'],
    action: 'Maya checks the delivery timer: forty-five seconds left.',
    camera: 'Wide rooftop opener, phone glow against blue dusk.',
  },
  {
    id: 'looks-over',
    order: 2,
    sceneId: 'rooftop',
    peopleIds: ['maya'],
    thingIds: ['delivery-bag'],
    action: 'She looks over the parapet and spots the amber delivery door below.',
    camera: 'Over-shoulder tilt down into the alley.',
  },
  {
    id: 'jump',
    order: 3,
    sceneId: 'rooftop',
    peopleIds: ['maya'],
    thingIds: ['delivery-bag'],
    action: 'Maya commits, vaulting the parapet with the red bag tight to her back.',
    camera: 'Dynamic vertical wide, city lights streaking behind her.',
  },
  {
    id: 'landing',
    order: 4,
    sceneId: 'alley',
    peopleIds: ['maya', 'dog'],
    thingIds: ['delivery-bag'],
    action: 'She lands in a crouch beside the dog, who does not bother to move.',
    camera: 'Low impact shot, small splash across wet pavement.',
  },
  {
    id: 'delivered',
    order: 5,
    sceneId: 'alley',
    peopleIds: ['maya', 'dog'],
    thingIds: ['delivery-bag'],
    action: 'Maya rings the bell with one second left; the dog finally looks impressed.',
    camera: 'Medium two-shot at the amber doorway.',
  },
];

export async function mockCast(_input: {
  idea: string;
  style: string;
  durationSec: number;
}): Promise<CastResponse> {
  await delay(FIXTURE_DELAY.cast);
  return {
    title: 'Balcony jump',
    styleNotes: 'Grainy 35mm texture, blue-hour city, wet surfaces, tomato-red accents, handheld energy.',
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
    title: 'Balcony jump',
    idea: 'A courier is late for a delivery and takes a shortcut off a balcony.',
    style: 'Grainy film',
    styleNotes: 'Grainy 35mm texture, blue-hour city, wet surfaces, tomato-red accents, handheld energy.',
    durationSec: 15,
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

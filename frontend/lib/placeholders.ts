import { Image, Platform } from 'react-native';

type ImageModule = number | { uri: string; width?: number; height?: number };

const SCENES: Record<string, ImageModule> = {
  '1': require('../assets/placeholders/scene-1.jpg'),
  '2': require('../assets/placeholders/scene-2.jpg'),
  '3': require('../assets/placeholders/scene-3.jpg'),
  '4': require('../assets/placeholders/scene-4.jpg'),
  '5': require('../assets/placeholders/scene-5.jpg'),
};

const STARTS: Record<string, ImageModule> = {
  '1': require('../assets/placeholders/scene-1-start.jpg'),
  '2': require('../assets/placeholders/scene-2-start.jpg'),
  '3': require('../assets/placeholders/scene-3-start.jpg'),
  '4': require('../assets/placeholders/scene-4-start.jpg'),
  '5': require('../assets/placeholders/scene-5-start.jpg'),
};

const ENDS: Record<string, ImageModule> = {
  '1': require('../assets/placeholders/scene-1-end.jpg'),
  '2': require('../assets/placeholders/scene-2-end.jpg'),
  '3': require('../assets/placeholders/scene-3-end.jpg'),
  '4': require('../assets/placeholders/scene-4-end.jpg'),
  '5': require('../assets/placeholders/scene-5-end.jpg'),
};

const POSTER: ImageModule = require('../assets/placeholders/poster.jpg');

function uri(asset: ImageModule): string {
  if (typeof asset === 'object' && 'uri' in asset) {
    return asset.uri;
  }
  if (Platform.OS === 'web') {
    // Metro web can return a module object nested under default
    const mod = asset as unknown as { default?: { uri: string } };
    if (mod?.default?.uri) return mod.default.uri;
  }
  return Image.resolveAssetSource(asset as number).uri;
}

export function scenePlaceholder(sceneId: string): string {
  return uri(SCENES[sceneId] ?? SCENES['1']);
}

export function startFramePlaceholder(sceneId: string): string {
  return uri(STARTS[sceneId] ?? STARTS['1']);
}

export function endFramePlaceholder(sceneId: string): string {
  return uri(ENDS[sceneId] ?? ENDS['1']);
}

export function videoPosterPlaceholder(): string {
  return uri(POSTER);
}

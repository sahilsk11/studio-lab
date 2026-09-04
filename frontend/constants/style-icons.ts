import type { Ionicons } from '@expo/vector-icons';

import { STYLES } from '@/types/project';

type StyleName = (typeof STYLES)[number];

export const STYLE_ICONS: Record<StyleName, keyof typeof Ionicons.glyphMap> = {
  'Grainy film': 'film-outline',
  'Flat vector': 'shapes-outline',
  'Anime cel': 'color-palette-outline',
  Claymation: 'cube-outline',
  Photoreal: 'camera-outline',
};

export const STYLE_TINTS: Record<StyleName, string> = {
  'Grainy film': '#D95B38',
  'Flat vector': '#42999B',
  'Anime cel': '#7B61A8',
  Claymation: '#6F8F3B',
  Photoreal: '#8C8378',
};

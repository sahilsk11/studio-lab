import AsyncStorage from '@react-native-async-storage/async-storage';

import type { AccentId, GlassLevelId } from '@/constants/theme';
import { DEFAULT_API_URL } from '@/lib/api';

const SETTINGS_KEY = 'studio-lab-settings-v1';

export type AppSettings = {
  // Appearance
  accent: AccentId;
  glassLevel: GlassLevelId;
  reduceMotion: boolean;
  haptics: boolean;

  // Generation defaults applied to every new project
  defaultStyle: string;
  defaultDuration: number;
  /** Kick off sheet rendering as soon as a cast comes back. */
  autoGenerateImages: boolean;
  /** Unused. Kept so stored settings JSON still hydrates. */
  referenceChaining: boolean;

  // Budget
  showCosts: boolean;
  /** Soft spend ceiling in USD for a single project. 0 disables the check. */
  budgetCap: number;

  // Connection
  apiUrl: string;

  // Developer
  testMode: boolean;
};

export const DEFAULT_SETTINGS: AppSettings = {
  accent: 'chrome',
  glassLevel: 'balanced',
  reduceMotion: false,
  haptics: true,

  defaultStyle: 'Cinematic',
  defaultDuration: 30,
  autoGenerateImages: false,
  referenceChaining: true,

  showCosts: true,
  budgetCap: 0,

  apiUrl: DEFAULT_API_URL,

  testMode: false,
};

export async function loadSettings(): Promise<AppSettings> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export async function clearSettings(): Promise<void> {
  await AsyncStorage.removeItem(SETTINGS_KEY);
}

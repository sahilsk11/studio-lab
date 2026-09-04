import AsyncStorage from '@react-native-async-storage/async-storage';

import { DEFAULT_API_URL, normalizeApiUrl } from '@/lib/api';

const SETTINGS_KEY = 'reel-studio-settings';

export type AppSettings = {
  defaultStyle: string;
  defaultDuration: number;
  autoGenerateImages: boolean;
  showCosts: boolean;
  /** Soft spend ceiling in USD for one project. Zero disables the cap. */
  budgetCap: number;
  apiUrl: string;
  /** Use bundled sample content and avoid paid generation calls. */
  testMode: boolean;
};

export const DEFAULT_SETTINGS: AppSettings = {
  defaultStyle: 'Grainy film',
  defaultDuration: 30,
  autoGenerateImages: false,
  showCosts: true,
  budgetCap: 0,
  apiUrl: DEFAULT_API_URL,
  testMode: false,
};

export async function loadSettings(): Promise<AppSettings> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const saved = JSON.parse(raw) as Partial<AppSettings>;

    return {
      defaultStyle:
        typeof saved.defaultStyle === 'string' ? saved.defaultStyle : DEFAULT_SETTINGS.defaultStyle,
      defaultDuration:
        typeof saved.defaultDuration === 'number'
          ? saved.defaultDuration
          : DEFAULT_SETTINGS.defaultDuration,
      autoGenerateImages:
        typeof saved.autoGenerateImages === 'boolean'
          ? saved.autoGenerateImages
          : DEFAULT_SETTINGS.autoGenerateImages,
      showCosts:
        typeof saved.showCosts === 'boolean' ? saved.showCosts : DEFAULT_SETTINGS.showCosts,
      budgetCap:
        typeof saved.budgetCap === 'number' ? saved.budgetCap : DEFAULT_SETTINGS.budgetCap,
      apiUrl:
        typeof saved.apiUrl === 'string'
          ? normalizeApiUrl(saved.apiUrl)
          : DEFAULT_SETTINGS.apiUrl,
      testMode:
        typeof saved.testMode === 'boolean' ? saved.testMode : DEFAULT_SETTINGS.testMode,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

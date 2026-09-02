import * as Haptics from 'expo-haptics';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Platform } from 'react-native';

import { ACCENTS, GLASS_LEVELS, type Accent } from '@/constants/theme';
import { setApiBaseUrl } from '@/lib/api';
import {
  clearSettings,
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
  type AppSettings,
} from '@/lib/settings';

type Impact = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

type SettingsContextValue = {
  settings: AppSettings;
  hydrated: boolean;
  /** Resolved accent palette for the current selection. */
  accent: Accent;
  /** Blur radius the frosted materials should use. */
  blur: number;
  /** Backdrop orb opacity for the current glass level. */
  orbOpacity: number;
  /** False when the user has asked for reduced motion. */
  animate: boolean;
  set: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
  resetSettings: () => Promise<void>;
  /** No-ops on web and when the haptics preference is off. */
  tap: (kind?: Impact) => void;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [hydrated, setHydrated] = useState(false);
  const hapticsRef = useRef(settings.haptics);
  hapticsRef.current = settings.haptics;

  useEffect(() => {
    loadSettings().then((loaded) => {
      setSettings(loaded);
      setApiBaseUrl(loaded.apiUrl);
      setHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const t = setTimeout(() => saveSettings(settings), 250);
    return () => clearTimeout(t);
  }, [settings, hydrated]);

  const set = useCallback<SettingsContextValue['set']>((key, value) => {
    setSettings((prev) => {
      if (prev[key] === value) return prev;
      if (key === 'apiUrl') setApiBaseUrl(value as string);
      return { ...prev, [key]: value };
    });
  }, []);

  const resetSettings = useCallback(async () => {
    await clearSettings();
    setSettings(DEFAULT_SETTINGS);
    setApiBaseUrl(DEFAULT_SETTINGS.apiUrl);
  }, []);

  const tap = useCallback((kind: Impact = 'light') => {
    if (Platform.OS === 'web' || !hapticsRef.current) return;
    switch (kind) {
      case 'success':
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      case 'warning':
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        break;
      case 'error':
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        break;
      case 'medium':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;
      case 'heavy':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        break;
      default:
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, []);

  const value = useMemo<SettingsContextValue>(() => {
    const level = GLASS_LEVELS[settings.glassLevel] ?? GLASS_LEVELS.balanced;
    return {
      settings,
      hydrated,
      accent: ACCENTS[settings.accent] ?? ACCENTS.chrome,
      blur: level.blur,
      orbOpacity: level.orbOpacity,
      animate: !settings.reduceMotion,
      set,
      resetSettings,
      tap,
    };
  }, [settings, hydrated, set, resetSettings, tap]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}

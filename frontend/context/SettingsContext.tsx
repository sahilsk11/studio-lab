import * as Haptics from 'expo-haptics';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';

import { CHROMA, type Accent } from '@/constants/theme';
import { setApiBaseUrl } from '@/lib/api';
import {
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
  type AppSettings,
} from '@/lib/settings';

type Impact = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

type SettingsContextValue = {
  settings: AppSettings;
  hydrated: boolean;
  /** The product has one deliberate chroma accent. */
  accent: Accent;
  /** Motion is part of progress feedback rather than a visual preference. */
  animate: true;
  set: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
  tap: (kind?: Impact) => void;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    loadSettings().then((loaded) => {
      setSettings(loaded);
      setApiBaseUrl(loaded.apiUrl);
      setHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const timer = setTimeout(() => saveSettings(settings), 250);
    return () => clearTimeout(timer);
  }, [settings, hydrated]);

  const set = useCallback<SettingsContextValue['set']>((key, value) => {
    setSettings((previous) => {
      if (previous[key] === value) return previous;
      if (key === 'apiUrl') setApiBaseUrl(value as string);
      return { ...previous, [key]: value };
    });
  }, []);

  const tap = useCallback((kind: Impact = 'light') => {
    if (Platform.OS === 'web') return;

    if (kind === 'success' || kind === 'warning' || kind === 'error') {
      const notification = {
        success: Haptics.NotificationFeedbackType.Success,
        warning: Haptics.NotificationFeedbackType.Warning,
        error: Haptics.NotificationFeedbackType.Error,
      }[kind];
      void Haptics.notificationAsync(notification);
      return;
    }

    const impact = {
      light: Haptics.ImpactFeedbackStyle.Light,
      medium: Haptics.ImpactFeedbackStyle.Medium,
      heavy: Haptics.ImpactFeedbackStyle.Heavy,
    }[kind];
    void Haptics.impactAsync(impact);
  }, []);

  const value = useMemo<SettingsContextValue>(
    () => ({
      settings,
      hydrated,
      accent: CHROMA,
      animate: true,
      set,
      tap,
    }),
    [settings, hydrated, set, tap],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const value = useContext(SettingsContext);
  if (!value) throw new Error('useSettings must be used within SettingsProvider');
  return value;
}

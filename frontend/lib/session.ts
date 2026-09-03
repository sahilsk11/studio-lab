import AsyncStorage from '@react-native-async-storage/async-storage';

const ACTIVE_PROJECT_KEY = 'studio-lab-active-project';
const ANONYMOUS_SESSION_KEY = 'studio-lab-anonymous-session';

function randomId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `anon-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function loadActiveProjectId(): Promise<string | null> {
  try {
    const value = await AsyncStorage.getItem(ACTIVE_PROJECT_KEY);
    return value?.trim() || null;
  } catch {
    return null;
  }
}

export async function saveActiveProjectId(id: string | null): Promise<void> {
  try {
    if (!id) await AsyncStorage.removeItem(ACTIVE_PROJECT_KEY);
    else await AsyncStorage.setItem(ACTIVE_PROJECT_KEY, id);
  } catch {
    // Picker still works for this session.
  }
}

export async function getAnonymousSessionId(): Promise<string> {
  try {
    const existing = await AsyncStorage.getItem(ANONYMOUS_SESSION_KEY);
    if (existing?.trim()) return existing.trim();
    const next = randomId();
    await AsyncStorage.setItem(ANONYMOUS_SESSION_KEY, next);
    return next;
  } catch {
    return randomId();
  }
}

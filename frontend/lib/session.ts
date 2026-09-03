import AsyncStorage from '@react-native-async-storage/async-storage';

const ACTIVE_PROJECT_KEY = 'studio-lab-active-project';

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

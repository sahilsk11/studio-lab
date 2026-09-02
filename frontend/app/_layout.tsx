import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { theme } from '@/constants/theme';
import { ProjectProvider } from '@/context/ProjectContext';
import { SettingsProvider } from '@/context/SettingsContext';

export { ErrorBoundary } from 'expo-router';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <ProjectProvider>
          <StatusBar style="dark" />
          <View style={{ flex: 1, backgroundColor: theme.bg }}>
            <Stack
              screenOptions={{
                headerShown: false,
                animation: 'slide_from_right',
                contentStyle: { backgroundColor: theme.bg },
              }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="interview" />
              <Stack.Screen name="cast" />
              <Stack.Screen name="places" />
              <Stack.Screen name="action" />
              <Stack.Screen name="scenes" />
              <Stack.Screen name="watch" />
              <Stack.Screen
                name="settings"
                options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
              />
            </Stack>
          </View>
        </ProjectProvider>
      </SettingsProvider>
    </SafeAreaProvider>
  );
}

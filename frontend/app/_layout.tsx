import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { theme } from '@/constants/theme';
import { ProjectProvider } from '@/context/ProjectContext';
import { SettingsProvider } from '@/context/SettingsContext';

SplashScreen.preventAutoHideAsync();

export { ErrorBoundary } from 'expo-router';

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <ProjectProvider>
          <StatusBar style="light" />
          <View style={{ flex: 1, backgroundColor: theme.bg }}>
            <Stack
              screenOptions={{
                headerShown: false,
                animation: 'slide_from_right',
                contentStyle: { backgroundColor: theme.bg },
              }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="cast" />
              <Stack.Screen name="scenes" />
              <Stack.Screen name="storyboard" />
              <Stack.Screen name="frames" />
              <Stack.Screen name="generate" />
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

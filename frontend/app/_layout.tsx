import { Ionicons } from '@expo/vector-icons';
import { ClerkProvider } from '@clerk/clerk-react';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ApiAuthBridge } from '@/components/ApiAuthBridge';
import { CLERK_PUBLISHABLE_KEY, isClerkEnabled } from '@/components/ui/AuthControls';
import { AuthStateProvider } from '@/components/ui/SignInGate';
import { theme } from '@/constants/theme';
import { clerkAppearance } from '@/lib/clerk-appearance';
import { ProjectProvider } from '@/context/ProjectContext';
import { SettingsProvider } from '@/context/SettingsContext';
import { setAnonymousSessionGetter } from '@/lib/api';
import { getAnonymousSessionId } from '@/lib/session';

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync().catch(() => {});

// Register before ProjectProvider's first API call (child useEffects run too late).
setAnonymousSessionGetter(() => getAnonymousSessionId());

function AppShell() {
  const [fontsLoaded, fontError] = useFonts(Ionicons.font);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.bg }}>
        <ActivityIndicator color={theme.textSecondary} />
      </View>
    );
  }
  return (
    <SettingsProvider>
      <AuthStateProvider>
        <ProjectProvider>
          {isClerkEnabled() ? <ApiAuthBridge /> : null}
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
            <Stack.Screen name="settings" />
          </Stack>
        </View>
      </ProjectProvider>
      </AuthStateProvider>
    </SettingsProvider>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      {isClerkEnabled() ? (
        <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} appearance={clerkAppearance}>
          <AppShell />
        </ClerkProvider>
      ) : (
        <AppShell />
      )}
    </SafeAreaProvider>
  );
}

import { useAuth, useUser, SignInButton, UserButton } from '@clerk/clerk-react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/constants/theme';
import { clerkAppearance } from '@/lib/clerk-appearance';

export const CLERK_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim() ?? '';

export function isClerkEnabled(): boolean {
  return Boolean(CLERK_PUBLISHABLE_KEY);
}

export function AuthControls() {
  if (!isClerkEnabled()) return null;
  return <ClerkAuthControls />;
}

function ClerkAuthControls() {
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();

  if (!isLoaded) {
    return <View style={styles.placeholder} />;
  }

  if (isSignedIn) {
    return (
      <View style={styles.signedIn}>
        {user?.firstName ? (
          <Text numberOfLines={1} style={styles.greeting}>
            {user.firstName}
          </Text>
        ) : null}
        <UserButton
          appearance={{
            ...clerkAppearance,
            elements: {
              avatarBox: { width: 30, height: 30 },
            },
          }}
        />
      </View>
    );
  }

  return (
    <SignInButton mode="modal">
      <View
        accessibilityRole="button"
        accessibilityLabel="Sign in"
        style={styles.signIn}>
        <Text style={styles.signInText}>Sign in</Text>
      </View>
    </SignInButton>
  );
}

const styles = StyleSheet.create({
  placeholder: { width: 30, height: 30 },
  signedIn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    maxWidth: 140,
  },
  greeting: {
    fontFamily: theme.font.sans,
    fontSize: 13,
    color: theme.textSecondary,
    flexShrink: 1,
  },
  signIn: {
    height: 30,
    paddingHorizontal: 12,
    borderRadius: theme.radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.borderStrong,
    backgroundColor: theme.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({ web: { cursor: 'pointer' }, default: {} }),
  },
  signInText: {
    fontFamily: theme.font.sans,
    fontSize: 13,
    fontWeight: '600',
    color: theme.text,
  },
});

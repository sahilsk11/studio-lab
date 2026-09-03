import { useAuth, SignInButton } from '@clerk/clerk-react';
import { createContext, useContext } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/constants/theme';
import { isClerkEnabled } from './AuthControls';

type AuthState = {
  requiresSignIn: boolean;
};

const AuthStateContext = createContext<AuthState>({ requiresSignIn: false });

export function AuthStateProvider({ children }: { children: React.ReactNode }) {
  if (!isClerkEnabled()) {
    return (
      <AuthStateContext.Provider value={{ requiresSignIn: false }}>
        {children}
      </AuthStateContext.Provider>
    );
  }
  return <ClerkAuthStateProvider>{children}</ClerkAuthStateProvider>;
}

function ClerkAuthStateProvider({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded } = useAuth();
  return (
    <AuthStateContext.Provider value={{ requiresSignIn: isLoaded && !isSignedIn }}>
      {children}
    </AuthStateContext.Provider>
  );
}

export function useRequiresSignIn(): boolean {
  return useContext(AuthStateContext).requiresSignIn;
}

export function SignInGate({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  if (!isClerkEnabled()) return null;

  return (
    <View style={styles.gate}>
      <Text style={styles.gateTitle}>{title}</Text>
      <Text style={styles.gateMessage}>{message}</Text>
      <SignInButton mode="modal">
        <View accessibilityRole="button" style={styles.gateButton}>
          <Text style={styles.gateButtonText}>Sign in to continue</Text>
        </View>
      </SignInButton>
    </View>
  );
}

const styles = StyleSheet.create({
  gate: {
    gap: theme.space.md,
    padding: theme.space.lg,
    borderRadius: theme.radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.borderStrong,
    backgroundColor: theme.surface,
  },
  gateTitle: {
    fontFamily: theme.font.sans,
    fontSize: 16,
    fontWeight: '600',
    color: theme.text,
  },
  gateMessage: {
    fontFamily: theme.font.sans,
    fontSize: 14,
    lineHeight: 20,
    color: theme.textSecondary,
  },
  gateButton: {
    alignSelf: 'flex-start',
    height: 40,
    paddingHorizontal: 16,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.accent,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({ web: { cursor: 'pointer' }, default: {} }),
  },
  gateButtonText: {
    fontFamily: theme.font.sans,
    fontSize: 14,
    fontWeight: '600',
    color: theme.textOnAccent,
  },
});

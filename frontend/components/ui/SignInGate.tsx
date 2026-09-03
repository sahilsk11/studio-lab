import { useAuth, useClerk, SignInButton } from '@clerk/clerk-react';
import { createContext, useCallback, useContext, useEffect, useRef } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/constants/theme';
import { clerkAppearance } from '@/lib/clerk-appearance';
import { isClerkEnabled } from './AuthControls';

type AuthState = {
  authReady: boolean;
  requiresSignIn: boolean;
  promptSignIn: () => void;
};

const noop = () => {};

const AuthStateContext = createContext<AuthState>({
  authReady: true,
  requiresSignIn: false,
  promptSignIn: noop,
});

export function AuthStateProvider({ children }: { children: React.ReactNode }) {
  if (!isClerkEnabled()) {
    return (
      <AuthStateContext.Provider value={{ authReady: true, requiresSignIn: false, promptSignIn: noop }}>
        {children}
      </AuthStateContext.Provider>
    );
  }
  return <ClerkAuthStateProvider>{children}</ClerkAuthStateProvider>;
}

function ClerkAuthStateProvider({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded } = useAuth();
  const clerk = useClerk();
  const promptSignIn = useCallback(() => {
    clerk.openSignIn({ appearance: clerkAppearance });
  }, [clerk]);

  return (
    <AuthStateContext.Provider
      value={{
        authReady: isLoaded,
        requiresSignIn: isLoaded && !isSignedIn,
        promptSignIn,
      }}>
      {children}
    </AuthStateContext.Provider>
  );
}

export function useAuthGate(): AuthState {
  return useContext(AuthStateContext);
}

export function useRequiresSignIn(): boolean {
  return useContext(AuthStateContext).requiresSignIn;
}

/** Opens Clerk sign-in if needed, then runs `onContinue` once a session exists. */
export function useContinueAfterSignIn(onContinue: () => void): {
  authReady: boolean;
  requiresSignIn: boolean;
  continueOrSignIn: () => void;
} {
  const { authReady, requiresSignIn, promptSignIn } = useAuthGate();
  const pending = useRef(false);
  const onContinueRef = useRef(onContinue);
  onContinueRef.current = onContinue;

  useEffect(() => {
    if (!pending.current || !authReady) return;
    if (requiresSignIn) {
      promptSignIn();
      return;
    }
    pending.current = false;
    onContinueRef.current();
  }, [authReady, requiresSignIn, promptSignIn]);

  const continueOrSignIn = useCallback(() => {
    if (!authReady || requiresSignIn) {
      pending.current = true;
      if (authReady) promptSignIn();
      return;
    }
    onContinueRef.current();
  }, [authReady, requiresSignIn, promptSignIn]);

  return { authReady, requiresSignIn, continueOrSignIn };
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

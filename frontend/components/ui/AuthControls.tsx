import { useAuth, useClerk, useUser } from '@clerk/clerk-react';
import { Ionicons } from '@expo/vector-icons';
import { Platform, Pressable, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';

import { theme } from '@/constants/theme';
import { clerkAppearance } from '@/lib/clerk-appearance';

export const CLERK_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim() ?? '';

export function isClerkEnabled(): boolean {
  return Boolean(CLERK_PUBLISHABLE_KEY);
}

/** Sidebar row — sign in or signed-in account. */
export function SidebarAuth({
  style,
  labelStyle,
}: {
  style?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
}) {
  if (!isClerkEnabled()) return null;
  return <SidebarClerkAuth style={style} labelStyle={labelStyle} />;
}

function SidebarClerkAuth({
  style,
  labelStyle,
}: {
  style?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
}) {
  const clerk = useClerk();
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();

  if (!isLoaded) {
    return <View style={[styles.row, style, styles.placeholder]} />;
  }

  if (isSignedIn) {
    const label = user?.firstName || user?.primaryEmailAddress?.emailAddress || 'Account';
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Account"
        onPress={() => clerk.openUserProfile({ appearance: clerkAppearance })}
        style={({ pressed }) => [styles.row, style, pressed && styles.pressed]}>
        <Ionicons name="person-circle-outline" size={17} color={theme.textSecondary} />
        <Text numberOfLines={1} style={[styles.label, labelStyle]}>
          {label}
        </Text>
      </Pressable>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Sign in"
      onPress={() => clerk.openSignIn({ appearance: clerkAppearance })}
      style={({ pressed }) => [styles.row, style, pressed && styles.pressed]}>
      <Ionicons name="person-outline" size={17} color={theme.textSecondary} />
      <Text style={[styles.label, labelStyle]}>Sign in</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 32,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: theme.radius.sm,
    ...Platform.select({ web: { cursor: 'pointer' }, default: {} }),
  },
  label: {
    flex: 1,
    minWidth: 0,
    color: theme.textSecondary,
    fontFamily: theme.font.sans,
    fontSize: 13,
    fontWeight: '500',
  },
  placeholder: {
    opacity: 0,
  },
  pressed: { opacity: 0.64 },
});

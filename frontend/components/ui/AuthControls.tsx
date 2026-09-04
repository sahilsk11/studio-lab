import { useAuth, useClerk, useUser } from '@clerk/clerk-react';
import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/constants/theme';
import { useSettings } from '@/context/SettingsContext';
import { clerkAppearance } from '@/lib/clerk-appearance';
import { Button } from './Button';

export const CLERK_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim() ?? '';

export function isClerkEnabled(): boolean {
  return Boolean(CLERK_PUBLISHABLE_KEY);
}

/** Account + settings in a single footer row. */
export function SidebarFooter({ labeledSettings = false }: { labeledSettings?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const { tap } = useSettings();
  const onSettings = pathname === '/settings';

  function openSettings() {
    tap('light');
    router.push('/settings');
  }

  const settingsButton = labeledSettings ? (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: onSettings }}
      accessibilityLabel="Settings"
      onPress={openSettings}
      style={({ pressed }) => [styles.settingsChip, onSettings && styles.settingsChipActive, pressed && styles.pressed]}>
      <Text style={styles.settingsChipLabel}>Settings</Text>
    </Pressable>
  ) : (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: onSettings }}
      accessibilityLabel="Settings"
      onPress={openSettings}
      style={({ pressed }) => [styles.gear, onSettings && styles.gearActive, pressed && styles.pressed]}>
      <Ionicons name="settings-outline" size={16} color={theme.textSecondary} />
    </Pressable>
  );

  if (!isClerkEnabled()) {
    return (
      <View style={styles.account}>
        <View style={styles.accountMain}>
          <View style={[styles.avatar, styles.avatarMuted]}>
            <Text style={styles.avatarText}>?</Text>
          </View>
          <View style={styles.accountCopy}>
            <Text numberOfLines={1} style={styles.accountName}>
              Guest
            </Text>
            <Text numberOfLines={1} style={styles.accountMeta}>
              not signed in
            </Text>
          </View>
        </View>
        {settingsButton}
      </View>
    );
  }

  return <ClerkFooter settingsButton={settingsButton} />;
}

function ClerkFooter({ settingsButton }: { settingsButton: React.ReactNode }) {
  const clerk = useClerk();
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();

  if (!isLoaded) {
    return (
      <View style={styles.account}>
        <View style={styles.accountMain}>
          <View style={[styles.avatar, styles.avatarMuted]} />
          <View style={styles.accountCopy}>
            <Text style={styles.accountName}> </Text>
            <Text style={styles.accountMeta}> </Text>
          </View>
        </View>
        {settingsButton}
      </View>
    );
  }

  if (isSignedIn) {
    const name = user?.firstName || user?.primaryEmailAddress?.emailAddress || 'Account';
    const initial = name.trim().charAt(0).toUpperCase() || 'A';
    return (
      <View style={styles.account}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Account"
          onPress={() => clerk.openUserProfile({ appearance: clerkAppearance })}
          style={({ pressed }) => [styles.accountMain, pressed && styles.pressed]}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <View style={styles.accountCopy}>
            <Text numberOfLines={1} style={styles.accountName}>
              {name}
            </Text>
            <Text numberOfLines={1} style={styles.accountMeta}>
              signed in
            </Text>
          </View>
        </Pressable>
        {settingsButton}
      </View>
    );
  }

  return (
    <View style={styles.row}>
      <Button
        label="Sign in to save"
        variant="ink"
        size="sm"
        onPress={() => clerk.openSignIn({ appearance: clerkAppearance })}
        style={styles.signIn}
      />
      {settingsButton}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  signIn: { flex: 1 },
  account: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 44,
    paddingLeft: 8,
    paddingRight: 6,
    paddingVertical: 6,
    borderRadius: theme.radius.md,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
  },
  accountMain: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    ...Platform.select({ web: { cursor: 'pointer' }, default: {} }),
  },
  accountCopy: { flex: 1, minWidth: 0, gap: 1 },
  accountName: {
    color: theme.text,
    fontFamily: theme.font.sans,
    fontSize: 13,
    fontWeight: '700',
  },
  accountMeta: {
    color: theme.textTertiary,
    fontFamily: theme.font.sans,
    fontSize: 11,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.info,
  },
  avatarMuted: { backgroundColor: theme.textTertiary },
  avatarText: {
    color: '#FFFFFF',
    fontFamily: theme.font.sans,
    fontSize: 12,
    fontWeight: '700',
  },
  gear: {
    width: 34,
    height: 34,
    borderRadius: theme.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    ...Platform.select({ web: { cursor: 'pointer' }, default: {} }),
  },
  gearActive: { backgroundColor: theme.accentSoft, borderColor: theme.accent },
  settingsChip: {
    minHeight: 34,
    paddingHorizontal: 12,
    borderRadius: theme.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    ...Platform.select({ web: { cursor: 'pointer' }, default: {} }),
  },
  settingsChipActive: { backgroundColor: theme.accentSoft, borderColor: theme.accent },
  settingsChipLabel: {
    color: theme.text,
    fontFamily: theme.font.sans,
    fontSize: 13,
    fontWeight: '600',
  },
  pressed: { opacity: 0.7 },
});

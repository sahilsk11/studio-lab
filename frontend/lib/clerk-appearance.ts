import { theme } from '@/constants/theme';

const sans = theme.font.sans;

/** Shared Clerk theming — keeps modals on the app type stack, not browser serif defaults. */
export const clerkAppearance = {
  variables: {
    fontFamily: sans,
    fontFamilyButtons: sans,
    fontSize: '14px',
    colorPrimary: theme.accent,
    colorText: theme.text,
    colorTextSecondary: theme.textSecondary,
    colorBackground: theme.surface,
    colorInputBackground: theme.bgElevated,
    colorInputText: theme.text,
    borderRadius: '12px',
  },
  layout: {
    socialButtonsPlacement: 'top' as const,
    socialButtonsVariant: 'blockButton' as const,
  },
} as const;

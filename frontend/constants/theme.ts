import { Platform } from 'react-native';

export type Gradient = readonly [string, string, ...string[]];

/** Spreadable absolute fill. */
export const fill = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
} as const;

/**
 * System-safe approximations of the reference's Bricolage Grotesque and IBM
 * Plex Mono. Native uses the closest platform face; web gets a broader stack.
 */
export const font = {
  sans: Platform.select({
    ios: 'Avenir Next',
    android: 'sans-serif',
    default:
      '"Bricolage Grotesque", ui-rounded, "Avenir Next", system-ui, -apple-system, sans-serif',
  }) as string,
  mono: Platform.select({
    ios: 'Menlo',
    android: 'monospace',
    default: '"IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  }) as string,
};

const base = {
  /** Warm paper, with a slightly deeper stock for inset media. */
  bg: '#FBF8EF',
  bgElevated: '#FFFDF8',
  bgSunken: '#F0E9DC',
  surface: '#FFFDF8',
  surfaceMuted: '#F6F0E5',
  border: '#E2D9CC',
  borderStrong: '#CDC1B2',

  text: '#302C27',
  textSecondary: '#6B645B',
  textTertiary: '#8C8378',
  textQuaternary: '#B1A79B',
  textOnAccent: '#FFFFFF',
  neutral: '#8C8378',

  accent: '#D95B38',
  accentDark: '#A94228',
  accentSoft: '#F9E7DE',

  success: '#2F8A70',
  successDim: '#E1F1EA',
  warning: '#B87522',
  warningDim: '#F8ECD7',
  danger: '#B9463F',
  dangerDim: '#F8E4E1',
  info: '#42999B',
  infoDim: '#E0F0EF',
} as const;

export const CHROMA = {
  id: 'chroma',
  label: 'Chroma',
  tint: base.accent,
  glow: 'rgba(217,91,56,0.14)',
  ramp: ['#ED7957', '#D95B38', '#C84D2D'] as Gradient,
} as const;

export type Accent = typeof CHROMA;

const radius = {
  xs: 5,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  panel: 22,
  pill: 999,
} as const;

const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

function elevate(y: number, blur: number, opacity: number) {
  return Platform.select({
    web: { boxShadow: `0 ${y}px ${blur}px rgba(74,57,41,${opacity})` },
    default: {
      shadowColor: '#4A3929',
      shadowOffset: { width: 0, height: y },
      shadowOpacity: opacity,
      shadowRadius: blur / 2,
      elevation: Math.max(1, Math.round(y / 2)),
    },
  }) as object;
}

const shadow = {
  none: {},
  sm: elevate(1, 3, 0.08),
  md: elevate(2, 7, 0.08),
  lg: elevate(5, 15, 0.1),
  xl: elevate(9, 24, 0.12),
} as const;

const type = {
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.85, lineHeight: 33 },
  body: { fontSize: 15, fontWeight: '400', letterSpacing: -0.08, lineHeight: 22 },
  caption: { fontSize: 13, fontWeight: '400', letterSpacing: -0.02, lineHeight: 18 },
  captionStrong: { fontSize: 13, fontWeight: '600', letterSpacing: -0.03, lineHeight: 18 },
  micro: { fontSize: 11, fontWeight: '500', letterSpacing: 0.28, lineHeight: 15 },
  eyebrow: { fontSize: 10, fontWeight: '500', letterSpacing: 1.05, lineHeight: 14 },
} as const;

export const theme = {
  ...base,
  radius,
  space,
  shadow,
  type,
  font,
} as const;

export type Theme = typeof theme;

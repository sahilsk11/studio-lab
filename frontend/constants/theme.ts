import { Platform } from 'react-native';

/**
 * Studio Lab design language — "liquid chrome".
 *
 * Dark volumetric base, frosted glass panels lit from above, and brushed
 * metal for anything the user can act on. Gradients are declared as readonly
 * tuples so they drop straight into expo-linear-gradient without casting.
 */

export type Gradient = readonly [string, string, ...string[]];

/** Spreadable absolute fill. RN 0.86 dropped `StyleSheet.absoluteFillObject`. */
export const fill = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
} as const;

export const font = {
  sans: Platform.select({
    ios: 'System',
    android: 'sans-serif',
    default:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
  }) as string,
  /** Technical readouts: counters, costs, timecodes, step numbers. */
  mono: Platform.select({
    ios: 'SpaceMono',
    android: 'SpaceMono',
    default: 'SpaceMono, ui-monospace, SFMono-Regular, Menlo, monospace',
  }) as string,
};

const base = {
  /** Deep, slightly blue-shifted void so silver reads as warm against it. */
  bg: '#06070B',
  bgElevated: '#0B0D14',
  bgSunken: '#030409',

  text: '#F3F6FC',
  textSecondary: 'rgba(226,232,244,0.64)',
  textTertiary: 'rgba(226,232,244,0.40)',
  textQuaternary: 'rgba(226,232,244,0.24)',
  /** For use on top of chrome fills. */
  textOnMetal: '#0A0C12',
  /**
   * Hex-form neutral. Use wherever a colour gets an appended alpha suffix
   * (`${color}1A`) — that trick only works on hex, not rgba() strings.
   */
  neutral: '#98A2B6',

  success: '#4ADE80',
  successDim: 'rgba(74,222,128,0.14)',
  warning: '#FBBF24',
  warningDim: 'rgba(251,191,36,0.14)',
  danger: '#FB7185',
  dangerDim: 'rgba(251,113,133,0.14)',
  info: '#8FB6FF',
  infoDim: 'rgba(143,182,255,0.14)',
} as const;

/** Frosted panel materials layered over the backdrop. */
const glass = {
  fill: 'rgba(255,255,255,0.045)',
  fillStrong: 'rgba(255,255,255,0.075)',
  fillActive: 'rgba(255,255,255,0.12)',
  fillSunken: 'rgba(3,4,9,0.42)',

  border: 'rgba(255,255,255,0.09)',
  borderStrong: 'rgba(255,255,255,0.16)',
  borderActive: 'rgba(255,255,255,0.30)',

  /** Light rakes across the top edge of every panel. */
  sheen: [
    'rgba(255,255,255,0.16)',
    'rgba(255,255,255,0.05)',
    'rgba(255,255,255,0.00)',
  ] as Gradient,
  /** 1px specular line: dark → bright → dark across the top border. */
  edge: [
    'rgba(255,255,255,0.00)',
    'rgba(255,255,255,0.45)',
    'rgba(255,255,255,0.00)',
  ] as Gradient,
  /** Subtle floor shading so panels feel like they have thickness. */
  depth: ['rgba(255,255,255,0.00)', 'rgba(0,0,0,0.28)'] as Gradient,
} as const;

/** Brushed-metal sweeps. Order matters — these read as a light source. */
const metal = {
  /** Primary action. Bright polished silver. */
  chrome: [
    '#FFFFFF',
    '#E6EBF5',
    '#B9C3D6',
    '#939EB4',
    '#C9D2E2',
    '#F4F7FC',
  ] as Gradient,
  /** Slightly darker, for pressed / secondary metal. */
  chromePressed: [
    '#DCE3EF',
    '#BFC8DA',
    '#9BA5BA',
    '#7C8699',
    '#A9B3C6',
    '#D2DAE8',
  ] as Gradient,
  /** Dark gunmetal for tertiary surfaces that still need material. */
  gunmetal: [
    'rgba(255,255,255,0.13)',
    'rgba(255,255,255,0.05)',
    'rgba(255,255,255,0.02)',
    'rgba(255,255,255,0.07)',
  ] as Gradient,
  /** Vertical highlight applied over chrome to fake a curved surface. */
  convex: [
    'rgba(255,255,255,0.55)',
    'rgba(255,255,255,0.05)',
    'rgba(0,0,0,0.06)',
    'rgba(0,0,0,0.14)',
  ] as Gradient,
} as const;

/** Selectable accent identities. Each drives glows, fills and progress. */
export const ACCENTS = {
  chrome: {
    id: 'chrome',
    label: 'Chrome',
    tint: '#AFC4E4',
    glow: 'rgba(175,196,228,0.30)',
    ramp: ['#F6F9FF', '#C6D3EA', '#8E9DBA'] as Gradient,
  },
  iris: {
    id: 'iris',
    label: 'Iris',
    tint: '#A78BFA',
    glow: 'rgba(167,139,250,0.34)',
    ramp: ['#E9E1FF', '#A78BFA', '#6D4BE0'] as Gradient,
  },
  mint: {
    id: 'mint',
    label: 'Mint',
    tint: '#5EE9C0',
    glow: 'rgba(94,233,192,0.30)',
    ramp: ['#D6FFF3', '#5EE9C0', '#1FA98A'] as Gradient,
  },
  ember: {
    id: 'ember',
    label: 'Ember',
    tint: '#FF9E7A',
    glow: 'rgba(255,158,122,0.30)',
    ramp: ['#FFE3D6', '#FF9E7A', '#D9603A'] as Gradient,
  },
} as const;

export type AccentId = keyof typeof ACCENTS;
export type Accent = (typeof ACCENTS)[AccentId];
export const ACCENT_IDS = Object.keys(ACCENTS) as AccentId[];

/** How aggressively the frosted material blurs the backdrop. */
export const GLASS_LEVELS = {
  subtle: { id: 'subtle', label: 'Subtle', blur: 18, orbOpacity: 0.42 },
  balanced: { id: 'balanced', label: 'Balanced', blur: 38, orbOpacity: 0.64 },
  vivid: { id: 'vivid', label: 'Vivid', blur: 62, orbOpacity: 0.88 },
} as const;

export type GlassLevelId = keyof typeof GLASS_LEVELS;
export const GLASS_LEVEL_IDS = Object.keys(GLASS_LEVELS) as GlassLevelId[];

const radius = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 22,
  xl: 30,
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

/**
 * Elevation presets. Native gets real shadows; web gets a matching boxShadow
 * because RN-web ignores shadowRadius on modern versions.
 */
function elevate(y: number, blur: number, opacity: number) {
  return Platform.select({
    web: { boxShadow: `0 ${y}px ${blur}px rgba(0,0,0,${opacity})` },
    default: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: y },
      shadowOpacity: opacity,
      shadowRadius: blur / 2,
      elevation: Math.round(y * 1.5),
    },
  }) as object;
}

const shadow = {
  none: {},
  sm: elevate(2, 8, 0.30),
  md: elevate(8, 24, 0.38),
  lg: elevate(18, 44, 0.46),
  xl: elevate(28, 70, 0.55),
} as const;

const type = {
  display: { fontSize: 34, fontWeight: '700', letterSpacing: -1.0, lineHeight: 40 },
  title: { fontSize: 26, fontWeight: '700', letterSpacing: -0.7, lineHeight: 32 },
  heading: { fontSize: 19, fontWeight: '600', letterSpacing: -0.35, lineHeight: 25 },
  body: { fontSize: 15, fontWeight: '400', letterSpacing: -0.1, lineHeight: 22 },
  bodyStrong: { fontSize: 15, fontWeight: '600', letterSpacing: -0.15, lineHeight: 22 },
  caption: { fontSize: 13, fontWeight: '400', letterSpacing: -0.05, lineHeight: 18 },
  captionStrong: { fontSize: 13, fontWeight: '600', letterSpacing: -0.05, lineHeight: 18 },
  micro: { fontSize: 11, fontWeight: '600', letterSpacing: 0.3, lineHeight: 14 },
  /** Uppercase section eyebrows. */
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.1, lineHeight: 14 },
} as const;

export const theme = {
  ...base,
  glass,
  metal,
  radius,
  space,
  shadow,
  type,
  font,
} as const;

export type Theme = typeof theme;

/**
 * NYC Precinct Finder — Brand Color Palette
 * Exact same colors as mobile app
 */

const PRIMARY = '#633E28'; // Brown
const BACKGROUND = '#F5F3E9'; // Warm cream
const ACCENT = '#B79C7E'; // Tan
const DEPTH = '#2B1A12'; // Dark brown

const SURFACE_LIGHT = '#FFFFFF';
const SURFACE_VARIANT_LIGHT = '#EBE8E0';
const BORDER_LIGHT = '#D4CFC4';
const OUTLINE_LIGHT = '#A89F90';

const SURFACE_DARK = '#1A1510';
const SURFACE_VARIANT_DARK = '#262018';
const BORDER_DARK = '#3D3328';
const OUTLINE_DARK = '#5C4F40';

const ERROR = '#C62828';
const SUCCESS = '#2E7D32';
const WARNING = '#E65100';

export const Colors = {
  light: {
    primary: PRIMARY,
    primaryLight: '#7D5440',
    primaryContainer: '#EBE2DA',
    onPrimary: SURFACE_LIGHT,
    onPrimaryContainer: PRIMARY,

    accent: ACCENT,
    accentLight: '#C9B59A',
    accentContainer: '#E8DFD2',
    onAccent: DEPTH,

    secondary: '#8B7355',
    secondaryContainer: '#E5DCCE',
    onSecondary: SURFACE_LIGHT,

    surface: SURFACE_LIGHT,
    surfaceVariant: SURFACE_VARIANT_LIGHT,
    surfaceElevated: SURFACE_LIGHT,
    background: BACKGROUND,
    onSurface: DEPTH,
    onSurfaceVariant: '#4A4035',

    error: ERROR,
    errorContainer: '#FFEBEE',
    success: SUCCESS,
    successContainer: '#E8F5E9',
    warning: WARNING,

    dutyDay: ACCENT,
    rdoDay: ERROR,
    highlight: ACCENT,
    highlightBg: `${ACCENT}20`,

    mapOverlayFill: `${PRIMARY}15`,
    mapOverlayStroke: PRIMARY,
    mapSelectedFill: `${PRIMARY}25`,
    mapSelectedStroke: DEPTH,
    mapSectorFill: `${ACCENT}25`,
    mapSectorStroke: ACCENT,

    tabBar: SURFACE_LIGHT,
    tabBarBorder: BORDER_LIGHT,
    tabBarActive: PRIMARY,
    tabBarInactive: OUTLINE_LIGHT,

    card: SURFACE_LIGHT,
    cardBorder: BORDER_LIGHT,

    textPrimary: DEPTH,
    textSecondary: '#4A4035',
    textTertiary: OUTLINE_LIGHT,
    textLink: PRIMARY,

    divider: BORDER_LIGHT,
    outline: OUTLINE_LIGHT,
    depth: DEPTH,
    overlay: 'rgba(0,0,0,0.5)',
    onAccentContrast: SURFACE_LIGHT,
  },

  dark: {
    primary: '#D4B89A',
    primaryLight: '#E8D4BC',
    primaryContainer: '#3D2E22',
    onPrimary: DEPTH,
    onPrimaryContainer: '#E8D4BC',

    accent: ACCENT,
    accentLight: '#C9B59A',
    accentContainer: '#3D3328',
    onAccent: DEPTH,

    secondary: '#B79C7E',
    secondaryContainer: '#3D3328',
    onSecondary: DEPTH,

    surface: SURFACE_DARK,
    surfaceVariant: SURFACE_VARIANT_DARK,
    surfaceElevated: '#242018',
    background: '#12100D',
    onSurface: '#F5F3E9',
    onSurfaceVariant: '#A89F90',

    error: '#EF5350',
    errorContainer: '#2C0A0A',
    success: '#81C784',
    successContainer: '#1B2E1D',
    warning: '#FFB74D',

    dutyDay: ACCENT,
    rdoDay: '#EF5350',
    highlight: ACCENT,
    highlightBg: `${ACCENT}25`,

    mapOverlayFill: `${ACCENT}15`,
    mapOverlayStroke: ACCENT,
    mapSelectedFill: `${ACCENT}25`,
    mapSelectedStroke: '#E8D4BC',
    mapSectorFill: `${ACCENT}20`,
    mapSectorStroke: ACCENT,

    tabBar: SURFACE_DARK,
    tabBarBorder: BORDER_DARK,
    tabBarActive: ACCENT,
    tabBarInactive: OUTLINE_DARK,

    card: SURFACE_VARIANT_DARK,
    cardBorder: BORDER_DARK,

    textPrimary: '#F5F3E9',
    textSecondary: '#A89F90',
    textTertiary: OUTLINE_DARK,
    textLink: ACCENT,

    divider: BORDER_DARK,
    outline: OUTLINE_DARK,
    depth: DEPTH,
    overlay: 'rgba(0,0,0,0.6)',
    onAccentContrast: DEPTH,
  },
} as const;

export type ColorScheme = typeof Colors.light | typeof Colors.dark;

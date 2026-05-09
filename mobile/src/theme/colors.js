// Examify Design System — Color Tokens
// All colors support both light and dark mode via the `theme` object.

export const palette = {
  // Brand
  purple50:  '#F3F0FF',
  purple100: '#E8E2FF',
  purple200: '#D1C5FF',
  purple300: '#B09AFF',
  purple400: '#8F6EFF',
  purple500: '#6C47FF', // Primary brand
  purple600: '#5535D4',
  purple700: '#3F26AA',
  purple800: '#2C1A7A',
  purple900: '#1A0F4A',

  // Teal (success/progress)
  teal50:  '#E6FAF6',
  teal400: '#00D4AA',
  teal500: '#00B896',

  // Amber (streaks/warnings)
  amber400: '#FFA502',
  amber500: '#E8940A',

  // Red (errors/time)
  red400: '#FF4757',
  red500: '#E83A4A',

  // Neutrals
  white:   '#FFFFFF',
  gray50:  '#F8F9FF',
  gray100: '#F0F1F8',
  gray200: '#E2E4F0',
  gray300: '#C8CCDE',
  gray400: '#9299B8',
  gray500: '#636B8A',
  gray600: '#454D6D',
  gray700: '#2E3452',
  gray800: '#1A1E3A',
  gray900: '#0F1128',

  // Dark mode specific
  dark100: '#1A1A2E',
  dark200: '#16213E',
  dark300: '#0F3460',

  black: '#000000',
  transparent: 'transparent',
};

// Semantic color tokens — use these in components, not raw palette values
export const light = {
  background:    palette.white,
  backgroundAlt: palette.gray50,
  card:          palette.white,
  cardBorder:    palette.gray200,

  text:          palette.gray900,
  textSecondary: palette.gray500,
  textDisabled:  palette.gray300,

  primary:       palette.purple500,
  primaryLight:  palette.purple50,
  primaryDark:   palette.purple700,

  success:       palette.teal400,
  warning:       palette.amber400,
  error:         palette.red400,

  border:        palette.gray200,
  divider:       palette.gray100,
  shadow:        'rgba(108, 71, 255, 0.15)',
};

export const dark = {
  background:    '#0F0F1A',
  backgroundAlt: '#1A1A2E',
  card:          '#1A1A2E',
  cardBorder:    '#2A2A40',

  text:          palette.white,
  textSecondary: palette.gray400,
  textDisabled:  palette.gray700,

  primary:       palette.purple400,
  primaryLight:  'rgba(108, 71, 255, 0.15)',
  primaryDark:   palette.purple300,

  success:       palette.teal400,
  warning:       palette.amber400,
  error:         palette.red400,

  border:        '#2A2A40',
  divider:       '#252538',
  shadow:        'rgba(0, 0, 0, 0.5)',
};

// Exam type brand colors
export const examColors = {
  IELTS: { bg: '#E8F4FD', text: '#1565C0', badge: '#1976D2' },
  TEF:   { bg: '#FFF3E0', text: '#E65100', badge: '#F57C00' },
  TCF:   { bg: '#F3E5F5', text: '#6A1B9A', badge: '#8E24AA' },
  DALF:  { bg: '#E8F5E9', text: '#1B5E20', badge: '#388E3C' },
};

// Band score color mapping (IELTS 1-9)
export const bandColors = {
  1: '#FF4757', 2: '#FF4757', 3: '#FF6B35', 4: '#FFA502',
  5: '#FFD32A', 6: '#A3CB38', 7: '#00D4AA', 8: '#6C47FF', 9: '#6C47FF',
};

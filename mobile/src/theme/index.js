import { useColorScheme } from 'react-native';
import { light, dark, palette, examColors, bandColors } from './colors';
import { spacing, radius, shadow } from './spacing';
import { textStyles, fontSize, fontFamily } from './typography';

export const gradients = {
  primary:     ['#8B6EFF', '#6C47FF'],
  primaryDeep: ['#6C47FF', '#4A2FD4'],
  hero:        ['#1A1A2E', '#0F0F1A'],
  listening:   ['#1E1040', '#0D0828'],
  success:     ['#00D4AA', '#00B896'],
  amber:       ['#FFB347', '#FFA502'],
  card:        ['rgba(26,26,46,0.95)', 'rgba(15,15,26,0.98)'],
};

export const useTheme = () => {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const colors = isDark ? dark : light;
  return {
    colors,
    palette,
    spacing,
    radius,
    shadow,
    textStyles,
    fontSize,
    fontFamily,
    gradients,
    examColors,
    bandColors,
    isDark,
  };
};

export { palette, light, dark, examColors, bandColors } from './colors';
export { spacing, radius, shadow } from './spacing';
export { textStyles, fontSize, fontFamily } from './typography';

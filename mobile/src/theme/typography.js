import { Platform } from 'react-native';

export const fontFamily = {
  regular: Platform.OS === 'ios' ? 'System' : 'Roboto',
  medium: Platform.OS === 'ios' ? 'System' : 'Roboto-Medium',
  bold: Platform.OS === 'ios' ? 'System' : 'Roboto-Bold',
};

export const fontSize = {
  xs: 11, sm: 12, base: 14, md: 15, lg: 16,
  xl: 18, '2xl': 20, '3xl': 24, '4xl': 28, '5xl': 36,
};

export const lineHeight = {
  tight: 1.2, normal: 1.4, relaxed: 1.6, loose: 1.8,
};

export const textStyles = {
  h1: { fontSize: fontSize['4xl'], fontWeight: '800', lineHeight: fontSize['4xl'] * 1.2 },
  h2: { fontSize: fontSize['3xl'], fontWeight: '700', lineHeight: fontSize['3xl'] * 1.2 },
  h3: { fontSize: fontSize.xl, fontWeight: '700' },
  body: { fontSize: fontSize.base, lineHeight: fontSize.base * 1.5 },
  bodyMd: { fontSize: fontSize.md, lineHeight: fontSize.md * 1.5 },
  caption: { fontSize: fontSize.sm, lineHeight: fontSize.sm * 1.4 },
  label: { fontSize: fontSize.xs, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
  button: { fontSize: fontSize.lg, fontWeight: '700' },
  buttonSm: { fontSize: fontSize.md, fontWeight: '600' },
};

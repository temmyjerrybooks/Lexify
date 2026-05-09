import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { useSelector } from 'react-redux';
import { selectThemePreference } from '../store/slices/themeSlice';

export const LIGHT = {
  isDark: false,
  background:    '#F5F6FA',
  card:          '#FFFFFF',
  cardAlt:       '#F9FAFB',
  border:        '#E2E4F0',
  text:          '#1A1B2F',
  textSecondary: '#9299B8',
  textMuted:     '#C4C9DF',
  inputBg:       '#F5F6FA',
  inputBorder:   '#E2E4F0',
  headerGrad:    ['#1A0A3E', '#0F0F1A'],
  tabBarTint:    'light',
  shadow:        { shadowColor: '#000', shadowOpacity: 0.05 },
};

export const DARK = {
  isDark: true,
  background:    '#0D0D1A',
  card:          '#1A1B2F',
  cardAlt:       '#12131F',
  border:        '#2A2B40',
  text:          '#F0F0FF',
  textSecondary: '#7B82A8',
  textMuted:     '#4B5270',
  inputBg:       '#12131F',
  inputBorder:   '#2A2B40',
  headerGrad:    ['#1A0A3E', '#0D0828'],
  tabBarTint:    'dark',
  shadow:        { shadowColor: '#000', shadowOpacity: 0.3 },
};

const ThemeContext = createContext(LIGHT);

export const ThemeProvider = ({ children }) => {
  const systemScheme  = useColorScheme();
  const preference    = useSelector(selectThemePreference);

  const theme = useMemo(() => {
    const resolved = preference === 'system'
      ? (systemScheme === 'dark' ? 'dark' : 'light')
      : preference;
    return resolved === 'dark' ? DARK : LIGHT;
  }, [preference, systemScheme]);

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useAppTheme = () => useContext(ThemeContext);

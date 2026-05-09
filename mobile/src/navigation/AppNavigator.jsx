import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import * as SplashScreen from 'expo-splash-screen';

import { loadCurrentUser, selectIsAuthenticated, selectAuthLoading, selectUser } from '../store/slices/authSlice';
import { loadThemePreference } from '../store/slices/themeSlice';
import { useAppTheme } from '../theme/ThemeContext';
import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator';
import OnboardingNavigator from './OnboardingNavigator';
import ErrorBoundary from '../components/ErrorBoundary';

const hideSplash = async () => {
  try { await SplashScreen.hideAsync(); } catch {}
};

const AppNavigator = () => {
  const dispatch       = useDispatch();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const isLoading       = useSelector(selectAuthLoading);
  const user            = useSelector(selectUser);
  const theme           = useAppTheme();

  useEffect(() => {
    dispatch(loadThemePreference());

    const fallback = setTimeout(hideSplash, 3000);
    dispatch(loadCurrentUser()).finally(() => {
      hideSplash();
      clearTimeout(fallback);
    });
    return () => clearTimeout(fallback);
  }, [dispatch]);

  if (isLoading) return null;

  const navTheme = {
    dark: theme.isDark,
    colors: {
      primary:    '#6C47FF',
      background: theme.background,
      card:       theme.card,
      text:       theme.text,
      border:     theme.border,
      notification: '#EF4444',
    },
  };

  return (
    <ErrorBoundary>
      <NavigationContainer theme={navTheme}>
        {!isAuthenticated
          ? <AuthNavigator />
          : !user?.onboarding_completed
            ? <OnboardingNavigator />
            : <MainNavigator />
        }
      </NavigationContainer>
    </ErrorBoundary>
  );
};

export default AppNavigator;

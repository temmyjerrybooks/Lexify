import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as SecureStore from 'expo-secure-store';
import { authAPI } from '../../services/api';

// OneSignal disabled for Expo Go — re-enable when creating production build
const getOneSignal = () => null;

// ─── Async Thunks ────────────────────────────────────────────────────────────

export const loginUser = createAsyncThunk(
  'auth/login',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const { data } = await authAPI.login(email, password);
      await SecureStore.setItemAsync('access_token', data.access_token);
      await SecureStore.setItemAsync('refresh_token', data.refresh_token);
      getOneSignal()?.login(data.user.id);
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || 'Login failed.');
    }
  }
);

export const registerUser = createAsyncThunk(
  'auth/register',
  async (userData, { rejectWithValue }) => {
    try {
      const { data } = await authAPI.register(userData);
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || 'Registration failed.');
    }
  }
);

export const loadCurrentUser = createAsyncThunk(
  'auth/loadMe',
  async (_, { rejectWithValue }) => {
    try {
      const token = await SecureStore.getItemAsync('access_token');
      if (!token) return null;
      const { data } = await authAPI.getMe();
      // Re-link device on app restart (in case user switched devices)
      if (data.user?.id) getOneSignal()?.login(data.user.id);
      return data.user;
    } catch {
      await SecureStore.deleteItemAsync('access_token');
      await SecureStore.deleteItemAsync('refresh_token');
      return null;
    }
  }
);

export const logoutUser = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      await authAPI.logout();
    } catch {
      // Best-effort logout — clear local state regardless
    } finally {
      await SecureStore.deleteItemAsync('access_token');
      await SecureStore.deleteItemAsync('refresh_token');
      getOneSignal()?.logout();
    }
  }
);

export const completeOnboarding = createAsyncThunk(
  'auth/completeOnboarding',
  async (onboardingData, { rejectWithValue }) => {
    try {
      await authAPI.completeOnboarding(onboardingData);
      return onboardingData;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || 'Failed to save preferences.');
    }
  }
);

// ─── Slice ───────────────────────────────────────────────────────────────────

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    isAuthenticated: false,
    isLoading: true,  // True on app start while we check SecureStore
    error: null,
    registrationSuccess: false,
  },
  reducers: {
    clearError: (state) => { state.error = null; },
    updateUserProfile: (state, action) => {
      if (state.user) state.user = { ...state.user, ...action.payload };
    },
  },
  extraReducers: (builder) => {
    // Login
    builder
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.error = null;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });

    // Register
    builder
      .addCase(registerUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
        state.registrationSuccess = false;
      })
      .addCase(registerUser.fulfilled, (state) => {
        state.isLoading = false;
        state.registrationSuccess = true;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
        state.registrationSuccess = false;
      });

    // Load current user (app startup)
    builder
      .addCase(loadCurrentUser.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(loadCurrentUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.isAuthenticated = !!action.payload;
      })
      .addCase(loadCurrentUser.rejected, (state) => {
        state.isLoading = false;
        state.isAuthenticated = false;
      });

    // Logout
    builder
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.isAuthenticated = false;
        state.isLoading = false;
      });

    // Complete onboarding
    builder
      .addCase(completeOnboarding.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(completeOnboarding.fulfilled, (state, action) => {
        state.isLoading = false;
        if (state.user) {
          state.user = { ...state.user, ...action.payload, onboarding_completed: true };
        }
      })
      .addCase(completeOnboarding.rejected, (state) => {
        state.isLoading = false;
      });
  },
});

export const { clearError, updateUserProfile } = authSlice.actions;

// ─── Selectors ───────────────────────────────────────────────────────────────
export const selectUser = (state) => state.auth.user;
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
export const selectAuthLoading = (state) => state.auth.isLoading;
export const selectAuthError = (state) => state.auth.error;
export const selectSubscriptionTier = (state) => state.auth.user?.subscription_tier || 'FREE';

export default authSlice.reducer;

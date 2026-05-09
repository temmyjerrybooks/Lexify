import { createSlice } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'examify_theme_preference';

const themeSlice = createSlice({
  name: 'theme',
  initialState: {
    preference: 'system', // 'light' | 'dark' | 'system'
  },
  reducers: {
    // FIX [M4]: Pure reducer — no AsyncStorage side effect here.
    _setThemePreference: (state, action) => {
      state.preference = action.payload;
    },
  },
});

const { _setThemePreference } = themeSlice.actions;
export const selectThemePreference = (state) => state.theme.preference;

// Thunk: persists to AsyncStorage then updates Redux state.
// Callers use this instead of the raw action so persistence is guaranteed.
export const setThemePreference = (value) => async (dispatch) => {
  try { await AsyncStorage.setItem(STORAGE_KEY, value); } catch {}
  dispatch(_setThemePreference(value));
};

export const loadThemePreference = () => async (dispatch) => {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY);
    if (saved) dispatch(_setThemePreference(saved));
  } catch {}
};

export default themeSlice.reducer;

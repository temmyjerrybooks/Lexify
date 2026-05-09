jest.mock('../services/api', () => ({ userAPI: {}, examAPI: {}, aiAPI: {}, authAPI: {}, resultAPI: {} }));

import AsyncStorage from '@react-native-async-storage/async-storage';
import themeReducer, {
  setThemePreference,
  loadThemePreference,
  selectThemePreference,
} from '../store/slices/themeSlice';
import { configureStore } from '@reduxjs/toolkit';

const makeStore = () =>
  configureStore({ reducer: { theme: themeReducer } });

describe('themeSlice — reducer', () => {
  it('has system as default preference', () => {
    const state = themeReducer(undefined, { type: '@@INIT' });
    expect(state.preference).toBe('system');
  });
});

describe('themeSlice — setThemePreference thunk', () => {
  beforeEach(() => jest.clearAllMocks());

  it('updates preference in the store', async () => {
    const store = makeStore();
    await store.dispatch(setThemePreference('dark'));
    expect(selectThemePreference(store.getState())).toBe('dark');
  });

  it('persists to AsyncStorage', async () => {
    const store = makeStore();
    await store.dispatch(setThemePreference('light'));
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('examify_theme_preference', 'light');
  });
});

describe('themeSlice — loadThemePreference thunk', () => {
  beforeEach(() => jest.clearAllMocks());

  it('loads saved preference from AsyncStorage', async () => {
    AsyncStorage.getItem.mockResolvedValueOnce('dark');
    const store = makeStore();
    await store.dispatch(loadThemePreference());
    expect(selectThemePreference(store.getState())).toBe('dark');
  });

  it('keeps default if AsyncStorage has no saved value', async () => {
    AsyncStorage.getItem.mockResolvedValueOnce(null);
    const store = makeStore();
    await store.dispatch(loadThemePreference());
    expect(selectThemePreference(store.getState())).toBe('system');
  });
});

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { userAPI } from '../../services/api';

export const fetchStreak = createAsyncThunk(
  'streak/fetch',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await userAPI.getStreak();
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error);
    }
  }
);

const streakSlice = createSlice({
  name: 'streak',
  initialState: {
    currentStreak: 0,
    longestStreak: 0,
    practicedToday: false,
    streakAtRisk: false,
    hoursToMidnight: 24,
    isLoading: false,
  },
  reducers: {
    markPracticedToday: (state) => {
      // FIX [M3]: Capture practicedToday before mutating it — reading it after
      // the assignment above always yields true, making the streak never increment.
      const alreadyPracticed = state.practicedToday;
      state.practicedToday = true;
      state.streakAtRisk = false;
      if (!alreadyPracticed) state.currentStreak += 1;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchStreak.pending, (state) => { state.isLoading = true; })
      .addCase(fetchStreak.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentStreak = action.payload.current_streak;
        state.longestStreak = action.payload.longest_streak;
        state.practicedToday = action.payload.practiced_today;
        state.streakAtRisk = action.payload.streak_at_risk;
        state.hoursToMidnight = action.payload.hours_to_midnight;
      })
      .addCase(fetchStreak.rejected, (state) => { state.isLoading = false; });
  },
});

export const { markPracticedToday } = streakSlice.actions;
export default streakSlice.reducer;

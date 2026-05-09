// Mock the entire API layer — streak slice imports it but tests only need the reducer logic
jest.mock('../services/api', () => ({
  userAPI: { getStreak: jest.fn() },
  examAPI: {},
  aiAPI: {},
  authAPI: {},
  resultAPI: {},
}));

import streakReducer, { markPracticedToday, fetchStreak } from '../store/slices/streakSlice';

const initialState = {
  currentStreak: 5,
  longestStreak: 10,
  practicedToday: false,
  streakAtRisk: true,
  hoursToMidnight: 3,
  isLoading: false,
};

describe('streakSlice — markPracticedToday', () => {
  it('increments streak on first practice of the day', () => {
    const state = streakReducer(initialState, markPracticedToday());
    expect(state.currentStreak).toBe(6);
    expect(state.practicedToday).toBe(true);
    expect(state.streakAtRisk).toBe(false);
  });

  it('does not increment streak if already practiced today', () => {
    const alreadyPracticed = { ...initialState, practicedToday: true, currentStreak: 5 };
    const state = streakReducer(alreadyPracticed, markPracticedToday());
    expect(state.currentStreak).toBe(5);
    expect(state.practicedToday).toBe(true);
  });

  it('clears streakAtRisk flag', () => {
    const state = streakReducer({ ...initialState, streakAtRisk: true }, markPracticedToday());
    expect(state.streakAtRisk).toBe(false);
  });
});

describe('streakSlice — fetchStreak async', () => {
  it('sets isLoading true while pending', () => {
    const state = streakReducer(initialState, { type: fetchStreak.pending.type });
    expect(state.isLoading).toBe(true);
  });

  it('populates streak data on fulfilled', () => {
    const payload = {
      current_streak: 7,
      longest_streak: 12,
      practiced_today: true,
      streak_at_risk: false,
      hours_to_midnight: 8,
    };
    const state = streakReducer(initialState, { type: fetchStreak.fulfilled.type, payload });
    expect(state.currentStreak).toBe(7);
    expect(state.longestStreak).toBe(12);
    expect(state.practicedToday).toBe(true);
    expect(state.isLoading).toBe(false);
  });

  it('sets isLoading false on rejected', () => {
    const state = streakReducer(
      { ...initialState, isLoading: true },
      { type: fetchStreak.rejected.type }
    );
    expect(state.isLoading).toBe(false);
  });
});

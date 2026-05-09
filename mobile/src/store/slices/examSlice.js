import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { examAPI } from '../../services/api';

// ─── Async Thunks ────────────────────────────────────────────────────────────

export const startExamSession = createAsyncThunk(
  'exam/startSession',
  async ({ examId, platform = 'mobile' }, { rejectWithValue }) => {
    try {
      const { data } = await examAPI.startSession(examId, platform);
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || 'Could not start exam.');
    }
  }
);

export const submitAnswer = createAsyncThunk(
  'exam/submitAnswer',
  async ({ sessionId, questionId, answerText, answerOptions, timeSpentSeconds }, { rejectWithValue }) => {
    try {
      const { data } = await examAPI.submitAnswer(sessionId, {
        question_id: questionId,
        answer_text: answerText,
        answer_options: answerOptions,
        time_spent_seconds: timeSpentSeconds,
      });
      return { questionId, ...data };
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || 'Failed to submit answer.');
    }
  }
);

export const completeExamSession = createAsyncThunk(
  'exam/completeSession',
  async (sessionId, { rejectWithValue }) => {
    try {
      const { data } = await examAPI.completeSession(sessionId);
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || 'Failed to complete exam.');
    }
  }
);

// ─── Slice ───────────────────────────────────────────────────────────────────

const examSlice = createSlice({
  name: 'exam',
  initialState: {
    currentSession: null,
    currentExam: null,
    currentSectionIndex: 0,
    currentQuestionIndex: 0,
    answers: {},          // { [questionId]: { answer, timeSpent, isCorrect } }
    timeRemaining: 0,     // seconds
    isSubmitting: false,
    lastResult: null,
    error: null,
  },
  reducers: {
    setCurrentExam: (state, action) => {
      state.currentExam = action.payload;
    },
    advanceQuestion: (state) => {
      const exam = state.currentExam;
      if (!exam) return;

      const currentSection = exam.exam_sections[state.currentSectionIndex];
      const isLastQuestion = state.currentQuestionIndex >= currentSection.questions.length - 1;
      const isLastSection = state.currentSectionIndex >= exam.exam_sections.length - 1;

      if (!isLastQuestion) {
        state.currentQuestionIndex++;
      } else if (!isLastSection) {
        state.currentSectionIndex++;
        state.currentQuestionIndex = 0;
      }
      // If both are last, the caller should trigger completeSession
    },
    goToPreviousQuestion: (state) => {
      if (state.currentQuestionIndex > 0) {
        state.currentQuestionIndex--;
      } else if (state.currentSectionIndex > 0) {
        state.currentSectionIndex--;
        const prevSection = state.currentExam?.exam_sections[state.currentSectionIndex];
        state.currentQuestionIndex = (prevSection?.questions?.length || 1) - 1;
      }
    },
    setTimeRemaining: (state, action) => {
      state.timeRemaining = action.payload;
    },
    tickTimer: (state) => {
      if (state.timeRemaining > 0) state.timeRemaining--;
    },
    recordLocalAnswer: (state, action) => {
      // Save answer in local state immediately (for instant UI feedback)
      const { questionId, answer, timeSpent } = action.payload;
      state.answers[questionId] = { answer, timeSpent, submittedAt: Date.now() };
    },
    resetExam: (state) => {
      state.currentSession = null;
      state.currentExam = null;
      state.currentSectionIndex = 0;
      state.currentQuestionIndex = 0;
      state.answers = {};
      state.timeRemaining = 0;
      state.error = null;
    },
    clearExamError: (state) => { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(startExamSession.fulfilled, (state, action) => {
        state.currentSession = action.payload;
        state.error = null;
      })
      .addCase(startExamSession.rejected, (state, action) => {
        state.error = action.payload;
      })
      .addCase(submitAnswer.fulfilled, (state, action) => {
        const { questionId, is_correct, points_earned } = action.payload;
        if (state.answers[questionId]) {
          state.answers[questionId].isCorrect = is_correct;
          state.answers[questionId].pointsEarned = points_earned;
        }
      })
      .addCase(completeExamSession.pending, (state) => {
        state.isSubmitting = true;
      })
      .addCase(completeExamSession.fulfilled, (state, action) => {
        state.isSubmitting = false;
        state.lastResult = action.payload;
      })
      .addCase(completeExamSession.rejected, (state, action) => {
        state.isSubmitting = false;
        state.error = action.payload;
      });
  },
});

export const {
  setCurrentExam, advanceQuestion, goToPreviousQuestion,
  setTimeRemaining, tickTimer, recordLocalAnswer, resetExam, clearExamError,
} = examSlice.actions;

// Selectors
export const selectCurrentQuestion = (state) => {
  const { currentExam, currentSectionIndex, currentQuestionIndex } = state.exam;
  if (!currentExam) return null;
  return currentExam.exam_sections?.[currentSectionIndex]?.questions?.[currentQuestionIndex] || null;
};

export const selectCurrentSection = (state) =>
  state.exam.currentExam?.exam_sections?.[state.exam.currentSectionIndex] || null;

export const selectExamProgress = (state) => {
  const { currentExam, currentSectionIndex, currentQuestionIndex, answers } = state.exam;
  if (!currentExam) return 0;
  const totalQuestions = currentExam.exam_sections.reduce((sum, s) => sum + s.questions.length, 0);
  const answeredCount = Object.keys(answers).length;
  return totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;
};

export default examSlice.reducer;

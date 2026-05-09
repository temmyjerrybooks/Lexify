import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Request Interceptor — attach access token ──────────────────────────────
api.interceptors.request.use(
  async (config) => {
    const token = await SecureStore.getItemAsync('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response Interceptor — handle token refresh on 401 ─────────────────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // FIX [M8]: Surface network errors and 5xx responses with clear messages
    // instead of letting raw axios errors propagate to every call site.
    if (!error.response) {
      return Promise.reject(new Error('Network error — please check your connection and try again.'));
    }
    if (error.response.status >= 500) {
      return Promise.reject(new Error('Server error — please try again shortly.'));
    }

    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = await SecureStore.getItemAsync('refresh_token');
        if (!refreshToken) throw new Error('No refresh token');

        const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refresh_token: refreshToken });

        await SecureStore.setItemAsync('access_token', data.access_token);
        await SecureStore.setItemAsync('refresh_token', data.refresh_token);

        originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
        return api(originalRequest);
      } catch {
        // Refresh failed — clear storage and force re-login
        await SecureStore.deleteItemAsync('access_token');
        await SecureStore.deleteItemAsync('refresh_token');
        // The auth store listener will pick this up and redirect to login
      }
    }

    return Promise.reject(error);
  }
);

// ─── Auth ───────────────────────────────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (email, password) => api.post('/auth/login', { email, password }),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, new_password) => api.post('/auth/reset-password', { token, new_password }),
  completeOnboarding: (data) => api.post('/auth/complete-onboarding', data),
  refreshToken: (token) => api.post('/auth/refresh', { refresh_token: token }),
};

// ─── Exams ──────────────────────────────────────────────────────────────────
export const examAPI = {
  list: (params) => api.get('/exams', { params }),
  getDetails: (examId) => api.get(`/exams/${examId}`),
  startSession: (examId, platform) => api.post(`/exams/${examId}/sessions/start`, { platform }),
  getSession: (sessionId) => api.get(`/exams/sessions/${sessionId}`),
  submitAnswer: (sessionId, data) => api.post(`/exams/sessions/${sessionId}/answer`, data),
  pauseSession: (sessionId, data) => api.post(`/exams/sessions/${sessionId}/pause`, data),
  resumeSession: (sessionId) => api.post(`/exams/sessions/${sessionId}/resume`),
  completeSession: (sessionId) => api.post(`/exams/sessions/${sessionId}/complete`),
  getSessionReview: (sessionId) => api.get(`/exams/sessions/${sessionId}/review`),
  getDailyChallenge: () => api.get('/exams/daily/challenge'),
};

// ─── Results ────────────────────────────────────────────────────────────────
export const resultAPI = {
  getResult: (resultId) => api.get(`/results/${resultId}`),
  getUserResults: (params) => api.get('/results', { params }),
  getAnalytics: (params) => api.get('/results/analytics', { params }),
};

// ─── AI ─────────────────────────────────────────────────────────────────────
export const aiAPI = {
  scoreWriting: (data) => api.post('/ai/score/writing', data),

  // For speaking, we send multipart/form-data
  scoreSpeaking: (audioBlob, metadata) => {
    const formData = new FormData();
    formData.append('audio', {
      uri: audioBlob.uri,
      type: audioBlob.mimeType || 'audio/m4a',
      name: 'recording.m4a',
    });
    Object.entries(metadata).forEach(([key, val]) => formData.append(key, val));
    return api.post('/ai/score/speaking', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000, // Speaking scoring takes longer
    });
  },

  getFeedbackStatus: (feedbackId) => api.get(`/ai/feedback/${feedbackId}`),
  getSessionFeedback: (sessionId) => api.get(`/ai/feedback/session/${sessionId}`),
  chatWithTutor: (messages) => api.post('/ai/tutor/chat', { messages }),
};

// ─── User & Streaks ──────────────────────────────────────────────────────────
export const userAPI = {
  updateProfile: (data) => api.patch('/users/profile', data),
  uploadAvatar: (imageUri, mimeType = 'image/jpeg') => {
    const formData = new FormData();
    formData.append('avatar', { uri: imageUri, type: mimeType, name: 'avatar.jpg' });
    return api.post('/users/avatar', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  getStreak: () => api.get('/streaks/me'),
  getLeaderboard: (params) => api.get('/leaderboard', { params }),
};

export default api;

import axios from 'axios';

const BASE_URL = 'http://127.0.0.1:8000';

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 600000, // 10 minutes — AI processing can take a while for large docs
});

// Request interceptor
api.interceptors.request.use(
  (config) => config,
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.detail ||
      error.response?.data?.message ||
      error.message ||
      'An unexpected error occurred';
    return Promise.reject(new Error(message));
  }
);

// ─── Questions ───────────────────────────────────────────────────────────────

export const questionsApi = {
  getAll: async (params = {}) => {
    const response = await api.get('/questions', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/questions/${id}`);
    return response.data;
  },

  create: async (questionData) => {
    const response = await api.post('/questions', questionData);
    return response.data;
  },

  update: async (id, questionData) => {
    const response = await api.put(`/questions/${id}`, questionData);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/questions/${id}`);
    return response.data;
  },

  getStats: async () => {
    const response = await api.get('/questions/stats');
    return response.data;
  },

  getSubjects: async () => {
    const response = await api.get('/questions/all-subjects');
    return response.data;
  },
};

// ─── Tests ────────────────────────────────────────────────────────────────────

export const testsApi = {
  generate: async (options) => {
    const payload = {
      number_of_questions: options.num_questions,
      difficulty: options.difficulty === 'mixed' ? null : options.difficulty,
      subject: options.subject || null,
    };
    const response = await api.post('/generate-test', payload);
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/generate-test/${id}`);
    return response.data;
  },

  getAll: async () => {
    const response = await api.get('/generate-test');
    return response.data;
  },

  submit: async (id, answersDict) => {
    const payload = {
      test_id: id,
      user_answers: Object.entries(answersDict).map(([k, v]) => ({ question_id: k, answer: v || '' }))
    };
    const response = await api.post(`/evaluate`, payload);
    return response.data;
  },
};

// ─── Results ─────────────────────────────────────────────────────────────────

export const resultsApi = {
  getAll: async () => {
    const response = await api.get('/results');
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/results/${id}`);
    return response.data;
  },

  getAnalytics: async () => {
    const response = await api.get('/results/analytics');
    return response.data;
  },
};

export default api;
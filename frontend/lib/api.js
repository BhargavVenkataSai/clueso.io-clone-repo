import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  signup: (data) => api.post('/auth/signup', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
};

// Workspace API
export const workspaceAPI = {
  getAll: () => api.get('/workspaces'),
  create: (data) => api.post('/workspaces', data),
  getById: (id) => api.get(`/workspaces/${id}`),
  update: (id, data) => api.put(`/workspaces/${id}`, data),
  addMember: (id, data) => api.post(`/workspaces/${id}/members`, data),
};

// Project API
export const projectAPI = {
  getAll: () => api.get('/projects'),
  create: (data) => api.post('/projects', data, data instanceof FormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : {}),
  getById: (id) => api.get(`/projects/${id}`),
  update: (id, data) => api.put(`/projects/${id}`, data),
  delete: (id) => api.delete(`/projects/${id}`),
  uploadVideo: (projectId, formData) => api.post(`/projects/${projectId}/upload-video`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
};

// Video API
export const videoAPI = {
  getAll: (workspaceId) => api.get(`/videos?workspaceId=${workspaceId}`),
  create: (data) => api.post('/videos', data),
  getById: (id) => api.get(`/videos/${id}`),
  update: (id, data) => api.put(`/videos/${id}`, data),
  process: (id, features) => api.post(`/videos/${id}/process`, { features }),
  export: (id, options) => api.post(`/videos/${id}/export`, options),
  delete: (id) => api.delete(`/videos/${id}`),
  generateTTS: (data) => api.post('/videos/tts', data),
  // New Full Process Endpoint
  generateSpeech: (data) => api.post('/videos/audio-full-process', data),
  upload: (data) => api.post('/videos/upload', data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
};

// RAG API
export const ragAPI = {
  upload: (data) => api.post('/rag/upload', data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  generateScript: (data) => api.post('/rag/generate-script', data),
};

// AI API
export const aiAPI = {
  summarizeProject: (projectId) => api.post(`/ai/summarize/${projectId}`),
  processRecording: (data) => api.post('/ai/process-recording', data),
  videoAwareRewrite: (data) => api.post('/ai/video-aware-rewrite', data),
};

// Documentation API
export const documentationAPI = {
  generate: (data) => api.post('/documentation', data),
  getById: (id) => api.get(`/documentation/${id}`),
  getByVideo: (videoId) => api.get(`/documentation/video/${videoId}`),
  update: (id, data) => api.put(`/documentation/${id}`, data),
  translate: (id, targetLanguage) => api.post(`/documentation/${id}/translate`, { targetLanguage }),
  export: (id, format) => api.post(`/documentation/${id}/export`, { format }),
};

// Feedback API
export const feedbackAPI = {
  submitPublic: (projectSlug, data) => api.post(`/feedback/${projectSlug}`, data),
  getAll: (projectId) => api.get(`/feedback/project/${projectId}`),
  getById: (id) => api.get(`/feedback/${id}`),
  update: (id, data) => api.put(`/feedback/${id}`, data),
  delete: (id) => api.delete(`/feedback/${id}`),
  analyze: (id) => api.post(`/feedback/${id}/analyze`),
};



export default api;

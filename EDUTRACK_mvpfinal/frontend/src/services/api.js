const API_BASE = '/api';

export function getAuthToken() {
  return localStorage.getItem('edutrack_token') || '';
}

export function setAuthToken(token) {
  if (token) {
    localStorage.setItem('edutrack_token', token);
  } else {
    localStorage.removeItem('edutrack_token');
  }
}

export async function apiRequest(endpoint, options = {}) {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || 'Erro na requisição.');
  }

  return data;
}

export const api = {
  // Auth
  login: (email, password) => apiRequest('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (userData) => apiRequest('/auth/register', { method: 'POST', body: JSON.stringify(userData) }),
  requestPasswordReset: (email) => apiRequest('/auth/forgot-password/request', { method: 'POST', body: JSON.stringify({ email }) }),
  verifyResetCode: (email, code) => apiRequest('/auth/forgot-password/verify', { method: 'POST', body: JSON.stringify({ email, code }) }),
  resetPassword: (email, code, newPassword) => apiRequest('/auth/forgot-password/reset', { method: 'POST', body: JSON.stringify({ email, code, newPassword }) }),

  // User Profile
  getProfile: () => apiRequest('/user/profile'),
  updateProfile: (profileData) => apiRequest('/user/profile', { method: 'PUT', body: JSON.stringify(profileData) }),

  // Disciplines
  getDisciplines: () => apiRequest('/disciplines'),
  createDiscipline: (data) => apiRequest('/disciplines', { method: 'POST', body: JSON.stringify(data) }),
  updateDiscipline: (id, data) => apiRequest(`/disciplines/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteDiscipline: (id) => apiRequest(`/disciplines/${id}`, { method: 'DELETE' }),

  // Tasks
  getTasks: (disciplineId) => apiRequest(`/tasks${disciplineId ? `?discipline_id=${disciplineId}` : ''}`),
  createTask: (data) => apiRequest('/tasks', { method: 'POST', body: JSON.stringify(data) }),
  updateTask: (id, data) => apiRequest(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTask: (id) => apiRequest(`/tasks/${id}`, { method: 'DELETE' }),

  // Dashboard & Insights
  getDashboardStats: () => apiRequest('/dashboard/stats'),
};

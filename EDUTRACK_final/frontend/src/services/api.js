// ============================================================================
// EduTrack AI v2 - frontend/src/services/api.js
// Cliente HTTP com Access Token em memória e Silent Refresh via Cookie httpOnly
// ============================================================================

const API_BASE = '/api';

// Access Token mantido ESTRITAMENTE em memória (Seção 10.1)
let inMemoryAccessToken = null;
let isRefreshing = false;
let refreshSubscribers = [];
let onAuthFailureCallback = null;

export function setOnAuthFailure(callback) {
  onAuthFailureCallback = callback;
}

export function getAuthToken() {
  return inMemoryAccessToken;
}

export function setAuthToken(token) {
  inMemoryAccessToken = token || null;
}

function onRefreshed(newToken) {
  refreshSubscribers.forEach((callback) => callback(newToken));
  refreshSubscribers = [];
}

function addRefreshSubscriber(callback) {
  refreshSubscribers.push(callback);
}

export async function apiRequest(endpoint, options = {}, isRetry = false) {
  const headers = {
    'Content-Type': 'application/json',
    ...(inMemoryAccessToken ? { 'Authorization': `Bearer ${inMemoryAccessToken}` } : {}),
    ...options.headers,
  };

  const config = {
    ...options,
    headers,
    credentials: 'include', // Essencial para envio e recebimento do cookie de refresh httpOnly
  };

  const response = await fetch(`${API_BASE}${endpoint}`, config);

  // Tratamento de renovação silenciosa em caso de 401 (Seção 10.1)
  if (response.status === 401 && !isRetry && !endpoint.startsWith('/auth/login') && !endpoint.startsWith('/auth/refresh')) {
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        addRefreshSubscriber((newToken) => {
          if (!newToken) {
            reject(new Error('Sessão expirada.'));
          } else {
            resolve(apiRequest(endpoint, options, true));
          }
        });
      });
    }

    isRefreshing = true;

    try {
      const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (!refreshRes.ok) {
        setAuthToken(null);
        isRefreshing = false;
        onRefreshed(null);
        if (onAuthFailureCallback) onAuthFailureCallback();
        const errData = await refreshRes.json().catch(() => ({}));
        throw new Error(errData.erro || 'Sessão expirada. Faça login novamente.');
      }

      const refreshData = await refreshRes.json();
      setAuthToken(refreshData.token);
      isRefreshing = false;
      onRefreshed(refreshData.token);

      // Repete a requisição original com o novo token
      return apiRequest(endpoint, options, true);
    } catch (err) {
      setAuthToken(null);
      isRefreshing = false;
      onRefreshed(null);
      if (onAuthFailureCallback) onAuthFailureCallback();
      throw err;
    }
  }

  // Tratamento de resposta
  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/pdf')) {
    return response.blob();
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.erro || data.error || data.mensagem || 'Erro na requisição.';
    const error = new Error(errorMsg);
    error.status = response.status;
    error.codigo = data.codigo;
    error.detalhes = data.detalhes;
    throw error;
  }

  return data;
}

export const api = {
  // Autenticação (Fase 2)
  login: async (email, password) => {
    const res = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setAuthToken(res.token);
    return res;
  },

  register: async (userData) => {
    const res = await apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    setAuthToken(res.token);
    return res;
  },

  refreshToken: async () => {
    const res = await apiRequest('/auth/refresh', { method: 'POST' });
    setAuthToken(res.token);
    return res;
  },

  logout: async () => {
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
    } finally {
      setAuthToken(null);
    }
  },

  requestPasswordReset: (email) =>
    apiRequest('/auth/forgot-password/request', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  verifyResetCode: (email, code) =>
    apiRequest('/auth/forgot-password/verify', {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    }),

  resetPassword: (email, code, newPassword) =>
    apiRequest('/auth/forgot-password/reset', {
      method: 'POST',
      body: JSON.stringify({ email, code, newPassword }),
    }),

  // Perfil do Usuário
  getProfile: () => apiRequest('/user/profile'),
  updateProfile: (profileData) =>
    apiRequest('/user/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    }),

  // Disciplinas
  getDisciplines: () => apiRequest('/disciplines'),
  createDiscipline: (data) =>
    apiRequest('/disciplines', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateDiscipline: (id, data) =>
    apiRequest(`/disciplines/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteDiscipline: (id) =>
    apiRequest(`/disciplines/${id}`, {
      method: 'DELETE',
    }),

  // Tarefas com filtros no servidor e paginação (Seção 6.3)
  getTasks: (filters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        params.append(key, val);
      }
    });
    const queryString = params.toString();
    return apiRequest(`/tarefas${queryString ? `?${queryString}` : ''}`);
  },

  createTask: (data) =>
    apiRequest('/tarefas', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateTask: (id, data) =>
    apiRequest(`/tarefas/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteTask: (id) =>
    apiRequest(`/tarefas/${id}`, {
      method: 'DELETE',
    }),

  // Busca Global agrupada (Seção 6.2)
  globalSearch: (query) =>
    apiRequest(`/busca?q=${encodeURIComponent(query || '')}`),

  // Sessões e Cronômetro (Seção 3)
  getActiveSession: () => apiRequest('/sessoes/ativa'),
  startSession: (taskId) =>
    apiRequest(`/tarefas/${taskId}/sessoes/iniciar`, { method: 'POST' }),
  pauseSession: (sessionId) =>
    apiRequest(`/sessoes/${sessionId}/pausar`, { method: 'POST' }),
  getTaskSessions: (taskId) =>
    apiRequest(`/tarefas/${taskId}/sessoes`),
  createManualSession: (taskId, sessionData) =>
    apiRequest(`/tarefas/${taskId}/sessoes`, {
      method: 'POST',
      body: JSON.stringify(sessionData),
    }),
  updateSession: (sessionId, sessionData) =>
    apiRequest(`/sessoes/${sessionId}`, {
      method: 'PUT',
      body: JSON.stringify(sessionData),
    }),
  deleteSession: (sessionId) =>
    apiRequest(`/sessoes/${sessionId}`, {
      method: 'DELETE',
    }),

  // Dashboard & Métricas Avançadas (Seção 4)
  getDashboardStats: () => apiRequest('/dashboard/stats'),
  getDashboardMetrics: () => apiRequest('/dashboard/metricas'),

  // Insights IA / Regras Híbridos (Seção 5)
  getInsights: (forcar = false) =>
    apiRequest(`/insights${forcar ? '?forcar=true' : ''}`),

  // Relatório Semanal em PDF (Seção 7)
  requestWeeklyReport: (semanaInicio) =>
    apiRequest('/relatorios/semanal', {
      method: 'POST',
      body: JSON.stringify(semanaInicio ? { semana_inicio: semanaInicio } : {}),
    }),
  getReportJobStatus: (jobId) =>
    apiRequest(`/relatorios/semanal/${jobId}`),
  downloadReportPdf: (jobId) =>
    apiRequest(`/relatorios/semanal/${jobId}/arquivo`),
};

// ============================================================================
// EduTrack AI v2 - frontend/src/context/AuthContext.jsx
// Autenticação com Access Token em memória e Renovação Silenciosa por Cookie
// ============================================================================

import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, setAuthToken, setOnAuthFailure } from '../services/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Inicialização: tenta restaurar a sessão via refresh token silencioso (cookie httpOnly)
  useEffect(() => {
    setOnAuthFailure(() => {
      setUser(null);
    });

    async function initializeAuth() {
      try {
        // Tenta renovar token com o cookie httpOnly
        const refreshRes = await api.refreshToken();
        if (refreshRes && refreshRes.token) {
          const profile = await api.getProfile();
          setUser(profile);
        } else {
          setUser(null);
        }
      } catch (err) {
        // Sem sessão ativa válida
        setAuthToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    initializeAuth();
  }, []);

  const login = async (email, password) => {
    const res = await api.login(email, password);
    setUser(res.user);
    return res;
  };

  const register = async (userData) => {
    const res = await api.register(userData);
    setUser(res.user);
    return res;
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch (err) {
      console.error('Erro ao encerrar sessão no servidor:', err);
    } finally {
      setAuthToken(null);
      setUser(null);
    }
  };

  const updateUser = (updatedUser) => {
    setUser((prev) => ({ ...prev, ...updatedUser }));
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}

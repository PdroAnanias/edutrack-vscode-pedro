// ============================================================================
// EduTrack AI v2 - frontend/src/pages/Login.jsx
// Tela de Login com Alternador de Tema, Acessibilidade WCAG e Demo Rápido
// ============================================================================

import React, { useState } from 'react';
import { Eye, EyeOff, Sparkles, BookOpen, AlertCircle, Sun, Moon, Laptop } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function Login({ onNavigate }) {
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
    } catch (err) {
      setError(err.message || 'E-mail ou senha inválidos.');
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemo = () => {
    setEmail('aluno@edutrack.ai');
    setPassword('123456');
    setError('');
  };

  return (
    <div className="min-h-screen bg-brand-light dark:bg-brand-dark-bg flex items-center justify-center p-4 relative transition-colors duration-200">
      {/* Botão de Alternar Tema no Canto Superior Direito */}
      <div className="absolute top-4 right-4 z-20">
        <button
          onClick={toggleTheme}
          className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl bg-white dark:bg-brand-dark-surface border border-brand-light-hover dark:border-brand-dark-card text-brand-dark dark:text-brand-light hover:text-brand-gold shadow-sm flex items-center justify-center transition"
          title={`Tema: ${theme}. Clique para alternar.`}
          aria-label="Alternar tema de cores"
        >
          {theme === 'escuro' ? <Moon className="w-5 h-5 text-brand-gold" /> :
           theme === 'claro' ? <Sun className="w-5 h-5 text-amber-500" /> :
           <Laptop className="w-5 h-5" />}
        </button>
      </div>

      <div className="relative w-full max-w-md bg-white dark:bg-brand-dark border border-brand-light dark:border-brand-dark-card rounded-2xl p-6 sm:p-8 shadow-2xl transition-all">
        {/* Header / Brand */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-gold/15 text-brand-gold border border-brand-gold/30 mb-3 shadow-inner">
            <BookOpen className="w-7 h-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-brand-dark dark:text-brand-light tracking-tight flex items-center justify-center gap-2">
            EduTrack AI
            <span className="text-xs bg-brand-gold text-brand-dark px-1.5 py-0.5 rounded font-black tracking-wider">v2</span>
          </h1>
          <p className="text-xs sm:text-sm text-brand-text-secondary-light dark:text-brand-light/60 mt-1">
            Gestão inteligente do seu progresso acadêmico
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-100 dark:bg-red-950/60 border border-red-300 dark:border-red-800 text-red-800 dark:text-red-300 flex items-start gap-2.5 text-xs sm:text-sm">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-brand-dark dark:text-brand-light mb-1.5">
              E-mail Institucional
            </label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu.email@faculdade.edu.br"
              className="w-full px-3.5 py-2.5 rounded-xl border border-brand-light-hover dark:border-brand-dark-card bg-brand-light/30 dark:bg-brand-dark-surface text-brand-dark dark:text-white text-base focus:ring-2 focus:ring-brand-gold outline-none"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-brand-dark dark:text-brand-light">
                Senha de Acesso
              </label>
              <button
                type="button"
                onClick={() => onNavigate('forgot-email')}
                className="text-xs font-semibold text-brand-gold-text-light dark:text-brand-gold hover:underline p-1"
              >
                Esqueceu a senha?
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-3.5 pr-11 py-2.5 rounded-xl border border-brand-light-hover dark:border-brand-dark-card bg-brand-light/30 dark:bg-brand-dark-surface text-brand-dark dark:text-white text-base focus:ring-2 focus:ring-brand-gold outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-brand-dark/40 dark:text-brand-light/40 hover:text-brand-dark dark:hover:text-white"
                aria-label={showPassword ? 'Ocultar senha' : 'Exibir senha'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-[48px] bg-brand-gold hover:bg-brand-gold-hover text-brand-dark font-bold text-sm rounded-xl shadow-md transition-all active:scale-[0.99] disabled:opacity-50 mt-2 flex items-center justify-center"
          >
            {loading ? 'Entrando no sistema...' : 'Entrar no EduTrack'}
          </button>
        </form>

        {/* Demo Fast Fill Button */}
        <div className="mt-4 pt-4 border-t border-brand-light dark:border-brand-dark-card text-center">
          <button
            type="button"
            onClick={handleFillDemo}
            className="text-xs text-brand-text-secondary-light dark:text-brand-light/50 hover:text-brand-gold transition underline decoration-dotted p-1"
          >
            Preencher dados do aluno de demonstração (demo)
          </button>
        </div>

        {/* Link para Cadastro */}
        <div className="mt-4 text-center">
          <p className="text-xs text-brand-text-secondary-light dark:text-brand-light/60">
            Ainda não possui conta?{' '}
            <button
              onClick={() => onNavigate('register')}
              className="font-bold text-brand-gold-text-light dark:text-brand-gold hover:underline p-1 ml-1"
            >
              Cadastre-se gratuitamente
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

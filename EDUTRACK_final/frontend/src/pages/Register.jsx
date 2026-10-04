// ============================================================================
// EduTrack AI v2 - frontend/src/pages/Register.jsx
// Cadastro de Aluno com Política de Senha de 8+ Caracteres e Alternador de Tema
// ============================================================================

import React, { useState } from 'react';
import { Eye, EyeOff, BookOpen, AlertCircle, ArrowLeft, Sun, Moon, Laptop } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const COURSES = [
  'Ciência da Computação',
  'Sistemas de Informação',
  'Análise e Desenvolvimento de Sistemas',
  'Engenharia de Software',
];

export default function Register({ onNavigate }) {
  const { register } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [formData, setFormData] = useState({
    name: '',
    surname: '',
    email: '',
    password: '',
    phone: '',
    course: 'Ciência da Computação'
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name || !formData.surname || !formData.email || !formData.password || !formData.course) {
      setError('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    if (formData.password.length < 8) {
      setError('A senha deve conter no mínimo 8 caracteres (política de segurança v2).');
      return;
    }

    setLoading(true);
    try {
      await register(formData);
    } catch (err) {
      setError(err.message || 'Falha ao realizar cadastro.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-light dark:bg-brand-dark-bg flex items-center justify-center p-4 py-8 relative transition-colors duration-200">
      {/* Botão de Alternar Tema */}
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

      <div className="relative w-full max-w-lg bg-white dark:bg-brand-dark border border-brand-light dark:border-brand-dark-card rounded-2xl p-6 sm:p-8 shadow-2xl transition-all">
        {/* Top bar with back button */}
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={() => onNavigate('login')}
            className="flex items-center gap-1.5 text-xs font-semibold text-brand-text-secondary-light dark:text-brand-light/70 hover:text-brand-gold transition min-h-[44px] pr-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para o login
          </button>
          <div className="inline-flex items-center gap-1.5 text-xs text-brand-gold font-bold bg-brand-gold/10 px-2.5 py-1 rounded-full border border-brand-gold/20">
            <BookOpen className="w-3.5 h-3.5" />
            EduTrack AI v2
          </div>
        </div>

        <div className="mb-5">
          <h1 className="text-xl sm:text-2xl font-bold text-brand-dark dark:text-brand-light">Criar nova conta</h1>
          <p className="text-xs sm:text-sm text-brand-text-secondary-light dark:text-brand-light/60 mt-1">
            Preencha seus dados acadêmicos para iniciar o acompanhamento.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-100 dark:bg-red-950/60 border border-red-300 dark:border-red-800 text-red-800 dark:text-red-300 flex items-start gap-2.5 text-xs sm:text-sm">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-brand-dark dark:text-brand-light mb-1">
                Nome *
              </label>
              <input
                type="text"
                required
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Ex: Pedro"
                className="w-full px-3 py-2 rounded-xl border border-brand-light-hover dark:border-brand-dark-card bg-brand-light/30 dark:bg-brand-dark-surface text-brand-dark dark:text-white text-base focus:ring-2 focus:ring-brand-gold outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-brand-dark dark:text-brand-light mb-1">
                Sobrenome *
              </label>
              <input
                type="text"
                required
                name="surname"
                value={formData.surname}
                onChange={handleChange}
                placeholder="Ex: Ananias"
                className="w-full px-3 py-2 rounded-xl border border-brand-light-hover dark:border-brand-dark-card bg-brand-light/30 dark:bg-brand-dark-surface text-brand-dark dark:text-white text-base focus:ring-2 focus:ring-brand-gold outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-brand-dark dark:text-brand-light mb-1">
              E-mail Institucional *
            </label>
            <input
              type="email"
              required
              autoComplete="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="seu.email@faculdade.edu.br"
              className="w-full px-3 py-2 rounded-xl border border-brand-light-hover dark:border-brand-dark-card bg-brand-light/30 dark:bg-brand-dark-surface text-brand-dark dark:text-white text-base focus:ring-2 focus:ring-brand-gold outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-brand-dark dark:text-brand-light mb-1">
              Senha (mínimo 8 caracteres) *
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={8}
                autoComplete="new-password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                className="w-full pl-3 pr-10 py-2 rounded-xl border border-brand-light-hover dark:border-brand-dark-card bg-brand-light/30 dark:bg-brand-dark-surface text-brand-dark dark:text-white text-base focus:ring-2 focus:ring-brand-gold outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-brand-dark/40 dark:text-brand-light/40"
                aria-label="Alternar visualização da senha"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-brand-dark dark:text-brand-light mb-1">
                Telefone (opcional)
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="(11) 99999-9999"
                className="w-full px-3 py-2 rounded-xl border border-brand-light-hover dark:border-brand-dark-card bg-brand-light/30 dark:bg-brand-dark-surface text-brand-dark dark:text-white text-base focus:ring-2 focus:ring-brand-gold outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-brand-dark dark:text-brand-light mb-1">
                Curso *
              </label>
              <select
                name="course"
                value={formData.course}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-xl border border-brand-light-hover dark:border-brand-dark-card bg-brand-light/30 dark:bg-brand-dark-surface text-brand-dark dark:text-white text-sm focus:ring-2 focus:ring-brand-gold outline-none"
              >
                {COURSES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-[48px] bg-brand-gold hover:bg-brand-gold-hover text-brand-dark font-bold text-sm rounded-xl shadow-md transition-all active:scale-[0.99] disabled:opacity-50 mt-3"
          >
            {loading ? 'Cadastrando...' : 'Finalizar Cadastro'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// EduTrack AI v2 - frontend/src/pages/Profile.jsx
// Configurações, Aparência (Temas/Fontes), Metas de Estudo e Privacidade
// ============================================================================

import React, { useState, useEffect } from 'react';
import {
  User,
  Mail,
  Phone,
  GraduationCap,
  Camera,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Save,
  Sun,
  Moon,
  Laptop,
  Type,
  Target,
  Bot,
  Shield
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/api';

const COURSES = [
  'Ciência da Computação',
  'Sistemas de Informação',
  'Análise e Desenvolvimento de Sistemas',
  'Engenharia de Software',
];

export default function Profile() {
  const { user, updateUser } = useAuth();
  const { theme, setTheme, textSize, setTextSize } = useTheme();

  const [formData, setFormData] = useState({
    name: '',
    surname: '',
    email: '',
    phone: '',
    course: 'Ciência da Computação',
    avatar: '',
    meta_semanal_horas: 15,
    ia_habilitada: true,
  });

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        surname: user.surname || '',
        email: user.email || '',
        phone: user.phone || '',
        course: user.course || 'Ciência da Computação',
        avatar: user.avatar || '',
        meta_semanal_horas: user.meta_semanal_horas || 15,
        ia_habilitada: user.ia_habilitada !== false,
      });

      if (user.tema_preferido) {
        setTheme(user.tema_preferido);
      }
      if (user.tamanho_texto) {
        setTextSize(user.tamanho_texto);
      }
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError('A imagem deve ter no máximo 2MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({ ...prev, avatar: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setSaving(true);

    try {
      const payload = {
        ...formData,
        meta_semanal_horas: parseFloat(formData.meta_semanal_horas) || 15,
        tema_preferido: theme,
        tamanho_texto: textSize,
        ia_habilitada: formData.ia_habilitada,
      };

      const res = await api.updateProfile(payload);
      if (res && res.user) {
        updateUser(res.user);
      }
      setMessage('Configurações e preferências salvas com sucesso!');
      setTimeout(() => setMessage(''), 4000);
    } catch (err) {
      setError(err.message || 'Erro ao atualizar dados do perfil.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 p-4 sm:p-6 md:p-8 space-y-8 max-w-4xl mx-auto">
      {/* Top Title */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-brand-dark dark:text-white tracking-tight">
          Perfil & Configurações
        </h1>
        <p className="text-brand-text-secondary-light dark:text-brand-text-secondary-dark text-xs sm:text-sm mt-1">
          Personalize sua aparência, metas semanais de horas e privacidade da IA.
        </p>
      </div>

      {message && (
        <div className="p-4 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-red-100 dark:bg-red-950/60 border border-red-300 dark:border-red-800 text-red-800 dark:text-red-300 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Seção 1: Aparência e Acessibilidade (Seção 10.5) */}
        <div className="bg-white dark:bg-brand-dark-surface p-6 rounded-2xl border border-brand-light dark:border-brand-dark-card shadow-sm space-y-5">
          <h2 className="text-base font-bold text-brand-dark dark:text-white flex items-center gap-2 border-b border-brand-light dark:border-brand-dark-card pb-3">
            <Sun className="w-5 h-5 text-brand-gold" />
            Aparência & Acessibilidade
          </h2>

          {/* Seletor de Tema */}
          <div>
            <label className="block text-xs font-semibold text-brand-dark dark:text-brand-light mb-2">
              Tema Visual da Interface
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setTheme('claro')}
                className={`min-h-[48px] p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                  theme === 'claro'
                    ? 'border-brand-gold bg-brand-gold/15 text-brand-dark font-bold ring-2 ring-brand-gold'
                    : 'border-brand-light-hover dark:border-brand-dark-card text-brand-dark dark:text-white hover:bg-brand-light/50'
                }`}
              >
                <Sun className="w-5 h-5 text-amber-500" />
                <span className="text-xs">Claro</span>
              </button>

              <button
                type="button"
                onClick={() => setTheme('escuro')}
                className={`min-h-[48px] p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                  theme === 'escuro'
                    ? 'border-brand-gold bg-brand-gold/15 text-brand-gold font-bold ring-2 ring-brand-gold'
                    : 'border-brand-light-hover dark:border-brand-dark-card text-brand-dark dark:text-white hover:bg-brand-light/50'
                }`}
              >
                <Moon className="w-5 h-5 text-brand-gold" />
                <span className="text-xs">Escuro</span>
              </button>

              <button
                type="button"
                onClick={() => setTheme('sistema')}
                className={`min-h-[48px] p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                  theme === 'sistema'
                    ? 'border-brand-gold bg-brand-gold/15 text-brand-gold font-bold ring-2 ring-brand-gold'
                    : 'border-brand-light-hover dark:border-brand-dark-card text-brand-dark dark:text-white hover:bg-brand-light/50'
                }`}
              >
                <Laptop className="w-5 h-5 text-blue-400" />
                <span className="text-xs">Automático</span>
              </button>
            </div>
          </div>

          {/* Seletor de Tamanho de Texto */}
          <div>
            <label className="block text-xs font-semibold text-brand-dark dark:text-brand-light mb-2">
              Tamanho do Texto (Escala da Fonte)
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'normal', label: 'Normal (100%)' },
                { id: 'grande', label: 'Grande (115%)' },
                { id: 'muito_grande', label: 'Muito Grande (130%)' },
              ].map((size) => (
                <button
                  key={size.id}
                  type="button"
                  onClick={() => setTextSize(size.id)}
                  className={`min-h-[44px] p-2.5 rounded-xl border text-xs font-medium transition-all ${
                    textSize === size.id
                      ? 'border-brand-gold bg-brand-gold/15 text-brand-gold-text-light dark:text-brand-gold font-bold ring-2 ring-brand-gold'
                      : 'border-brand-light-hover dark:border-brand-dark-card text-brand-dark dark:text-white hover:bg-brand-light/50'
                  }`}
                >
                  {size.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Seção 2: Metas Acadêmicas & Preferências de IA */}
        <div className="bg-white dark:bg-brand-dark-surface p-6 rounded-2xl border border-brand-light dark:border-brand-dark-card shadow-sm space-y-5">
          <h2 className="text-base font-bold text-brand-dark dark:text-white flex items-center gap-2 border-b border-brand-light dark:border-brand-dark-card pb-3">
            <Target className="w-5 h-5 text-brand-gold" />
            Metas de Estudo & Inteligência Artificial
          </h2>

          <div>
            <label className="block text-xs font-semibold text-brand-dark dark:text-brand-light mb-1">
              Meta Semanal de Dedicação (Horas)
            </label>
            <input
              type="number"
              step="1"
              min="1"
              max="100"
              name="meta_semanal_horas"
              value={formData.meta_semanal_horas}
              onChange={handleChange}
              className="w-full sm:w-64 px-3.5 py-2.5 rounded-xl border border-brand-light-hover dark:border-brand-dark-card bg-brand-light/20 dark:bg-brand-dark text-brand-dark dark:text-white text-base focus:ring-2 focus:ring-brand-gold outline-none"
            />
            <p className="text-[11px] text-brand-text-secondary-light dark:text-brand-text-secondary-dark mt-1">
              Utilizado na barra de progresso do Dashboard e nas linhas de meta dos gráficos.
            </p>
          </div>

          <div className="pt-2 border-t border-brand-light dark:border-brand-dark-card">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="ia_habilitada"
                checked={formData.ia_habilitada}
                onChange={handleChange}
                className="mt-1 w-4 h-4 rounded text-brand-gold focus:ring-brand-gold"
              />
              <div>
                <p className="text-sm font-bold text-brand-dark dark:text-white flex items-center gap-1.5">
                  <Bot className="w-4 h-4 text-purple-500" />
                  Habilitar Recomendações com IA (Google Gemini)
                </p>
                <p className="text-xs text-brand-text-secondary-light dark:text-brand-text-secondary-dark mt-0.5 leading-relaxed">
                  Quando desativado, o sistema continuará gerando recomendações baseando-se exclusivamente nas regras estatísticas determinísticas locais.
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Seção 3: Dados Pessoais e Cadastrais */}
        <div className="bg-white dark:bg-brand-dark-surface p-6 rounded-2xl border border-brand-light dark:border-brand-dark-card shadow-sm space-y-5">
          <h2 className="text-base font-bold text-brand-dark dark:text-white flex items-center gap-2 border-b border-brand-light dark:border-brand-dark-card pb-3">
            <User className="w-5 h-5 text-brand-gold" />
            Dados Cadastrais
          </h2>

          {/* Avatar Upload */}
          <div className="flex items-center gap-5">
            <div className="relative">
              {formData.avatar ? (
                <img
                  src={formData.avatar}
                  alt="Avatar"
                  className="w-16 h-16 rounded-full object-cover border-2 border-brand-gold shadow"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-brand-gold text-brand-dark font-black text-xl flex items-center justify-center border-2 border-brand-dark/20">
                  {formData.name?.[0] || 'U'}
                </div>
              )}
              <label
                htmlFor="avatar-upload"
                className="absolute -bottom-1 -right-1 p-1.5 bg-brand-dark text-white rounded-full cursor-pointer hover:bg-brand-dark-card shadow"
                title="Alterar foto"
              >
                <Camera className="w-3.5 h-3.5" />
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>
            <div>
              <p className="text-xs font-semibold text-brand-dark dark:text-white">Foto de Perfil</p>
              <p className="text-[11px] text-brand-text-secondary-light dark:text-brand-text-secondary-dark">
                Formatos permitidos: PNG, JPG ou WebP (máx. 2MB).
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-brand-dark dark:text-brand-light mb-1">
                Nome *
              </label>
              <input
                type="text"
                required
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 rounded-xl border border-brand-light-hover dark:border-brand-dark-card bg-brand-light/20 dark:bg-brand-dark text-brand-dark dark:text-white text-base focus:ring-2 focus:ring-brand-gold outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-brand-dark dark:text-brand-light mb-1">
                Sobrenome
              </label>
              <input
                type="text"
                name="surname"
                value={formData.surname}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 rounded-xl border border-brand-light-hover dark:border-brand-dark-card bg-brand-light/20 dark:bg-brand-dark text-brand-dark dark:text-white text-base focus:ring-2 focus:ring-brand-gold outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-brand-dark dark:text-brand-light mb-1">
                E-mail Institucional *
              </label>
              <input
                type="email"
                required
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 rounded-xl border border-brand-light-hover dark:border-brand-dark-card bg-brand-light/20 dark:bg-brand-dark text-brand-dark dark:text-white text-base focus:ring-2 focus:ring-brand-gold outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-brand-dark dark:text-brand-light mb-1">
                Telefone
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="(11) 99999-9999"
                className="w-full px-3.5 py-2.5 rounded-xl border border-brand-light-hover dark:border-brand-dark-card bg-brand-light/20 dark:bg-brand-dark text-brand-dark dark:text-white text-base focus:ring-2 focus:ring-brand-gold outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-brand-dark dark:text-brand-light mb-1">
              Curso de Graduação
            </label>
            <select
              name="course"
              value={formData.course}
              onChange={handleChange}
              className="w-full px-3.5 py-2.5 rounded-xl border border-brand-light-hover dark:border-brand-dark-card bg-brand-light/20 dark:bg-brand-dark text-brand-dark dark:text-white text-sm focus:ring-2 focus:ring-brand-gold outline-none"
            >
              {COURSES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Botão de Salvar */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="min-h-[44px] px-6 py-2.5 bg-brand-gold hover:bg-brand-gold-hover text-brand-dark font-bold text-sm rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Salvando...' : 'Salvar Alterações'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}

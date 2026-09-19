import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, GraduationCap, Camera, CheckCircle2, AlertCircle, Sparkles, Save } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

const COURSES = [
  'Ciência da Computação',
  'Sistemas de Informação',
  'Análise e Desenvolvimento de Sistemas'
];

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
];

export default function Profile() {
  const { user, updateUser } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    surname: '',
    email: '',
    phone: '',
    course: 'Ciência da Computação',
    avatar: ''
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
        avatar: user.avatar || ''
      });
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Handle local image file upload
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError('A imagem deve ter no máximo 2MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, avatar: reader.result }));
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
      const res = await api.updateProfile(formData);
      updateUser(res.user);
      setMessage('Informações de perfil salvas com sucesso!');
      setTimeout(() => setMessage(''), 4000);
    } catch (err) {
      setError(err.message || 'Erro ao atualizar dados do perfil.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 p-6 md:p-8 overflow-y-auto max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-brand-dark tracking-tight">
          Perfil e Configurações
        </h1>
        <p className="text-brand-dark/70 text-sm mt-1">
          Atualize seus dados cadastrais, curso e foto de identificação.
        </p>
      </div>

      {/* Notifications */}
      {message && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Photo / Avatar Section */}
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-brand-dark/10 shadow-sm">
          <h2 className="text-lg font-bold text-brand-dark mb-4 flex items-center gap-2">
            <Camera className="w-5 h-5 text-brand-gold" />
            Foto de Perfil
          </h2>

          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* Current Avatar */}
            <div className="relative">
              {formData.avatar ? (
                <img
                  src={formData.avatar}
                  alt="Avatar"
                  className="w-24 h-24 rounded-full object-cover border-4 border-brand-gold shadow-md"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-brand-dark text-brand-gold font-bold text-3xl flex items-center justify-center border-4 border-brand-gold/40 shadow-md">
                  {formData.name ? formData.name[0].toUpperCase() : 'U'}
                </div>
              )}
            </div>

            {/* Change controls */}
            <div className="flex-1 space-y-3 text-center sm:text-left">
              <div>
                <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-dark hover:bg-brand-dark-surface text-brand-light text-xs font-semibold shadow transition">
                  <Camera className="w-4 h-4 text-brand-gold" />
                  <span>Carregar foto do computador</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
                {formData.avatar && (
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, avatar: '' }))}
                    className="ml-2 text-xs text-red-600 hover:underline"
                  >
                    Remover foto
                  </button>
                )}
              </div>

              {/* Quick Select Presets */}
              <div>
                <p className="text-xs text-brand-dark/60 mb-2">Ou escolha um avatar pré-definido:</p>
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  {PRESET_AVATARS.map((url, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, avatar: url }))}
                      className="rounded-full overflow-hidden border-2 hover:border-brand-gold focus:border-brand-gold transition p-0.5"
                    >
                      <img src={url} alt={`Avatar ${i}`} className="w-9 h-9 rounded-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Informações Cadastrais */}
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-brand-dark/10 shadow-sm space-y-5">
          <h2 className="text-lg font-bold text-brand-dark flex items-center gap-2 pb-2 border-b border-brand-dark/10">
            <User className="w-5 h-5 text-brand-gold" />
            Dados Cadastrais
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Nome */}
            <div>
              <label className="block text-xs font-semibold text-brand-dark mb-1">
                Nome *
              </label>
              <input
                type="text"
                required
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 rounded-xl border border-brand-dark/20 text-sm focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold bg-brand-light/20 text-brand-dark"
              />
            </div>

            {/* Sobrenome */}
            <div>
              <label className="block text-xs font-semibold text-brand-dark mb-1">
                Sobrenome *
              </label>
              <input
                type="text"
                required
                name="surname"
                value={formData.surname}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 rounded-xl border border-brand-dark/20 text-sm focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold bg-brand-light/20 text-brand-dark"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* E-mail */}
            <div>
              <label className="block text-xs font-semibold text-brand-dark mb-1">
                Endereço de E-mail *
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 pl-10 rounded-xl border border-brand-dark/20 text-sm focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold bg-brand-light/20 text-brand-dark"
                />
                <Mail className="w-4 h-4 text-brand-dark/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            {/* Telefone */}
            <div>
              <label className="block text-xs font-semibold text-brand-dark mb-1">
                Telefone / Celular
              </label>
              <div className="relative">
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="(11) 98765-4321"
                  className="w-full px-3.5 py-2.5 pl-10 rounded-xl border border-brand-dark/20 text-sm focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold bg-brand-light/20 text-brand-dark"
                />
                <Phone className="w-4 h-4 text-brand-dark/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>
          </div>

          {/* Curso */}
          <div>
            <label className="block text-xs font-semibold text-brand-dark mb-1">
              Curso de Graduação *
            </label>
            <div className="relative">
              <select
                name="course"
                value={formData.course}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 pl-10 rounded-xl border border-brand-dark/20 text-sm focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold bg-brand-light/20 text-brand-dark cursor-pointer"
              >
                {COURSES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <GraduationCap className="w-4 h-4 text-brand-dark/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          {/* Salvar Button */}
          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-gold hover:bg-brand-gold-hover text-brand-dark font-semibold text-sm shadow-md transition disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Salvando...' : 'Salvar Alterações'}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

import React, { useState } from 'react';
import { Eye, EyeOff, BookOpen, AlertCircle, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const COURSES = [
  'Ciência da Computação',
  'Sistemas de Informação',
  'Análise e Desenvolvimento de Sistemas'
];

export default function Register({ onNavigate }) {
  const { register } = useAuth();
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
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name || !formData.surname || !formData.email || !formData.password || !formData.course) {
      setError('Por favor, preencha todos os campos obrigatórios.');
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
    <div className="min-h-screen bg-brand-dark flex items-center justify-center p-4 py-10">
      <div className="w-full max-w-lg bg-brand-dark border border-brand-light/10 rounded-2xl p-8 shadow-2xl backdrop-blur-sm">
        {/* Top bar with back button */}
        <div className="flex items-center justify-between mb-6">
          <button
            type="button"
            onClick={() => onNavigate('login')}
            className="flex items-center gap-1.5 text-xs text-brand-light/60 hover:text-brand-gold transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para login
          </button>
          <div className="inline-flex items-center gap-1.5 text-xs text-brand-gold font-medium bg-brand-gold/10 px-2.5 py-1 rounded-full border border-brand-gold/20">
            <BookOpen className="w-3.5 h-3.5" />
            Etrack-AI
          </div>
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-brand-light">Criar nova conta</h1>
          <p className="text-sm text-brand-light/60 mt-1">
            Cadastre-se para organizar suas disciplinas e tarefas com inteligência.
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-start gap-2.5 text-red-300 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Nome */}
            <div>
              <label className="block text-sm font-medium text-brand-light/80 mb-1">
                Nome *
              </label>
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                placeholder="João"
                className="w-full px-3.5 py-2.5 rounded-xl bg-brand-light/5 border border-brand-light/15 text-brand-light placeholder-brand-light/30 focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold transition"
              />
            </div>

            {/* Sobrenome */}
            <div>
              <label className="block text-sm font-medium text-brand-light/80 mb-1">
                Sobrenome *
              </label>
              <input
                type="text"
                name="surname"
                required
                value={formData.surname}
                onChange={handleChange}
                placeholder="Silva"
                className="w-full px-3.5 py-2.5 rounded-xl bg-brand-light/5 border border-brand-light/15 text-brand-light placeholder-brand-light/30 focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold transition"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-brand-light/80 mb-1">
              E-mail *
            </label>
            <input
              type="email"
              name="email"
              required
              value={formData.email}
              onChange={handleChange}
              placeholder="seu.email@universidade.edu.br"
              className="w-full px-3.5 py-2.5 rounded-xl bg-brand-light/5 border border-brand-light/15 text-brand-light placeholder-brand-light/30 focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold transition"
            />
          </div>

          {/* Senha */}
          <div>
            <label className="block text-sm font-medium text-brand-light/80 mb-1">
              Senha *
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                required
                value={formData.password}
                onChange={handleChange}
                placeholder="Crie uma senha forte"
                className="w-full px-3.5 py-2.5 pr-11 rounded-xl bg-brand-light/5 border border-brand-light/15 text-brand-light placeholder-brand-light/30 focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Ocultar senha' : 'Ver senha'}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-brand-light/50 hover:text-brand-light transition"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Telefone */}
          <div>
            <label className="block text-sm font-medium text-brand-light/80 mb-1">
              Telefone
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="(11) 98765-4321"
              className="w-full px-3.5 py-2.5 rounded-xl bg-brand-light/5 border border-brand-light/15 text-brand-light placeholder-brand-light/30 focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold transition"
            />
          </div>

          {/* Curso (Dropdown) */}
          <div>
            <label className="block text-sm font-medium text-brand-light/80 mb-1">
              Curso *
            </label>
            <div className="relative">
              <select
                name="course"
                value={formData.course}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#20223A] border border-brand-light/15 text-brand-light focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold transition cursor-pointer"
              >
                {COURSES.map((course) => (
                  <option key={course} value={course} className="bg-brand-dark text-brand-light">
                    {course}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Botão Entrar / Cadastrar */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-brand-gold hover:bg-brand-gold-hover text-brand-dark font-semibold text-base shadow-lg shadow-brand-gold/20 hover:shadow-brand-gold/30 transition duration-200 flex items-center justify-center disabled:opacity-50"
            >
              {loading ? 'Cadastrando...' : 'Entrar'}
            </button>
          </div>
        </form>

        <div className="mt-6 text-center pt-4 border-t border-brand-light/10">
          <p className="text-sm text-brand-light/70">
            Já possui uma conta?{' '}
            <button
              type="button"
              onClick={() => onNavigate('login')}
              className="text-brand-gold font-semibold hover:text-brand-gold-hover hover:underline ml-1"
            >
              Fazer login
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

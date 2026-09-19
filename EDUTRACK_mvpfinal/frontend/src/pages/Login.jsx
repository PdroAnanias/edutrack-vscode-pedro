import React, { useState } from 'react';
import { Eye, EyeOff, Sparkles, BookOpen, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Login({ onNavigate }) {
  const { login } = useAuth();
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
      setError(err.message || 'Falha ao realizar login.');
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
    <div className="min-h-screen bg-brand-dark flex items-center justify-center p-4">
      {/* Decorative background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-brand-gold blur-3xl"></div>
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-brand-light blur-3xl"></div>
      </div>

      <div className="relative w-full max-w-md bg-brand-dark border border-brand-light/10 rounded-2xl p-8 shadow-2xl backdrop-blur-sm">
        {/* Header / Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-gold/15 text-brand-gold border border-brand-gold/30 mb-4 shadow-inner">
            <BookOpen className="w-7 h-7" />
          </div>
          <h1 className="text-3xl font-bold text-brand-light tracking-tight flex items-center justify-center gap-2">
            Etrack-AI
            <Sparkles className="w-5 h-5 text-brand-gold" />
          </h1>
          <p className="text-sm text-brand-light/60 mt-1">
            Gestão inteligente do seu progresso acadêmico
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-start gap-2.5 text-red-300 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-brand-light/80 mb-1.5">
              E-mail
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu.email@universidade.edu.br"
              className="w-full px-4 py-3 rounded-xl bg-brand-light/5 border border-brand-light/15 text-brand-light placeholder-brand-light/30 focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold transition duration-200"
            />
          </div>

          {/* Senha */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium text-brand-light/80">
                Senha
              </label>
              <button
                type="button"
                onClick={() => onNavigate('forgot-email')}
                className="text-xs text-brand-gold hover:text-brand-gold-hover hover:underline transition"
              >
                Esqueceu sua senha?
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 pr-12 rounded-xl bg-brand-light/5 border border-brand-light/15 text-brand-light placeholder-brand-light/30 focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold transition duration-200"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Ocultar senha' : 'Ver senha'}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-brand-light/50 hover:text-brand-light transition"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Botão Entrar */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 rounded-xl bg-brand-gold hover:bg-brand-gold-hover text-brand-dark font-semibold text-base shadow-lg shadow-brand-gold/20 hover:shadow-brand-gold/30 transition duration-200 flex items-center justify-center disabled:opacity-50"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        {/* Demo Helper Pill */}
        <div className="mt-6 pt-4 border-t border-brand-light/10 text-center">
          <button
            type="button"
            onClick={handleFillDemo}
            className="text-xs text-brand-gold/80 hover:text-brand-gold hover:underline"
          >
            Usar dados de demonstração (aluno@edutrack.ai)
          </button>
        </div>

        {/* Direcionamento para cadastro */}
        <div className="mt-4 text-center">
          <p className="text-sm text-brand-light/70">
            Ainda não tem uma conta?{' '}
            <button
              type="button"
              onClick={() => onNavigate('register')}
              className="text-brand-gold font-semibold hover:text-brand-gold-hover hover:underline ml-1"
            >
              Cadastre-se
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

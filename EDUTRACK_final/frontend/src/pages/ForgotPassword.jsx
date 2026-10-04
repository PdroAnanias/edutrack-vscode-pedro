// ============================================================================
// EduTrack AI v2 - frontend/src/pages/ForgotPassword.jsx
// Recuperação de Senha em 3 Etapas com Código Numérico e Alternador de Tema
// ============================================================================

import React, { useState, useRef } from 'react';
import { ArrowLeft, Mail, KeyRound, Lock, Eye, EyeOff, CheckCircle2, AlertCircle, Sun, Moon, Laptop } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/api';

export default function ForgotPassword({ onNavigate, initialStep = 1 }) {
  const { theme, toggleTheme } = useTheme();

  const [step, setStep] = useState(initialStep); // 1: Email, 2: Code, 3: New Password
  const [email, setEmail] = useState('');
  const [codeDigits, setCodeDigits] = useState(['', '', '', '', '']);
  const [demoCode, setDemoCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // References for the 5 code input boxes
  const digitRefs = [useRef(), useRef(), useRef(), useRef(), useRef()];

  // STEP 1: Request code
  const handleRequestEmail = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.requestPasswordReset(email);
      if (res.demoCode) {
        setDemoCode(res.demoCode);
      }
      setStep(2);
    } catch (err) {
      setError(err.message || 'Erro ao processar solicitação.');
    } finally {
      setLoading(false);
    }
  };

  // Handle digit input with auto-advance and backspace navigation
  const handleDigitChange = (index, value) => {
    const char = value.slice(-1);
    const newDigits = [...codeDigits];
    newDigits[index] = char;
    setCodeDigits(newDigits);

    if (char && index < 4) {
      digitRefs[index + 1].current?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !codeDigits[index] && index > 0) {
      digitRefs[index - 1].current?.focus();
    }
  };

  const handlePasteCode = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').trim().slice(0, 5);
    if (pasted) {
      const newDigits = [...codeDigits];
      for (let i = 0; i < 5; i++) {
        newDigits[i] = pasted[i] || '';
      }
      setCodeDigits(newDigits);
      const nextFocus = Math.min(pasted.length, 4);
      digitRefs[nextFocus].current?.focus();
    }
  };

  // STEP 2: Verify 5-digit code
  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setError('');
    const fullCode = codeDigits.join('');
    if (fullCode.length < 5) {
      setError('Por favor, informe os 5 dígitos do código.');
      return;
    }

    setLoading(true);
    try {
      await api.verifyResetCode(email, fullCode);
      setStep(3);
    } catch (err) {
      setError(err.message || 'Código de verificação inválido ou expirado.');
    } finally {
      setLoading(false);
    }
  };

  // STEP 3: Reset password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');

    if (!newPassword || !confirmPassword) {
      setError('Preencha a nova senha e a confirmação.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem. Verifique e tente novamente.');
      return;
    }

    if (newPassword.length < 8) {
      setError('A nova senha deve conter no mínimo 8 caracteres.');
      return;
    }

    setLoading(true);
    try {
      const fullCode = codeDigits.join('');
      const res = await api.resetPassword(email, fullCode, newPassword);
      setSuccessMsg(res.message || 'Senha alterada com sucesso! Redirecionando...');
      setTimeout(() => {
        onNavigate('login');
      }, 2000);
    } catch (err) {
      setError(err.message || 'Erro ao redefinir a senha.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-light dark:bg-brand-dark-bg flex items-center justify-center p-4 relative transition-colors duration-200">
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

      <div className="relative w-full max-w-md bg-white dark:bg-brand-dark border border-brand-light dark:border-brand-dark-card rounded-2xl p-6 sm:p-8 shadow-2xl transition-all">
        {/* Top Back Nav */}
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={() => {
              if (step > 1) setStep(step - 1);
              else onNavigate('login');
            }}
            className="flex items-center gap-1.5 text-xs font-semibold text-brand-text-secondary-light dark:text-brand-light/70 hover:text-brand-gold transition min-h-[44px] pr-2"
          >
            <ArrowLeft className="w-4 h-4" />
            {step > 1 ? 'Voltar etapa' : 'Voltar ao Login'}
          </button>
          <span className="text-xs text-brand-text-secondary-light dark:text-brand-light/40 font-mono">
            Etapa {step} de 3
          </span>
        </div>

        {/* Step Indicator Badges */}
        <div className="flex gap-2 mb-6">
          <div className={`h-1.5 flex-1 rounded-full ${step >= 1 ? 'bg-brand-gold' : 'bg-brand-light dark:bg-brand-dark-card'}`} />
          <div className={`h-1.5 flex-1 rounded-full ${step >= 2 ? 'bg-brand-gold' : 'bg-brand-light dark:bg-brand-dark-card'}`} />
          <div className={`h-1.5 flex-1 rounded-full ${step >= 3 ? 'bg-brand-gold' : 'bg-brand-light dark:bg-brand-dark-card'}`} />
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-100 dark:bg-red-950/60 border border-red-300 dark:border-red-800 text-red-800 dark:text-red-300 flex items-start gap-2.5 text-xs sm:text-sm">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 flex items-start gap-2.5 text-xs sm:text-sm">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* ETAPA 1: DIGITAR E-MAIL */}
        {step === 1 && (
          <div>
            <div className="text-center mb-5">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-brand-gold/15 text-brand-gold mb-3">
                <Mail className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-brand-dark dark:text-brand-light">Recuperar Senha</h2>
              <p className="text-xs text-brand-text-secondary-light dark:text-brand-light/60 mt-1">
                Digite o e-mail cadastrado para receber o código numérico de validação.
              </p>
            </div>

            <form onSubmit={handleRequestEmail} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-brand-dark dark:text-brand-light mb-1">
                  E-mail Cadastrado
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

              <button
                type="submit"
                disabled={loading}
                className="w-full min-h-[48px] bg-brand-gold hover:bg-brand-gold-hover text-brand-dark font-bold text-sm rounded-xl shadow-md transition-all active:scale-[0.99] disabled:opacity-50 mt-2"
              >
                {loading ? 'Enviando código...' : 'Continuar'}
              </button>
            </form>
          </div>
        )}

        {/* ETAPA 2: DIGITAR CÓDIGO (5 DÍGITOS) */}
        {step === 2 && (
          <div>
            <div className="text-center mb-5">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-brand-gold/15 text-brand-gold mb-3">
                <KeyRound className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-brand-dark dark:text-brand-light">Código de Validação</h2>
              <p className="text-xs text-brand-text-secondary-light dark:text-brand-light/60 mt-1">
                Insira o código de 5 dígitos enviado para <b>{email}</b>.
              </p>
            </div>

            {demoCode && (
              <div className="mb-4 p-2.5 bg-brand-gold/15 border border-brand-gold/40 text-brand-gold-text-light dark:text-brand-gold text-xs rounded-xl text-center">
                Código para teste em desenvolvimento: <b className="font-mono text-sm tracking-widest">{demoCode}</b>
              </div>
            )}

            <form onSubmit={handleVerifyCode} className="space-y-5">
              <div className="flex justify-center gap-2 sm:gap-3" onPaste={handlePasteCode}>
                {codeDigits.map((digit, index) => (
                  <input
                    key={index}
                    ref={digitRefs[index]}
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleDigitChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e.target.value)}
                    aria-label={`Dígito ${index + 1} do código`}
                    className="w-12 h-14 text-center font-mono text-xl font-bold rounded-xl border border-brand-light-hover dark:border-brand-dark-card bg-brand-light/30 dark:bg-brand-dark-surface text-brand-dark dark:text-white focus:ring-2 focus:ring-brand-gold outline-none"
                  />
                ))}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full min-h-[48px] bg-brand-gold hover:bg-brand-gold-hover text-brand-dark font-bold text-sm rounded-xl shadow-md transition-all active:scale-[0.99] disabled:opacity-50"
              >
                {loading ? 'Verificando...' : 'Validar Código'}
              </button>
            </form>
          </div>
        )}

        {/* ETAPA 3: NOVA SENHA */}
        {step === 3 && (
          <div>
            <div className="text-center mb-5">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-brand-gold/15 text-brand-gold mb-3">
                <Lock className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-brand-dark dark:text-brand-light">Criar Nova Senha</h2>
              <p className="text-xs text-brand-text-secondary-light dark:text-brand-light/60 mt-1">
                Escolha uma nova senha de no mínimo 8 caracteres.
              </p>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-brand-dark dark:text-brand-light mb-1">
                  Nova Senha (mín. 8 caracteres)
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-3 pr-10 py-2.5 rounded-xl border border-brand-light-hover dark:border-brand-dark-card bg-brand-light/30 dark:bg-brand-dark-surface text-brand-dark dark:text-white text-base focus:ring-2 focus:ring-brand-gold outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-brand-dark/40 dark:text-brand-light/40"
                    aria-label="Alternar exibição da senha"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-brand-dark dark:text-brand-light mb-1">
                  Confirmar Nova Senha
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-3 pr-10 py-2.5 rounded-xl border border-brand-light-hover dark:border-brand-dark-card bg-brand-light/30 dark:bg-brand-dark-surface text-brand-dark dark:text-white text-base focus:ring-2 focus:ring-brand-gold outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-brand-dark/40 dark:text-brand-light/40"
                    aria-label="Alternar exibição da confirmação de senha"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full min-h-[48px] bg-brand-gold hover:bg-brand-gold-hover text-brand-dark font-bold text-sm rounded-xl shadow-md transition-all active:scale-[0.99] disabled:opacity-50 mt-2"
              >
                {loading ? 'Atualizando senha...' : 'Salvar Nova Senha'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

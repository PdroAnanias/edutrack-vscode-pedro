import React, { useState, useRef } from 'react';
import { ArrowLeft, Mail, KeyRound, Lock, Eye, EyeOff, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { api } from '../services/api';

export default function ForgotPassword({ onNavigate, initialStep = 1 }) {
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
    // Only accept 1 char or clean
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
      setError(err.message || 'Código inválido.');
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

    if (newPassword.length < 6) {
      setError('A senha deve conter no mínimo 6 caracteres.');
      return;
    }

    setLoading(true);
    try {
      const fullCode = codeDigits.join('');
      const res = await api.resetPassword(email, fullCode, newPassword);
      setSuccessMsg(res.message);
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
    <div className="min-h-screen bg-brand-dark flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-brand-dark border border-brand-light/10 rounded-2xl p-8 shadow-2xl backdrop-blur-sm">
        {/* Top Back Nav */}
        <div className="flex items-center justify-between mb-6">
          <button
            type="button"
            onClick={() => {
              if (step > 1) setStep(step - 1);
              else onNavigate('login');
            }}
            className="flex items-center gap-1.5 text-xs text-brand-light/60 hover:text-brand-gold transition"
          >
            <ArrowLeft className="w-4 h-4" />
            {step > 1 ? 'Voltar etapa' : 'Voltar ao Login'}
          </button>
          <span className="text-xs text-brand-light/40 font-mono">
            Etapa {step} de 3
          </span>
        </div>

        {/* Step Indicator Badges */}
        <div className="flex gap-2 mb-6">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                s === step
                  ? 'bg-brand-gold shadow-sm shadow-brand-gold'
                  : s < step
                  ? 'bg-brand-gold/60'
                  : 'bg-brand-light/10'
              }`}
            />
          ))}
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-5 p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-start gap-2.5 text-red-300 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-5 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-2.5 text-emerald-300 text-sm">
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* ======================================================= */}
        {/* TELA 1: ESQUECEU A SENHA EMAIL */}
        {/* ======================================================= */}
        {step === 1 && (
          <div>
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-brand-gold/15 text-brand-gold border border-brand-gold/30 mb-3">
                <Mail className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold text-brand-light">Recuperação de Senha</h2>
              <p className="text-sm text-brand-light/70 mt-2 leading-relaxed">
                Informe o endereço de e-mail associado à sua conta do EduTrack AI para enviarmos um código de verificação.
              </p>
            </div>

            <form onSubmit={handleRequestEmail} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-brand-light/80 mb-1.5">
                  E-mail cadastrado
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu.email@universidade.edu.br"
                  className="w-full px-4 py-3 rounded-xl bg-brand-light/5 border border-brand-light/15 text-brand-light placeholder-brand-light/30 focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold transition"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 rounded-xl bg-brand-gold hover:bg-brand-gold-hover text-brand-dark font-semibold text-base shadow-lg shadow-brand-gold/20 hover:shadow-brand-gold/30 transition flex items-center justify-center disabled:opacity-50"
              >
                {loading ? 'Enviando código...' : 'Prosseguir para verificação'}
              </button>
            </form>
          </div>
        )}

        {/* ======================================================= */}
        {/* TELA 2: ESQUECEU A SENHA CONFIRMAÇÃO EMAIL (5 CAMPOS) */}
        {/* ======================================================= */}
        {step === 2 && (
          <div>
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-brand-gold/15 text-brand-gold border border-brand-gold/30 mb-3">
                <KeyRound className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold text-brand-light">Confirmação de E-mail</h2>
              <p className="text-sm text-brand-light/70 mt-2 leading-relaxed">
                Digite os 5 caracteres do código de segurança enviado para <strong className="text-brand-light">{email}</strong>.
              </p>

              {demoCode && (
                <div className="mt-3 inline-block px-3 py-1 rounded-lg bg-brand-gold/10 border border-brand-gold/30 text-brand-gold text-xs font-mono">
                  Código gerado: <strong>{demoCode}</strong>
                </div>
              )}
            </div>

            <form onSubmit={handleVerifyCode} className="space-y-6">
              {/* 5 separate boxes */}
              <div className="flex justify-center gap-3" onPaste={handlePasteCode}>
                {codeDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={digitRefs[idx]}
                    type="text"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleDigitChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    className="w-12 h-14 text-center text-2xl font-bold font-mono rounded-xl bg-brand-light/5 border border-brand-light/20 text-brand-gold focus:outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/50 transition"
                  />
                ))}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 rounded-xl bg-brand-gold hover:bg-brand-gold-hover text-brand-dark font-semibold text-base shadow-lg shadow-brand-gold/20 hover:shadow-brand-gold/30 transition flex items-center justify-center disabled:opacity-50"
              >
                {loading ? 'Validando...' : 'Prosseguir para nova senha'}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={handleRequestEmail}
                  className="text-xs text-brand-light/50 hover:text-brand-gold transition"
                >
                  Não recebeu o código? Reenviar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ======================================================= */}
        {/* TELA 3: ESQUECEU A SENHA, NOVA SENHA */}
        {/* ======================================================= */}
        {step === 3 && (
          <div>
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-brand-gold/15 text-brand-gold border border-brand-gold/30 mb-3">
                <Lock className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold text-brand-light">Criar Nova Senha</h2>
              <p className="text-sm text-brand-light/70 mt-2 leading-relaxed">
                Crie uma senha segura para proteger seu acesso ao EduTrack AI.
              </p>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-4">
              {/* Campo Nova Senha */}
              <div>
                <label className="block text-sm font-medium text-brand-light/80 mb-1.5">
                  Nova Senha
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo de 6 caracteres"
                    className="w-full px-4 py-3 pr-12 rounded-xl bg-brand-light/5 border border-brand-light/15 text-brand-light placeholder-brand-light/30 focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    aria-label={showNewPassword ? 'Ocultar senha' : 'Ver senha'}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-brand-light/50 hover:text-brand-light transition"
                  >
                    {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Campo Confirmar Senha */}
              <div>
                <label className="block text-sm font-medium text-brand-light/80 mb-1.5">
                  Confirmar Nova Senha
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita a nova senha"
                    className="w-full px-4 py-3 pr-12 rounded-xl bg-brand-light/5 border border-brand-light/15 text-brand-light placeholder-brand-light/30 focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? 'Ocultar senha' : 'Ver senha'}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-brand-light/50 hover:text-brand-light transition"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 rounded-xl bg-brand-gold hover:bg-brand-gold-hover text-brand-dark font-semibold text-base shadow-lg shadow-brand-gold/20 hover:shadow-brand-gold/30 transition flex items-center justify-center disabled:opacity-50"
              >
                {loading ? 'Salvando...' : 'Salvar e Voltar ao Login'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

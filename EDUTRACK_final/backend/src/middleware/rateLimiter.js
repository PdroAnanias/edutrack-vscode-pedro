// ============================================================================
// EduTrack AI v2 - backend/src/middleware/rateLimiter.js
// Rate limiters para proteção contra força bruta e sobrecarga da API
// ============================================================================

const rateLimit = require('express-rate-limit');

// Limite global: 300 requisições por minuto por IP/usuário
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    erro: 'Muitas requisições simultâneas. Por favor, aguarde alguns instantes.',
    codigo: 'RATE_LIMIT_GLOBAL'
  }
});

// Limite de login: 5 tentativas por minuto por IP
const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    erro: 'Muitas tentativas de login consecutivas. Tente novamente em 1 minuto.',
    codigo: 'RATE_LIMIT_LOGIN'
  }
});

// Limite de recuperação de senha: 3 solicitações por 5 minutos
const forgotPasswordLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    erro: 'Muitas tentativas de recuperação de senha. Aguarde 5 minutos.',
    codigo: 'RATE_LIMIT_FORGOT_PASSWORD'
  }
});

// Limite de relatórios: 2 gerações por minuto por usuário
const reportLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 2,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    erro: 'Aguarde antes de solicitar outro relatório em PDF.',
    codigo: 'RATE_LIMIT_REPORT'
  }
});

module.exports = {
  globalLimiter,
  loginLimiter,
  forgotPasswordLimiter,
  reportLimiter
};

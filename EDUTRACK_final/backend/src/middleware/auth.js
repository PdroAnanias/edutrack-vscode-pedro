// ============================================================================
// EduTrack AI v2 - backend/src/middleware/auth.js
// Middleware global de autenticação JWT e isolamento de usuário
// ============================================================================

const { verifyAccessToken } = require('../utils/token');

const PUBLIC_ROUTES = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/refresh',
  '/api/auth/forgot-password/request',
  '/api/auth/forgot-password/verify',
  '/api/auth/forgot-password/reset',
  '/api/health'
];

function authMiddleware(req, res, next) {
  // Ignorar rotas públicas e requisições OPTIONS
  if (req.method === 'OPTIONS' || PUBLIC_ROUTES.includes(req.path) || req.path.startsWith('/v1/')) {
    return next();
  }

  // Permitir rotas estáticas do frontend
  if (!req.path.startsWith('/api/')) {
    return next();
  }

  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      erro: 'Token de autenticação não fornecido.',
      codigo: 'AUTH_TOKEN_MISSING'
    });
  }

  const token = authHeader.substring(7);
  const payload = verifyAccessToken(token);

  if (!payload || !payload.sub) {
    return res.status(401).json({
      erro: 'Sessão inválida ou expirada. Efetue login novamente.',
      codigo: 'AUTH_TOKEN_INVALID'
    });
  }

  req.userId = parseInt(payload.sub, 10);
  next();
}

module.exports = {
  authMiddleware,
  PUBLIC_ROUTES
};

// ============================================================================
// EduTrack AI v2 - backend/src/utils/token.js
// Emissão e validação de JWT e refresh tokens rotativos com SHA-256
// ============================================================================

const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_key_change_me_in_env_file_32_chars!';
const ACCESS_TTL = process.env.JWT_ACCESS_TTL || '15m';
const REFRESH_TTL_DAYS = parseInt(process.env.JWT_REFRESH_TTL_DAYS || '7', 10);

/**
 * Emite um Access Token JWT com validade de 15 minutos
 */
function generateAccessToken(userId) {
  return jwt.sign(
    {
      sub: userId,
      jti: crypto.randomUUID()
    },
    JWT_SECRET,
    {
      algorithm: 'HS256',
      expiresIn: ACCESS_TTL
    }
  );
}

/**
 * Valida o Access Token JWT fixando o algoritmo HS256
 */
function verifyAccessToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
  } catch (err) {
    return null;
  }
}

/**
 * Gera um Refresh Token opaco de 256 bits e seu respectivo hash SHA-256
 */
function generateRefreshToken() {
  const token = crypto.randomBytes(32).toString('hex');
  const hash = hashToken(token);
  const expiresAt = new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000);
  return { token, hash, expiresAt };
}

/**
 * Calcula o hash SHA-256 de um token
 */
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Configuração padronizada para o cookie httpOnly do refresh token
 */
function getRefreshCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/auth',
    maxAge: REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000
  };
}

module.exports = {
  generateAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  hashToken,
  getRefreshCookieOptions
};

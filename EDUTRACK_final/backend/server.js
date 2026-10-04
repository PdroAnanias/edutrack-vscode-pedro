// ============================================================================
// EduTrack AI v2 - backend/server.js
// Servidor Principal Node.js / Express sobre Microsoft SQL Server
// ============================================================================

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const path = require('path');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const { sql, query, transaction, healthCheck } = require('./src/db');
const { 
  generateAccessToken, 
  generateRefreshToken, 
  hashToken, 
  getRefreshCookieOptions 
} = require('./src/utils/token');
const { authMiddleware } = require('./src/middleware/auth');
const { 
  globalLimiter, 
  loginLimiter, 
  forgotPasswordLimiter, 
  reportLimiter 
} = require('./src/middleware/rateLimiter');
const { recordActivity } = require('./src/services/historyService');

const app = express();
const PORT = process.env.PORT || 3001;
const ANALYTICS_URL = process.env.ANALYTICS_URL || 'http://127.0.0.1:8000';
const ANALYTICS_KEY = process.env.ANALYTICS_INTERNAL_KEY || '';

// Cache em memória de métricas do usuário (TTL: 60s, invalidado em escrita)
const metricsCache = new Map(); // userId -> { data, expiresAt }

function invalidateUserMetricsCache(userId) {
  metricsCache.delete(userId);
}

// -------------------------------------------------------------
// MIDDLEWARES DE SEGURANÇA E TRÁFEGO
// -------------------------------------------------------------
app.use(helmet({
  contentSecurityPolicy: false
}));
app.use(compression());
app.use(cookieParser());

const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';
app.use(cors({
  origin: corsOrigin.split(','),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Internal-Key']
}));

app.use(express.json({ limit: '2mb' }));
app.use(globalLimiter);
app.use(authMiddleware);

// Log de latência das requisições com aviso se > 1 segundo (Seção 10.2)
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (duration > 1000) {
      console.warn(`[PERF ALERT] ${req.method} ${req.originalUrl} levou ${duration}ms!`);
    }
  });
  next();
});

// -------------------------------------------------------------
// ROTAS DE SAÚDE E OBSERVABILIDADE
// -------------------------------------------------------------
app.get('/api/health', async (req, res) => {
  const dbHealth = await healthCheck();
  let pythonHealth = { status: 'down' };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const pyRes = await fetch(`${ANALYTICS_URL}/v1/health`, {
      headers: { 'X-Internal-Key': ANALYTICS_KEY },
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (pyRes.ok) {
      pythonHealth = await pyRes.json();
    }
  } catch {
    pythonHealth = { status: 'down', message: 'Serviço Analytics Python inativo' };
  }

  const isHealthy = dbHealth.status === 'up';
  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'degraded',
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
    database: dbHealth,
    analyticsService: pythonHealth
  });
});

// -------------------------------------------------------------
// ROTAS DE AUTENTICAÇÃO (JWT + REFRESH ROTATIVO)
// -------------------------------------------------------------

// POST /api/auth/login
app.post('/api/auth/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ erro: 'E-mail e senha são obrigatórios.', codigo: 'AUTH_REQUIRED_FIELDS' });
  }

  try {
    const result = await query(
      `SELECT u.*, c.nome as nome_curso 
       FROM Usuarios u 
       LEFT JOIN Cursos c ON c.id_curso = u.id_curso 
       WHERE LOWER(u.email) = LOWER(@email) AND u.ativo = 1`,
      { email: email.trim().toLowerCase() }
    );

    const user = result.recordset[0];
    if (!user) {
      return res.status(401).json({ erro: 'E-mail ou senha inválidos.', codigo: 'AUTH_INVALID_CREDENTIALS' });
    }

    const passwordMatch = bcrypt.compareSync(password, user.senha_hash);
    if (!passwordMatch) {
      return res.status(401).json({ erro: 'E-mail ou senha inválidos.', codigo: 'AUTH_INVALID_CREDENTIALS' });
    }

    // Gerar tokens
    const accessToken = generateAccessToken(user.id_usuario);
    const { token: refreshToken, hash: refreshHash, expiresAt } = generateRefreshToken();
    const familia = crypto.randomUUID();

    await query(
      `INSERT INTO RefreshTokens (id_usuario, token_hash, familia, expira_em, user_agent)
       VALUES (@id_usuario, @token_hash, @familia, @expira_em, @user_agent)`,
      {
        id_usuario: user.id_usuario,
        token_hash: refreshHash,
        familia,
        expira_em: expiresAt,
        user_agent: req.headers['user-agent']?.substring(0, 200) || null
      }
    );

    res.cookie('refreshToken', refreshToken, getRefreshCookieOptions());

    const { senha_hash, ...userProfile } = user;
    res.json({
      mensagem: 'Login realizado com sucesso!',
      token: accessToken,
      user: {
        id: userProfile.id_usuario,
        id_usuario: userProfile.id_usuario,
        name: userProfile.nome,
        surname: userProfile.sobrenome,
        email: userProfile.email,
        phone: userProfile.telefone || '',
        course: userProfile.nome_curso || 'Ciência da Computação',
        id_curso: userProfile.id_curso,
        avatar: userProfile.foto_perfil || '',
        meta_semanal_horas: Number(userProfile.meta_semanal_horas),
        tema_preferido: userProfile.tema_preferido,
        tamanho_texto: userProfile.tamanho_texto,
        ia_habilitada: userProfile.ia_habilitada === 1 || userProfile.ia_habilitada === true
      }
    });
  } catch (err) {
    console.error('[AUTH LOGIN ERR]', err);
    res.status(500).json({ erro: 'Erro interno ao processar login.', codigo: 'SERVER_ERROR' });
  }
});

// POST /api/auth/register
app.post('/api/auth/register', async (req, res) => {
  const { name, surname, email, password, phone, course } = req.body;
  if (!name || !surname || !email || !password) {
    return res.status(400).json({ erro: 'Preencha todos os campos obrigatórios.', codigo: 'AUTH_REQUIRED_FIELDS' });
  }

  if (password.length < 8) {
    return res.status(400).json({ erro: 'A senha deve conter no mínimo 8 caracteres.', codigo: 'AUTH_PASSWORD_TOO_SHORT' });
  }

  const cleanEmail = email.trim().toLowerCase();

  try {
    const existing = await query('SELECT id_usuario FROM Usuarios WHERE LOWER(email) = LOWER(@email)', { email: cleanEmail });
    if (existing.recordset.length > 0) {
      return res.status(400).json({ erro: 'Este e-mail já está cadastrado.', codigo: 'AUTH_EMAIL_EXISTS' });
    }

    const courseName = (course || 'Ciência da Computação').trim();
    let idCurso = 1;
    const courseRes = await query('SELECT id_curso FROM Cursos WHERE LOWER(nome) = LOWER(@nome)', { nome: courseName });
    if (courseRes.recordset.length > 0) {
      idCurso = courseRes.recordset[0].id_curso;
    } else {
      const insCourse = await query('INSERT INTO Cursos (nome) OUTPUT INSERTED.id_curso VALUES (@nome)', { nome: courseName });
      idCurso = insCourse.recordset[0].id_curso;
    }

    const passwordHash = bcrypt.hashSync(password, 10);

    const insertRes = await query(
      `INSERT INTO Usuarios (nome, sobrenome, email, senha_hash, telefone, id_curso, meta_semanal_horas)
       OUTPUT INSERTED.id_usuario
       VALUES (@nome, @sobrenome, @email, @senha_hash, @telefone, @id_curso, 10.0)`,
      {
        nome: name.trim(),
        sobrenome: surname.trim(),
        email: cleanEmail,
        senha_hash: passwordHash,
        telefone: phone ? phone.trim() : null,
        id_curso: idCurso
      }
    );

    const newUserId = insertRes.recordset[0].id_usuario;

    // Tokens
    const accessToken = generateAccessToken(newUserId);
    const { token: refreshToken, hash: refreshHash, expiresAt } = generateRefreshToken();
    const familia = crypto.randomUUID();

    await query(
      `INSERT INTO RefreshTokens (id_usuario, token_hash, familia, expira_em, user_agent)
       VALUES (@id_usuario, @token_hash, @familia, @expira_em, @user_agent)`,
      {
        id_usuario: newUserId,
        token_hash: refreshHash,
        familia,
        expira_em: expiresAt,
        user_agent: req.headers['user-agent']?.substring(0, 200) || null
      }
    );

    res.cookie('refreshToken', refreshToken, getRefreshCookieOptions());

    res.status(201).json({
      mensagem: 'Cadastro realizado com sucesso!',
      token: accessToken,
      user: {
        id: newUserId,
        id_usuario: newUserId,
        name: name.trim(),
        surname: surname.trim(),
        email: cleanEmail,
        phone: phone ? phone.trim() : '',
        course: courseName,
        id_curso: idCurso,
        avatar: '',
        meta_semanal_horas: 10.0,
        tema_preferido: 'sistema',
        tamanho_texto: 'normal',
        ia_habilitada: true
      }
    });
  } catch (err) {
    console.error('[AUTH REGISTER ERR]', err);
    res.status(500).json({ erro: 'Erro ao cadastrar usuário.', codigo: 'SERVER_ERROR' });
  }
});

// POST /api/auth/refresh (Rotação de Refresh Token com detecção de reuso)
app.post('/api/auth/refresh', async (req, res) => {
  const currentToken = req.cookies?.refreshToken;
  if (!currentToken) {
    return res.status(401).json({ erro: 'Refresh token não fornecido.', codigo: 'AUTH_REFRESH_MISSING' });
  }

  const tokenHash = hashToken(currentToken);

  try {
    const tokenRecord = await query(
      `SELECT * FROM RefreshTokens WHERE token_hash = @token_hash`,
      { token_hash: tokenHash }
    );

    const record = tokenRecord.recordset[0];
    if (!record) {
      res.clearCookie('refreshToken', { path: '/api/auth' });
      return res.status(401).json({ erro: 'Sessão inválida. Faça login novamente.', codigo: 'AUTH_REFRESH_INVALID' });
    }

    // Se o token já foi revogado: detecção de reuso / roubo -> revogar toda a família
    if (record.revogado_em !== null) {
      console.warn(`[SECURITY ALERT] Tentativa de reuso de token revogado na família ${record.familia}!`);
      await query(
        `UPDATE RefreshTokens SET revogado_em = SYSUTCDATETIME() WHERE familia = @familia AND revogado_em IS NULL`,
        { familia: record.familia }
      );
      res.clearCookie('refreshToken', { path: '/api/auth' });
      return res.status(401).json({ erro: 'Sessão comprometida. Faça login novamente.', codigo: 'AUTH_TOKEN_THEFT_DETECTED' });
    }

    // Verificar expiração
    if (new Date(record.expira_em) < new Date()) {
      res.clearCookie('refreshToken', { path: '/api/auth' });
      return res.status(401).json({ erro: 'Sessão expirada. Faça login novamente.', codigo: 'AUTH_REFRESH_EXPIRED' });
    }

    // Rotação: revoga o token atual e gera um novo na mesma família
    await query(
      `UPDATE RefreshTokens SET revogado_em = SYSUTCDATETIME() WHERE id_refresh = @id_refresh`,
      { id_refresh: record.id_refresh }
    );

    const newAccess = generateAccessToken(record.id_usuario);
    const { token: newRefresh, hash: newRefreshHash, expiresAt } = generateRefreshToken();

    await query(
      `INSERT INTO RefreshTokens (id_usuario, token_hash, familia, expira_em, user_agent)
       VALUES (@id_usuario, @token_hash, @familia, @expira_em, @user_agent)`,
      {
        id_usuario: record.id_usuario,
        token_hash: newRefreshHash,
        familia: record.familia,
        expira_em: expiresAt,
        user_agent: req.headers['user-agent']?.substring(0, 200) || null
      }
    );

    res.cookie('refreshToken', newRefresh, getRefreshCookieOptions());
    res.json({ token: newAccess });
  } catch (err) {
    console.error('[AUTH REFRESH ERR]', err);
    res.status(500).json({ erro: 'Erro ao renovar token de acesso.', codigo: 'SERVER_ERROR' });
  }
});

// POST /api/auth/logout
app.post('/api/auth/logout', async (req, res) => {
  const currentToken = req.cookies?.refreshToken;
  if (currentToken) {
    const tokenHash = hashToken(currentToken);
    await query(
      `UPDATE RefreshTokens SET revogado_em = SYSUTCDATETIME() WHERE token_hash = @token_hash AND revogado_em IS NULL`,
      { token_hash: tokenHash }
    );
  }
  res.clearCookie('refreshToken', { path: '/api/auth' });
  res.json({ mensagem: 'Logout efetuado com sucesso.' });
});

// Recuperação de senha em 3 etapas
app.post('/api/auth/forgot-password/request', forgotPasswordLimiter, async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ erro: 'Informe o e-mail cadastrado.', codigo: 'AUTH_EMAIL_REQUIRED' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const userRes = await query('SELECT id_usuario FROM Usuarios WHERE LOWER(email) = LOWER(@email)', { email: cleanEmail });
  const user = userRes.recordset[0];

  if (!user) {
    return res.json({ mensagem: 'Se a conta existir, as instruções foram enviadas.', demoCode: null });
  }

  const code = Math.floor(10000 + Math.random() * 90000).toString();
  const codeHash = hashToken(code);
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  await query(
    `INSERT INTO RecuperacaoSenha (id_usuario, codigo_hash, expira_em, tentativas, usado)
     VALUES (@id_usuario, @codigo_hash, @expira_em, 0, 0)`,
    {
      id_usuario: user.id_usuario,
      codigo_hash: codeHash,
      expira_em: expiresAt
    }
  );

  console.log(`[AUTH] Código de verificação para ${cleanEmail}: ${code}`);
  res.json({
    mensagem: 'Código de verificação gerado com sucesso!',
    demoCode: process.env.NODE_ENV !== 'production' ? code : undefined
  });
});

app.post('/api/auth/forgot-password/verify', async (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) {
    return res.status(400).json({ erro: 'E-mail e código são obrigatórios.', codigo: 'AUTH_REQUIRED_FIELDS' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const codeHash = hashToken(code.trim());

  const record = await query(
    `SELECT TOP 1 rs.* 
     FROM RecuperacaoSenha rs
     JOIN Usuarios u ON u.id_usuario = rs.id_usuario
     WHERE LOWER(u.email) = LOWER(@email) AND rs.usado = 0
     ORDER BY rs.criado_em DESC`,
    { email: cleanEmail }
  );

  const reset = record.recordset[0];
  if (!reset) {
    return res.status(400).json({ erro: 'Nenhuma solicitação ativa encontrada.', codigo: 'AUTH_RESET_NOT_FOUND' });
  }

  if (reset.tentativas >= 5) {
    return res.status(400).json({ erro: 'Número de tentativas excedido. Solicite novo código.', codigo: 'AUTH_TRIES_EXCEEDED' });
  }

  if (new Date(reset.expira_em) < new Date()) {
    return res.status(400).json({ erro: 'Código expirado. Solicite outro código.', codigo: 'AUTH_CODE_EXPIRED' });
  }

  if (reset.codigo_hash !== codeHash) {
    await query('UPDATE RecuperacaoSenha SET tentativas = tentativas + 1 WHERE id_recuperacao = @id', { id: reset.id_recuperacao });
    return res.status(400).json({ erro: 'Código de verificação incorreto.', codigo: 'AUTH_CODE_INVALID' });
  }

  res.json({ mensagem: 'Código validado com sucesso! Prossiga para redefinir sua senha.' });
});

app.post('/api/auth/forgot-password/reset', async (req, res) => {
  const { email, code, newPassword } = req.body;
  if (!email || !code || !newPassword) {
    return res.status(400).json({ erro: 'Todos os campos são obrigatórios.', codigo: 'AUTH_REQUIRED_FIELDS' });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ erro: 'A nova senha deve ter pelo menos 8 caracteres.', codigo: 'AUTH_PASSWORD_TOO_SHORT' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const codeHash = hashToken(code.trim());

  const record = await query(
    `SELECT TOP 1 rs.*, u.id_usuario 
     FROM RecuperacaoSenha rs
     JOIN Usuarios u ON u.id_usuario = rs.id_usuario
     WHERE LOWER(u.email) = LOWER(@email) AND rs.usado = 0
     ORDER BY rs.criado_em DESC`,
    { email: cleanEmail }
  );

  const reset = record.recordset[0];
  if (!reset || reset.codigo_hash !== codeHash || new Date(reset.expira_em) < new Date()) {
    return res.status(400).json({ erro: 'Código inválido ou expirado.', codigo: 'AUTH_CODE_INVALID' });
  }

  const newHash = bcrypt.hashSync(newPassword, 10);

  await transaction(async (tx) => {
    const uReq = new sql.Request(tx);
    uReq.input('id_usuario', sql.Int, reset.id_usuario);
    uReq.input('senha_hash', sql.NVarChar(255), newHash);
    await uReq.query('UPDATE Usuarios SET senha_hash = @senha_hash, atualizado_em = SYSUTCDATETIME() WHERE id_usuario = @id_usuario');

    const rsReq = new sql.Request(tx);
    rsReq.input('id_recuperacao', sql.Int, reset.id_recuperacao);
    await rsReq.query('UPDATE RecuperacaoSenha SET usado = 1 WHERE id_recuperacao = @id_recuperacao');

    const rfReq = new sql.Request(tx);
    rfReq.input('id_usuario', sql.Int, reset.id_usuario);
    await rfReq.query('UPDATE RefreshTokens SET revogado_em = SYSUTCDATETIME() WHERE id_usuario = @id_usuario AND revogado_em IS NULL');
  });

  res.json({ mensagem: 'Senha atualizada com sucesso! Você já pode efetuar login.' });
});

// -------------------------------------------------------------
// ROTAS DE PERFIL DO USUÁRIO
// -------------------------------------------------------------
app.get('/api/user/profile', async (req, res) => {
  const userRes = await query(
    `SELECT u.*, c.nome as nome_curso 
     FROM Usuarios u
     LEFT JOIN Cursos c ON c.id_curso = u.id_curso
     WHERE u.id_usuario = @id_usuario`,
    { id_usuario: req.userId }
  );

  const user = userRes.recordset[0];
  if (!user) return res.status(404).json({ erro: 'Usuário não encontrado.', codigo: 'NOT_FOUND' });

  res.json({
    id: user.id_usuario,
    id_usuario: user.id_usuario,
    name: user.nome,
    surname: user.sobrenome,
    email: user.email,
    phone: user.telefone || '',
    course: user.nome_curso || 'Ciência da Computação',
    id_curso: user.id_curso,
    avatar: user.foto_perfil || '',
    meta_semanal_horas: Number(user.meta_semanal_horas),
    tema_preferido: user.tema_preferido,
    tamanho_texto: user.tamanho_texto,
    ia_habilitada: user.ia_habilitada === 1 || user.ia_habilitada === true
  });
});

app.put('/api/user/profile', async (req, res) => {
  const { 
    name, surname, phone, course, avatar, 
    meta_semanal_horas, tema_preferido, tamanho_texto, ia_habilitada 
  } = req.body;

  let idCurso = null;
  if (course) {
    const cRes = await query('SELECT id_curso FROM Cursos WHERE LOWER(nome) = LOWER(@nome)', { nome: course.trim() });
    if (cRes.recordset.length > 0) {
      idCurso = cRes.recordset[0].id_curso;
    }
  }

  await query(
    `UPDATE Usuarios SET 
      nome = COALESCE(@nome, nome),
      sobrenome = COALESCE(@sobrenome, sobrenome),
      telefone = COALESCE(@telefone, telefone),
      id_curso = COALESCE(@id_curso, id_curso),
      foto_perfil = COALESCE(@foto_perfil, foto_perfil),
      meta_semanal_horas = COALESCE(@meta_semanal_horas, meta_semanal_horas),
      tema_preferido = COALESCE(@tema_preferido, tema_preferido),
      tamanho_texto = COALESCE(@tamanho_texto, tamanho_texto),
      ia_habilitada = COALESCE(@ia_habilitada, ia_habilitada),
      atualizado_em = SYSUTCDATETIME()
     WHERE id_usuario = @id_usuario`,
    {
      id_usuario: req.userId,
      nome: name ? name.trim() : null,
      sobrenome: surname ? surname.trim() : null,
      telefone: phone !== undefined ? phone.trim() : null,
      id_curso: idCurso,
      foto_perfil: avatar !== undefined ? avatar : null,
      meta_semanal_horas: meta_semanal_horas !== undefined ? parseFloat(meta_semanal_horas) : null,
      tema_preferido: tema_preferido || null,
      tamanho_texto: tamanho_texto || null,
      ia_habilitada: ia_habilitada !== undefined ? (ia_habilitada ? 1 : 0) : null
    }
  );

  invalidateUserMetricsCache(req.userId);

  const updatedRes = await query(
    `SELECT u.*, c.nome as nome_curso 
     FROM Usuarios u
     LEFT JOIN Cursos c ON c.id_curso = u.id_curso
     WHERE u.id_usuario = @id_usuario`,
    { id_usuario: req.userId }
  );

  const user = updatedRes.recordset[0];
  res.json({
    mensagem: 'Perfil atualizado com sucesso!',
    user: {
      id: user.id_usuario,
      id_usuario: user.id_usuario,
      name: user.nome,
      surname: user.sobrenome,
      email: user.email,
      phone: user.telefone || '',
      course: user.nome_curso || 'Ciência da Computação',
      id_curso: user.id_curso,
      avatar: user.foto_perfil || '',
      meta_semanal_horas: Number(user.meta_semanal_horas),
      tema_preferido: user.tema_preferido,
      tamanho_texto: user.tamanho_texto,
      ia_habilitada: user.ia_habilitada === 1 || user.ia_habilitada === true
    }
  });
});

// -------------------------------------------------------------
// ROTAS DE DISCIPLINAS
// -------------------------------------------------------------

// GET /api/disciplines
app.get('/api/disciplines', async (req, res) => {
  const result = await query(
    `SELECT 
       id_disciplina as id,
       id_disciplina,
       id_usuario,
       nome_disciplina as name,
       nome_disciplina as nome,
       carga_horaria as hours,
       carga_horaria,
       data_inicio as start_date,
       data_inicio,
       data_fim as end_date,
       data_fim,
       total_tarefas,
       concluidas as completed_tasks,
       pendentes as pending_tasks,
       atrasadas,
       progresso_simples_pct as progress_percent,
       progresso_ponderado_pct,
       horas_reais_total as hours_spent,
       horas_estimadas_total
     FROM vw_ProgressoDisciplina
     WHERE id_usuario = @id_usuario
     ORDER BY nome_disciplina ASC`,
    { id_usuario: req.userId }
  );

  const fullDiscs = await query('SELECT id_disciplina, teacher, description FROM (SELECT id_disciplina, professor as teacher, descricao as description FROM Disciplinas WHERE id_usuario = @id_usuario) s', { id_usuario: req.userId });
  const mapDesc = new Map(fullDiscs.recordset.map(d => [d.id_disciplina, d]));

  const response = result.recordset.map(d => ({
    ...d,
    teacher: mapDesc.get(d.id)?.teacher || '',
    description: mapDesc.get(d.id)?.description || ''
  }));

  res.json(response);
});

// POST /api/disciplines
app.post('/api/disciplines', async (req, res) => {
  const { name, teacher, hours, description, start_date, end_date } = req.body;
  if (!name || !teacher) {
    return res.status(400).json({ erro: 'Nome da matéria e professor são obrigatórios.', codigo: 'DISCIPLINA_REQUIRED' });
  }

  const cleanName = name.trim();
  const cleanTeacher = teacher.trim();
  const numHours = parseInt(hours, 10) || 60;
  const startDate = start_date || new Date().toISOString().split('T')[0];
  const endDate = end_date || new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  try {
    const createdId = await transaction(async (tx) => {
      const insReq = new sql.Request(tx);
      insReq.input('id_usuario', sql.Int, req.userId);
      insReq.input('nome', sql.NVarChar(120), cleanName);
      insReq.input('professor', sql.NVarChar(120), cleanTeacher);
      insReq.input('carga_horaria', sql.Int, numHours);
      insReq.input('descricao', sql.NVarChar(1000), description ? description.trim() : null);
      insReq.input('data_inicio', sql.Date, startDate);
      insReq.input('data_fim', sql.Date, endDate);

      const ins = await insReq.query(`
        INSERT INTO Disciplinas (id_usuario, nome, professor, carga_horaria, descricao, data_inicio, data_fim)
        OUTPUT INSERTED.id_disciplina
        VALUES (@id_usuario, @nome, @professor, @carga_horaria, @descricao, @data_inicio, @data_fim)
      `);
      const newId = ins.recordset[0].id_disciplina;

      await recordActivity(tx, {
        userId: req.userId,
        tipo: 'DISCIPLINA_CRIADA',
        idEntidade: newId,
        nomeDisciplina: cleanName,
        descricao: `Disciplina "${cleanName}" criada com carga de ${numHours}h`
      });

      return newId;
    });

    invalidateUserMetricsCache(req.userId);

    res.status(201).json({
      mensagem: 'Disciplina criada com sucesso!',
      discipline: {
        id: createdId,
        id_disciplina: createdId,
        id_usuario: req.userId,
        name: cleanName,
        teacher: cleanTeacher,
        hours: numHours,
        description: description || '',
        start_date: startDate,
        end_date: endDate,
        total_tarefas: 0,
        completed_tasks: 0,
        pending_tasks: 0,
        progress_percent: 0,
        hours_spent: 0
      }
    });
  } catch (err) {
    if (err.number === 2627 || err.number === 2601) {
      return res.status(400).json({ erro: 'Você já possui uma disciplina cadastrada com este nome.', codigo: 'DUPLICATE_DISCIPLINE' });
    }
    console.error('[DISCIPLINE CREATE ERR]', err);
    res.status(500).json({ erro: 'Erro ao criar disciplina.', codigo: 'SERVER_ERROR' });
  }
});

// PUT /api/disciplines/:id
app.put('/api/disciplines/:id', async (req, res) => {
  const discId = parseInt(req.params.id, 10);
  const { name, teacher, hours, description, start_date, end_date } = req.body;

  const existing = await query('SELECT * FROM Disciplinas WHERE id_disciplina = @id AND id_usuario = @id_usuario', {
    id: discId,
    id_usuario: req.userId
  });

  if (existing.recordset.length === 0) {
    return res.status(404).json({ erro: 'Disciplina não encontrada.', codigo: 'NOT_FOUND' });
  }

  const cleanName = (name || existing.recordset[0].nome).trim();
  const cleanTeacher = teacher ? teacher.trim() : existing.recordset[0].professor;
  const numHours = hours !== undefined ? parseInt(hours, 10) : existing.recordset[0].carga_horaria;

  await transaction(async (tx) => {
    const upReq = new sql.Request(tx);
    upReq.input('id', sql.Int, discId);
    upReq.input('id_usuario', sql.Int, req.userId);
    upReq.input('nome', sql.NVarChar(120), cleanName);
    upReq.input('professor', sql.NVarChar(120), cleanTeacher);
    upReq.input('carga_horaria', sql.Int, numHours);
    upReq.input('descricao', sql.NVarChar(1000), description !== undefined ? description.trim() : existing.recordset[0].descricao);
    upReq.input('data_inicio', sql.Date, start_date || existing.recordset[0].data_inicio);
    upReq.input('data_fim', sql.Date, end_date || existing.recordset[0].data_fim);

    await upReq.query(`
      UPDATE Disciplinas SET
        nome = @nome,
        professor = @professor,
        carga_horaria = @carga_horaria,
        descricao = @descricao,
        data_inicio = @data_inicio,
        data_fim = @data_fim,
        atualizado_em = SYSUTCDATETIME()
      WHERE id_disciplina = @id AND id_usuario = @id_usuario
    `);

    await recordActivity(tx, {
      userId: req.userId,
      tipo: 'DISCIPLINA_EDITADA',
      idEntidade: discId,
      nomeDisciplina: cleanName,
      descricao: `Disciplina "${cleanName}" atualizada`
    });
  });

  invalidateUserMetricsCache(req.userId);
  res.json({ mensagem: 'Disciplina atualizada com sucesso!' });
});

// DELETE /api/disciplines/:id
app.delete('/api/disciplines/:id', async (req, res) => {
  const discId = parseInt(req.params.id, 10);

  const existing = await query('SELECT nome FROM Disciplinas WHERE id_disciplina = @id AND id_usuario = @id_usuario', {
    id: discId,
    id_usuario: req.userId
  });

  if (existing.recordset.length === 0) {
    return res.status(404).json({ erro: 'Disciplina não encontrada.', codigo: 'NOT_FOUND' });
  }

  const discName = existing.recordset[0].nome;

  await transaction(async (tx) => {
    const delSess = new sql.Request(tx);
    delSess.input('id_disc', sql.Int, discId);
    delSess.input('id_usuario', sql.Int, req.userId);
    await delSess.query(`
      DELETE FROM SessoesEstudo 
      WHERE id_tarefa IN (SELECT id_tarefa FROM Tarefas WHERE id_disciplina = @id_disc)
    `);

    const delDisc = new sql.Request(tx);
    delDisc.input('id', sql.Int, discId);
    delDisc.input('id_usuario', sql.Int, req.userId);
    await delDisc.query('DELETE FROM Disciplinas WHERE id_disciplina = @id AND id_usuario = @id_usuario');

    await recordActivity(tx, {
      userId: req.userId,
      tipo: 'DISCIPLINA_EXCLUIDA',
      idEntidade: discId,
      nomeDisciplina: discName,
      descricao: `Disciplina "${discName}" e tarefas associadas foram excluídas`
    });
  });

  invalidateUserMetricsCache(req.userId);
  res.json({ mensagem: 'Disciplina e tarefas vinculadas excluídas com sucesso!' });
});

// -------------------------------------------------------------
// ROTAS DE TAREFAS E FILTROS NO SERVIDOR (SEÇÃO 6.3)
// -------------------------------------------------------------

// GET /api/tarefas - Busca e Filtros Avançados no Servidor
app.get('/api/tarefas', async (req, res) => {
  const {
    busca,
    disciplinas,
    status,
    prazo,
    de,
    ate,
    tempo,
    ordem,
    pagina = 1,
    tamanho = 20
  } = req.query;

  const page = Math.max(1, parseInt(pagina, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(tamanho, 10) || 20));
  const offset = (page - 1) * pageSize;

  let whereClauses = ['d.id_usuario = @id_usuario'];
  const params = { id_usuario: req.userId };

  // 1. Busca textual
  if (busca && busca.trim()) {
    const termo = busca.trim().replace(/[%_]/g, '\\$&');
    whereClauses.push('(t.titulo LIKE @busca ESCAPE \'\\\' OR t.descricao LIKE @busca ESCAPE \'\\\' OR t.lembrete_nota LIKE @busca ESCAPE \'\\\' OR d.nome LIKE @busca ESCAPE \'\\\')');
    params.busca = `%${termo}%`;
  }

  // 2. Filtro por múltiplas disciplinas
  if (disciplinas && disciplinas.trim()) {
    const discIds = disciplinas.split(',').map(id => parseInt(id.trim(), 10)).filter(id => !isNaN(id));
    if (discIds.length > 0) {
      whereClauses.push(`t.id_disciplina IN (${discIds.join(',')})`);
    }
  }

  // 3. Filtro por Status
  if (status) {
    const st = status.toLowerCase();
    if (st === 'concluida' || st === 'concluída') {
      whereClauses.push("t.status = 'Concluida'");
    } else if (st === 'pendente') {
      whereClauses.push("t.status = 'Pendente' AND (t.data_prevista IS NULL OR t.data_prevista >= CAST(GETDATE() AS DATE))");
    } else if (st === 'atrasada') {
      whereClauses.push("t.status = 'Pendente' AND t.data_prevista < CAST(GETDATE() AS DATE)");
    }
  }

  // 4. Filtro por Prazo
  if (prazo) {
    const pz = prazo.toLowerCase();
    if (pz === 'proximas') {
      whereClauses.push("t.status = 'Pendente' AND t.data_prevista >= CAST(GETDATE() AS DATE) AND t.data_prevista <= DATEADD(DAY, 7, CAST(GETDATE() AS DATE))");
    } else if (pz === 'longe') {
      whereClauses.push("t.data_prevista > DATEADD(DAY, 7, CAST(GETDATE() AS DATE))");
    } else if (pz === 'vencidas') {
      whereClauses.push("t.status = 'Pendente' AND t.data_prevista < CAST(GETDATE() AS DATE)");
    } else if (pz === 'sem_prazo') {
      whereClauses.push("t.data_prevista IS NULL");
    }
  }

  // 5. Filtro por período De / Até
  if (de) {
    whereClauses.push('t.data_prevista >= @de');
    params.de = de;
  }
  if (ate) {
    whereClauses.push('t.data_prevista <= @ate');
    params.ate = ate;
  }

  // 6. Filtros de Tempo
  if (tempo) {
    const tp = tempo.toLowerCase();
    if (tp === 'sem_estimativa') {
      whereClauses.push('t.horas_estimadas IS NULL');
    } else if (tp === 'com_tempo') {
      whereClauses.push('EXISTS (SELECT 1 FROM SessoesEstudo se WHERE se.id_tarefa = t.id_tarefa AND se.fim IS NOT NULL)');
    } else if (tp === 'estourou') {
      whereClauses.push('(SELECT ISNULL(SUM(se.duracao_seg), 0) / 3600.0 FROM SessoesEstudo se WHERE se.id_tarefa = t.id_tarefa AND se.fim IS NOT NULL) > t.horas_estimadas');
    }
  }

  let orderBy = 'CASE WHEN t.data_prevista IS NULL THEN 1 ELSE 0 END, t.data_prevista ASC, t.titulo ASC';
  if (ordem === 'prazo_desc') {
    orderBy = 'CASE WHEN t.data_prevista IS NULL THEN 1 ELSE 0 END, t.data_prevista DESC, t.titulo ASC';
  } else if (ordem === 'az') {
    orderBy = 't.titulo ASC';
  } else if (ordem === 'za') {
    orderBy = 't.titulo DESC';
  } else if (ordem === 'recentes') {
    orderBy = 't.criado_em DESC';
  }

  const whereSql = whereClauses.join(' AND ');

  const countQuery = `
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN t.status = 'Concluida' THEN 1 ELSE 0 END) as concluidas,
      SUM(CASE WHEN t.status = 'Pendente' AND (t.data_prevista IS NULL OR t.data_prevista >= CAST(GETDATE() AS DATE)) THEN 1 ELSE 0 END) as pendentes,
      SUM(CASE WHEN t.status = 'Pendente' AND t.data_prevista < CAST(GETDATE() AS DATE) THEN 1 ELSE 0 END) as atrasadas
    FROM Tarefas t
    JOIN Disciplinas d ON d.id_disciplina = t.id_disciplina
    WHERE d.id_usuario = @id_usuario
  `;
  const countsRes = await query(countQuery, { id_usuario: req.userId });
  const counts = countsRes.recordset[0] || { total: 0, concluidas: 0, pendentes: 0, atrasadas: 0 };

  const dataQuery = `
    SELECT 
      t.id_tarefa as id,
      t.id_tarefa,
      t.id_disciplina,
      t.id_disciplina as discipline_id,
      d.nome as discipline_name,
      d.nome as nome_disciplina,
      t.titulo as title,
      t.titulo,
      t.descricao as description,
      t.descricao,
      t.data_prevista as due_date,
      t.data_prevista,
      CASE WHEN t.status IN ('Concluida', 'Concluída') THEN 'Concluída' ELSE 'Pendente' END as status,
      CASE WHEN t.status IN ('Concluida', 'Concluída') THEN 1 ELSE 0 END as concluida,
      t.horas_estimadas,
      t.lembrete_nota as notes,
      t.lembrete_nota,
      t.lembrete_nota as lembretes,
      t.concluida_em,
      t.criado_em,
      ISNULL(CAST(ROUND(SUM(s.duracao_seg) / 3600.0, 2) AS DECIMAL(8,2)), 0.00) as hours_spent,
      ISNULL(CAST(ROUND(SUM(s.duracao_seg) / 3600.0, 2) AS DECIMAL(8,2)), 0.00) as horas_reais,
      ISNULL(CAST(ROUND(SUM(s.duracao_seg) / 3600.0, 2) AS DECIMAL(8,2)), 0.00) as horas_gastas_reais,
      CASE 
        WHEN t.horas_estimadas IS NOT NULL AND t.horas_estimadas > 0 AND SUM(s.duracao_seg) > 0
        THEN CAST(ROUND(((SUM(s.duracao_seg) / 3600.0 - t.horas_estimadas) / t.horas_estimadas) * 100.0, 1) AS DECIMAL(6,1))
        ELSE NULL 
      END as desvio_pct,
      CASE 
        WHEN t.status = 'Pendente' AND t.data_prevista IS NOT NULL AND t.data_prevista < CAST(GETDATE() AS DATE) 
        THEN 1 ELSE 0 
      END as atrasada
    FROM Tarefas t
    JOIN Disciplinas d ON d.id_disciplina = t.id_disciplina
    LEFT JOIN SessoesEstudo s ON s.id_tarefa = t.id_tarefa AND s.fim IS NOT NULL
    WHERE ${whereSql}
    GROUP BY 
      t.id_tarefa, t.id_disciplina, d.nome, t.titulo, t.descricao,
      t.data_prevista, t.status, t.horas_estimadas, t.lembrete_nota,
      t.concluida_em, t.criado_em
    ORDER BY ${orderBy}
    OFFSET ${offset} ROWS FETCH NEXT ${pageSize} ROWS ONLY
  `;

  const filteredCountSql = `
    SELECT COUNT(DISTINCT t.id_tarefa) as total_filtrado
    FROM Tarefas t
    JOIN Disciplinas d ON d.id_disciplina = t.id_disciplina
    WHERE ${whereSql}
  `;
  const filteredCountRes = await query(filteredCountSql, params);
  const totalFiltrado = filteredCountRes.recordset[0]?.total_filtrado || 0;

  const itemsRes = await query(dataQuery, params);

  res.json({
    itens: itemsRes.recordset,
    total: totalFiltrado,
    pagina: page,
    tamanho: pageSize,
    total_paginas: Math.ceil(totalFiltrado / pageSize) || 1,
    contadores: {
      todas: counts.total || 0,
      pendentes: counts.pendentes || 0,
      concluidas: counts.concluidas || 0,
      atrasadas: counts.atrasadas || 0
    }
  });
});

// GET /api/tasks (Compatibilidade MVP retrocompatível)
app.get('/api/tasks', async (req, res) => {
  const { discipline_id } = req.query;
  let sqlText = `
    SELECT 
      t.id_tarefa as id,
      t.id_tarefa,
      t.id_disciplina as discipline_id,
      t.id_disciplina,
      d.nome as discipline_name,
      d.nome as nome_disciplina,
      t.titulo as title,
      t.titulo,
      t.descricao as description,
      t.descricao,
      t.data_prevista as due_date,
      t.data_prevista,
      CASE WHEN t.status IN ('Concluida', 'Concluída') THEN 'Concluída' ELSE 'Pendente' END as status,
      CASE WHEN t.status IN ('Concluida', 'Concluída') THEN 1 ELSE 0 END as concluida,
      t.horas_estimadas,
      t.lembrete_nota as notes,
      t.lembrete_nota,
      t.lembrete_nota as lembretes,
      t.concluida_em,
      t.criado_em,
      ISNULL(CAST(ROUND(SUM(s.duracao_seg) / 3600.0, 2) AS DECIMAL(8,2)), 0.00) as hours_spent,
      ISNULL(CAST(ROUND(SUM(s.duracao_seg) / 3600.0, 2) AS DECIMAL(8,2)), 0.00) as horas_reais,
      ISNULL(CAST(ROUND(SUM(s.duracao_seg) / 3600.0, 2) AS DECIMAL(8,2)), 0.00) as horas_gastas_reais
    FROM Tarefas t
    JOIN Disciplinas d ON d.id_disciplina = t.id_disciplina
    LEFT JOIN SessoesEstudo s ON s.id_tarefa = t.id_tarefa AND s.fim IS NOT NULL
    WHERE d.id_usuario = @id_usuario
  `;
  const params = { id_usuario: req.userId };

  if (discipline_id) {
    sqlText += ' AND t.id_disciplina = @discipline_id';
    params.discipline_id = parseInt(discipline_id, 10);
  }

  sqlText += `
    GROUP BY t.id_tarefa, t.id_disciplina, d.nome, t.titulo, t.descricao, t.data_prevista, t.status, t.horas_estimadas, t.lembrete_nota, t.concluida_em, t.criado_em
    ORDER BY CASE WHEN t.data_prevista IS NULL THEN 1 ELSE 0 END, t.data_prevista ASC, t.id_tarefa DESC
  `;

  const result = await query(sqlText, params);
  res.json(result.recordset);
});

// GET /api/busca - Busca Global agrupando matérias e tarefas (Ctrl+K)
app.get('/api/busca', async (req, res) => {
  const termo = (req.query.q || '').trim().replace(/[%_]/g, '\\$&');
  if (!termo) {
    return res.json({ disciplinas: [], tarefas: [] });
  }

  const discRes = await query(
    `SELECT TOP 5 id_disciplina as id, nome, professor, carga_horaria 
     FROM Disciplinas 
     WHERE id_usuario = @id_usuario AND (nome LIKE @q ESCAPE '\\' OR professor LIKE @q ESCAPE '\\')
     ORDER BY nome ASC`,
    { id_usuario: req.userId, q: `%${termo}%` }
  );

  const taskRes = await query(
    `SELECT TOP 5 t.id_tarefa as id, t.titulo, t.status, t.data_prevista, d.nome as nome_disciplina 
     FROM Tarefas t
     JOIN Disciplinas d ON d.id_disciplina = t.id_disciplina
     WHERE d.id_usuario = @id_usuario AND (t.titulo LIKE @q ESCAPE '\\' OR t.lembrete_nota LIKE @q ESCAPE '\\')
     ORDER BY t.data_prevista ASC`,
    { id_usuario: req.userId, q: `%${termo}%` }
  );

  res.json({
    disciplinas: discRes.recordset,
    tarefas: taskRes.recordset
  });
});

// POST /api/tasks (ou /api/tarefas)
const createTaskHandler = async (req, res) => {
  const { discipline_id, title, description, due_date, status, notes, hours_spent, horas_estimadas } = req.body;
  if (!discipline_id || !title) {
    return res.status(400).json({ erro: 'Disciplina e título da tarefa são obrigatórios.', codigo: 'TASK_REQUIRED' });
  }

  const cleanTitle = title.trim();
  const discId = parseInt(discipline_id, 10);
  const estimatedHours = horas_estimadas ? parseFloat(horas_estimadas) : null;
  const isCompleted = status === 'Concluída' || status === 'Concluida';

  const discCheck = await query('SELECT nome FROM Disciplinas WHERE id_disciplina = @id AND id_usuario = @id_usuario', {
    id: discId,
    id_usuario: req.userId
  });

  if (discCheck.recordset.length === 0) {
    return res.status(404).json({ erro: 'Disciplina não encontrada.', codigo: 'NOT_FOUND' });
  }

  const discName = discCheck.recordset[0].nome;

  try {
    const createdId = await transaction(async (tx) => {
      const insReq = new sql.Request(tx);
      insReq.input('id_disciplina', sql.Int, discId);
      insReq.input('titulo', sql.NVarChar(150), cleanTitle);
      insReq.input('descricao', sql.NVarChar(2000), description ? description.trim() : null);
      insReq.input('data_prevista', sql.Date, due_date || null);
      insReq.input('status', sql.NVarChar(10), isCompleted ? 'Concluida' : 'Pendente');
      insReq.input('horas_estimadas', sql.Decimal(6,2), estimatedHours);
      insReq.input('lembrete_nota', sql.NVarChar(500), notes ? notes.trim() : null);

      const ins = await insReq.query(`
        INSERT INTO Tarefas (id_disciplina, titulo, descricao, data_prevista, status, horas_estimadas, lembrete_nota, concluida_em)
        OUTPUT INSERTED.id_tarefa
        VALUES (@id_disciplina, @titulo, @descricao, @data_prevista, @status, @horas_estimadas, @lembrete_nota, ${isCompleted ? 'SYSUTCDATETIME()' : 'NULL'})
      `);
      const newTaskId = ins.recordset[0].id_tarefa;

      const initialSpent = parseFloat(hours_spent) || 0;
      if (initialSpent > 0) {
        const insSess = new sql.Request(tx);
        insSess.input('id_tarefa', sql.Int, newTaskId);
        insSess.input('id_usuario', sql.Int, req.userId);
        insSess.input('duracao_h', sql.Decimal(6,2), initialSpent);
        await insSess.query(`
          INSERT INTO SessoesEstudo (id_tarefa, id_usuario, inicio, fim, origem, observacao)
          VALUES (@id_tarefa, @id_usuario, DATEADD(SECOND, -CAST(@duracao_h * 3600 AS INT), SYSUTCDATETIME()), SYSUTCDATETIME(), 'Manual', 'Registro inicial')
        `);
      }

      await recordActivity(tx, {
        userId: req.userId,
        tipo: 'TAREFA_CRIADA',
        idEntidade: newTaskId,
        nomeDisciplina: discName,
        descricao: `Tarefa "${cleanTitle}" adicionada em ${discName}`
      });

      return newTaskId;
    });

    invalidateUserMetricsCache(req.userId);

    const taskData = await query(
      `SELECT t.*, t.id_tarefa as id, d.nome as discipline_name 
       FROM Tarefas t 
       JOIN Disciplinas d ON d.id_disciplina = t.id_disciplina 
       WHERE t.id_tarefa = @id`,
      { id: createdId }
    );

    res.status(201).json({
      mensagem: 'Tarefa criada com sucesso!',
      task: taskData.recordset[0]
    });
  } catch (err) {
    console.error('[TASK CREATE ERR]', err);
    res.status(500).json({ erro: 'Erro ao criar tarefa.', codigo: 'SERVER_ERROR' });
  }
};
app.post('/api/tasks', createTaskHandler);
app.post('/api/tarefas', createTaskHandler);

// PUT /api/tasks/:id (ou /api/tarefas/:id)
const updateTaskHandler = async (req, res) => {
  const taskId = parseInt(req.params.id, 10);
  if (isNaN(taskId)) {
    return res.status(400).json({ erro: 'ID da tarefa inválido.', codigo: 'INVALID_ID' });
  }

  const {
    title, titulo,
    description, descricao,
    due_date, data_prevista,
    status, concluida,
    notes, lembretes, lembrete_nota,
    hours_spent, horas_estimadas
  } = req.body;

  const existingRes = await query(
    `SELECT t.*, d.nome as nome_disciplina 
     FROM Tarefas t 
     JOIN Disciplinas d ON d.id_disciplina = t.id_disciplina 
     WHERE t.id_tarefa = @id AND d.id_usuario = @id_usuario`,
    { id: taskId, id_usuario: req.userId }
  );

  const existing = existingRes.recordset[0];
  if (!existing) {
    return res.status(404).json({ erro: 'Tarefa não encontrada.', codigo: 'NOT_FOUND' });
  }

  const cleanTitle = (title || titulo || existing.titulo || '').trim();

  // Normalização do Status (independente de acento ou booleano)
  let newStatus = existing.status;
  if (status !== undefined && status !== null) {
    const s = String(status).trim().toLowerCase();
    newStatus = (s === 'concluída' || s === 'concluida') ? 'Concluida' : 'Pendente';
  } else if (concluida !== undefined && concluida !== null) {
    newStatus = concluida ? 'Concluida' : 'Pendente';
  }

  const statusChanged = newStatus !== existing.status;
  const isNowCompleted = newStatus === 'Concluida';

  const cleanDesc = description !== undefined ? description : (descricao !== undefined ? descricao : existing.descricao);
  const cleanDueDate = due_date !== undefined ? (due_date || null) : (data_prevista !== undefined ? (data_prevista || null) : existing.data_prevista);
  const cleanHoursEst = horas_estimadas !== undefined ? (horas_estimadas || null) : (hours_spent !== undefined ? (hours_spent || null) : existing.horas_estimadas);
  const cleanNotes = notes !== undefined ? notes : (lembretes !== undefined ? lembretes : (lembrete_nota !== undefined ? lembrete_nota : existing.lembrete_nota));

  await transaction(async (tx) => {
    if (isNowCompleted) {
      const pauseReq = new sql.Request(tx);
      pauseReq.input('id_tarefa', sql.Int, taskId);
      pauseReq.input('id_usuario', sql.Int, req.userId);
      await pauseReq.query(`
        UPDATE SessoesEstudo 
        SET fim = CASE WHEN SYSUTCDATETIME() >= inicio THEN SYSUTCDATETIME() ELSE inicio END 
        WHERE id_tarefa = @id_tarefa AND id_usuario = @id_usuario AND fim IS NULL
      `);
    }

    const upReq = new sql.Request(tx);
    upReq.input('id', sql.Int, taskId);
    upReq.input('titulo', sql.NVarChar(150), cleanTitle);
    upReq.input('descricao', sql.NVarChar(2000), cleanDesc);
    upReq.input('data_prevista', sql.Date, cleanDueDate);
    upReq.input('status', sql.NVarChar(10), newStatus);
    upReq.input('horas_estimadas', sql.Decimal(6,2), cleanHoursEst);
    upReq.input('lembrete_nota', sql.NVarChar(500), cleanNotes);

    let concluidaEmSql = 'concluida_em';
    if (statusChanged) {
      concluidaEmSql = isNowCompleted ? 'SYSUTCDATETIME()' : 'NULL';
    }

    await upReq.query(`
      UPDATE Tarefas SET
        titulo = @titulo,
        descricao = @descricao,
        data_prevista = @data_prevista,
        status = @status,
        horas_estimadas = @horas_estimadas,
        lembrete_nota = @lembrete_nota,
        concluida_em = ${concluidaEmSql},
        atualizado_em = SYSUTCDATETIME()
      WHERE id_tarefa = @id
    `);

    if (statusChanged) {
      await recordActivity(tx, {
        userId: req.userId,
        tipo: isNowCompleted ? 'TAREFA_CONCLUIDA' : 'TAREFA_REABERTA',
        idEntidade: taskId,
        nomeDisciplina: existing.nome_disciplina,
        descricao: isNowCompleted 
          ? `Tarefa "${cleanTitle}" concluída`
          : `Tarefa "${cleanTitle}" reaberta`
      });
    } else {
      await recordActivity(tx, {
        userId: req.userId,
        tipo: 'TAREFA_EDITADA',
        idEntidade: taskId,
        nomeDisciplina: existing.nome_disciplina,
        descricao: `Tarefa "${cleanTitle}" editada`
      });
    }
  });

  invalidateUserMetricsCache(req.userId);

  const updatedTask = await query(
    `SELECT 
       t.*, 
       t.id_tarefa as id, 
       d.nome as discipline_name,
       d.nome as nome_disciplina,
       CASE WHEN t.status IN ('Concluida', 'Concluída') THEN 'Concluída' ELSE 'Pendente' END as status,
       CASE WHEN t.status IN ('Concluida', 'Concluída') THEN 1 ELSE 0 END as concluida,
       t.lembrete_nota as notes,
       t.lembrete_nota as lembretes,
       ISNULL(CAST(ROUND(SUM(s.duracao_seg) / 3600.0, 2) AS DECIMAL(8,2)), 0.00) as hours_spent,
       ISNULL(CAST(ROUND(SUM(s.duracao_seg) / 3600.0, 2) AS DECIMAL(8,2)), 0.00) as horas_reais,
       ISNULL(CAST(ROUND(SUM(s.duracao_seg) / 3600.0, 2) AS DECIMAL(8,2)), 0.00) as horas_gastas_reais
     FROM Tarefas t 
     JOIN Disciplinas d ON d.id_disciplina = t.id_disciplina 
     LEFT JOIN SessoesEstudo s ON s.id_tarefa = t.id_tarefa AND s.fim IS NOT NULL
     WHERE t.id_tarefa = @id
     GROUP BY t.id_tarefa, t.id_disciplina, t.titulo, t.descricao, t.data_prevista, t.status, t.horas_estimadas, t.lembrete_nota, t.concluida_em, t.criado_em, t.atualizado_em, d.nome`,
    { id: taskId }
  );

  const returnedTask = updatedTask.recordset[0];
  res.json({
    mensagem: 'Tarefa atualizada com sucesso!',
    task: returnedTask,
    tarefa: returnedTask
  });
};
app.put('/api/tasks/:id', updateTaskHandler);
app.put('/api/tarefas/:id', updateTaskHandler);

// DELETE /api/tasks/:id (ou /api/tarefas/:id)
const deleteTaskHandler = async (req, res) => {
  const taskId = parseInt(req.params.id, 10);

  const existingRes = await query(
    `SELECT t.titulo, d.nome as nome_disciplina 
     FROM Tarefas t 
     JOIN Disciplinas d ON d.id_disciplina = t.id_disciplina 
     WHERE t.id_tarefa = @id AND d.id_usuario = @id_usuario`,
    { id: taskId, id_usuario: req.userId }
  );

  const existing = existingRes.recordset[0];
  if (!existing) {
    return res.status(404).json({ erro: 'Tarefa não encontrada.', codigo: 'NOT_FOUND' });
  }

  await transaction(async (tx) => {
    const delSess = new sql.Request(tx);
    delSess.input('id', sql.Int, taskId);
    await delSess.query('DELETE FROM SessoesEstudo WHERE id_tarefa = @id');

    const delTask = new sql.Request(tx);
    delTask.input('id', sql.Int, taskId);
    await delTask.query('DELETE FROM Tarefas WHERE id_tarefa = @id');

    await recordActivity(tx, {
      userId: req.userId,
      tipo: 'TAREFA_EXCLUIDA',
      idEntidade: taskId,
      nomeDisciplina: existing.nome_disciplina,
      descricao: `Tarefa "${existing.titulo}" foi excluída`
    });
  });

  invalidateUserMetricsCache(req.userId);
  res.json({ mensagem: 'Tarefa excluída com sucesso!' });
};
app.delete('/api/tasks/:id', deleteTaskHandler);
app.delete('/api/tarefas/:id', deleteTaskHandler);

// -------------------------------------------------------------
// ROTAS DE REGISTRO DE TEMPO E CRONÔMETRO (SEÇÃO 3)
// -------------------------------------------------------------

// POST /api/tarefas/:id/sessoes/iniciar - Inicia cronômetro na tarefa
app.post('/api/tarefas/:id/sessoes/iniciar', async (req, res) => {
  const taskId = parseInt(req.params.id, 10);
  if (isNaN(taskId)) {
    return res.status(400).json({ erro: 'ID da tarefa inválido.', codigo: 'INVALID_ID' });
  }

  const taskCheck = await query(
    `SELECT t.id_tarefa, t.titulo, d.nome as nome_disciplina 
     FROM Tarefas t 
     JOIN Disciplinas d ON d.id_disciplina = t.id_disciplina 
     WHERE t.id_tarefa = @id AND d.id_usuario = @id_usuario`,
    { id: taskId, id_usuario: req.userId }
  );

  const task = taskCheck.recordset[0];
  if (!task) {
    return res.status(404).json({ erro: 'Tarefa não encontrada.', codigo: 'NOT_FOUND' });
  }

  try {
    const sessionResult = await transaction(async (tx) => {
      // 1. Pausar automaticamente qualquer cronômetro ativo anterior deste usuário
      const pausePrev = new sql.Request(tx);
      pausePrev.input('id_usuario', sql.Int, req.userId);
      await pausePrev.query(`
        UPDATE SessoesEstudo 
        SET fim = CASE WHEN SYSUTCDATETIME() >= inicio THEN SYSUTCDATETIME() ELSE inicio END 
        WHERE id_usuario = @id_usuario AND fim IS NULL
      `);

      // 2. Iniciar nova sessão ativa
      const insReq = new sql.Request(tx);
      insReq.input('id_tarefa', sql.Int, taskId);
      insReq.input('id_usuario', sql.Int, req.userId);
      insReq.input('origem', sql.NVarChar(12), 'Cronometro');

      const ins = await insReq.query(`
        INSERT INTO SessoesEstudo (id_tarefa, id_usuario, inicio, fim, origem)
        OUTPUT INSERTED.*
        VALUES (@id_tarefa, @id_usuario, SYSUTCDATETIME(), NULL, @origem)
      `);

      return ins.recordset[0];
    });

    invalidateUserMetricsCache(req.userId);

    res.status(201).json({
      mensagem: 'Cronômetro iniciado!',
      sessao: {
        ...sessionResult,
        id: sessionResult.id_sessao,
        id_tarefa: sessionResult.id_tarefa,
        iniciado_em: sessionResult.inicio,
        inicio: sessionResult.inicio,
        tarefa_titulo: task.titulo,
        titulo_tarefa: task.titulo,
        nome_disciplina: task.nome_disciplina
      }
    });
  } catch (err) {
    console.error('[TIMER START ERR]', err);
    res.status(500).json({ erro: 'Erro ao iniciar cronômetro.', codigo: 'SERVER_ERROR' });
  }
});

// POST /api/sessoes/:id/pausar - Pausa a sessão ativa
app.post('/api/sessoes/:id/pausar', async (req, res) => {
  const sessionId = parseInt(req.params.id, 10);
  if (isNaN(sessionId)) {
    return res.status(400).json({ erro: 'ID da sessão inválido.', codigo: 'INVALID_ID' });
  }

  const sessCheck = await query(
    `SELECT s.*, t.titulo as tarefa_titulo, d.nome as nome_disciplina 
     FROM SessoesEstudo s
     JOIN Tarefas t ON t.id_tarefa = s.id_tarefa
     JOIN Disciplinas d ON d.id_disciplina = t.id_disciplina
     WHERE s.id_sessao = @id AND s.id_usuario = @id_usuario`,
    { id: sessionId, id_usuario: req.userId }
  );

  const sess = sessCheck.recordset[0];
  if (!sess) {
    return res.status(404).json({ erro: 'Sessão não encontrada.', codigo: 'NOT_FOUND' });
  }

  if (sess.fim !== null) {
    return res.json({ 
      mensagem: 'Sessão já se encontra finalizada.', 
      sessao: {
        ...sess,
        id: sess.id_sessao,
        id_tarefa: sess.id_tarefa,
        tarefa_titulo: sess.tarefa_titulo,
        titulo_tarefa: sess.tarefa_titulo,
        nome_disciplina: sess.nome_disciplina
      } 
    });
  }

  const updated = await transaction(async (tx) => {
    const upReq = new sql.Request(tx);
    upReq.input('id', sql.BigInt, sessionId);
    upReq.input('id_usuario', sql.Int, req.userId);

    const up = await upReq.query(`
      UPDATE SessoesEstudo 
      SET fim = CASE WHEN SYSUTCDATETIME() >= inicio THEN SYSUTCDATETIME() ELSE inicio END 
      OUTPUT INSERTED.*
      WHERE id_sessao = @id AND id_usuario = @id_usuario AND fim IS NULL
    `);

    const finalSess = up.recordset[0];
    const durationMin = Math.round((finalSess?.duracao_seg || 0) / 60);

    await recordActivity(tx, {
      userId: req.userId,
      tipo: 'SESSAO_REGISTRADA',
      idEntidade: sess.id_tarefa,
      nomeDisciplina: sess.nome_disciplina,
      descricao: `Sessão de ${durationMin} min registrada via Cronômetro em "${sess.tarefa_titulo}"`
    });

    return finalSess;
  });

  invalidateUserMetricsCache(req.userId);
  res.json({ 
    mensagem: 'Cronômetro pausado com sucesso.', 
    sessao: {
      ...updated,
      id: updated?.id_sessao,
      id_sessao: updated?.id_sessao,
      id_tarefa: sess.id_tarefa,
      tarefa_titulo: sess.tarefa_titulo,
      titulo_tarefa: sess.tarefa_titulo,
      nome_disciplina: sess.nome_disciplina
    } 
  });
});

// GET /api/sessoes/ativa - Sessão em andamento do usuário (ou null)
app.get('/api/sessoes/ativa', async (req, res) => {
  const result = await query(
    `SELECT TOP 1 
       s.id_sessao, s.id_sessao as id, s.id_tarefa, s.id_usuario, 
       s.inicio, s.inicio as iniciado_em, s.fim, s.origem,
       t.titulo as tarefa_titulo, t.titulo as titulo_tarefa, 
       d.nome as nome_disciplina, d.id_disciplina
     FROM SessoesEstudo s
     JOIN Tarefas t ON t.id_tarefa = s.id_tarefa
     JOIN Disciplinas d ON d.id_disciplina = t.id_disciplina
     WHERE s.id_usuario = @id_usuario AND s.fim IS NULL`,
    { id_usuario: req.userId }
  );

  const rawSessao = result.recordset[0] || null;
  res.json({ 
    ativa: Boolean(rawSessao),
    sessao_ativa: rawSessao,
    sessao: rawSessao
  });
});

// GET /api/tarefas/:id/sessoes - Lista de sessões de uma tarefa + totais
app.get('/api/tarefas/:id/sessoes', async (req, res) => {
  const taskId = parseInt(req.params.id, 10);

  const taskCheck = await query(
    `SELECT t.*, d.nome as nome_disciplina 
     FROM Tarefas t 
     JOIN Disciplinas d ON d.id_disciplina = t.id_disciplina 
     WHERE t.id_tarefa = @id AND d.id_usuario = @id_usuario`,
    { id: taskId, id_usuario: req.userId }
  );

  const task = taskCheck.recordset[0];
  if (!task) {
    return res.status(404).json({ erro: 'Tarefa não encontrada.', codigo: 'NOT_FOUND' });
  }

  const sessions = await query(
    `SELECT id_sessao, id_tarefa, inicio, fim, duracao_seg, origem, observacao, criado_em 
     FROM SessoesEstudo 
     WHERE id_tarefa = @id_tarefa 
     ORDER BY inicio DESC`,
    { id_tarefa: taskId }
  );

  const totalSeg = sessions.recordset.reduce((acc, s) => acc + (s.duracao_seg || 0), 0);
  const horasReais = Number((totalSeg / 3600.0).toFixed(2));
  const horasEstimadas = task.horas_estimadas ? Number(task.horas_estimadas) : null;
  const desvioPct = horasEstimadas && horasEstimadas > 0 && horasReais > 0
    ? Number((((horasReais - horasEstimadas) / horasEstimadas) * 100).toFixed(1))
    : null;

  res.json({
    tarefa: {
      id_tarefa: task.id_tarefa,
      titulo: task.titulo,
      horas_estimadas: horasEstimadas,
      horas_reais: horasReais,
      desvio_pct: desvioPct
    },
    sessoes: sessions.recordset
  });
});

// POST /api/tarefas/:id/sessoes - Cria sessão manual
app.post('/api/tarefas/:id/sessoes', async (req, res) => {
  const taskId = parseInt(req.params.id, 10);
  const { inicio, duracao_minutos, observacao } = req.body;

  const durationMin = parseInt(duracao_minutos, 10);
  if (!durationMin || durationMin < 1 || durationMin > 1440) {
    return res.status(400).json({ erro: 'A duração manual deve ser entre 1 minuto e 24 horas.', codigo: 'INVALID_DURATION' });
  }

  const startDate = inicio ? new Date(inicio) : new Date(Date.now() - durationMin * 60 * 1000);
  if (isNaN(startDate.getTime()) || startDate > new Date()) {
    return res.status(400).json({ erro: 'A data/hora de início não pode estar no futuro.', codigo: 'FUTURE_DATE' });
  }

  const endDate = new Date(startDate.getTime() + durationMin * 60 * 1000);

  const taskCheck = await query(
    `SELECT t.titulo, d.nome as nome_disciplina 
     FROM Tarefas t 
     JOIN Disciplinas d ON d.id_disciplina = t.id_disciplina 
     WHERE t.id_tarefa = @id AND d.id_usuario = @id_usuario`,
    { id: taskId, id_usuario: req.userId }
  );

  const task = taskCheck.recordset[0];
  if (!task) {
    return res.status(404).json({ erro: 'Tarefa não encontrada.', codigo: 'NOT_FOUND' });
  }

  const createdSession = await transaction(async (tx) => {
    const insReq = new sql.Request(tx);
    insReq.input('id_tarefa', sql.Int, taskId);
    insReq.input('id_usuario', sql.Int, req.userId);
    insReq.input('inicio', sql.DateTime2(0), startDate);
    insReq.input('fim', sql.DateTime2(0), endDate);
    insReq.input('origem', sql.NVarChar(12), 'Manual');
    insReq.input('observacao', sql.NVarChar(300), observacao ? observacao.trim() : null);

    const ins = await insReq.query(`
      INSERT INTO SessoesEstudo (id_tarefa, id_usuario, inicio, fim, origem, observacao)
      OUTPUT INSERTED.*
      VALUES (@id_tarefa, @id_usuario, @inicio, @fim, @origem, @observacao)
    `);

    await recordActivity(tx, {
      userId: req.userId,
      tipo: 'SESSAO_REGISTRADA',
      idEntidade: taskId,
      nomeDisciplina: task.nome_disciplina,
      descricao: `Sessão de ${durationMin} min registrada manualmente em "${task.titulo}"`
    });

    return ins.recordset[0];
  });

  invalidateUserMetricsCache(req.userId);
  res.status(201).json({ mensagem: 'Sessão manual registrada com sucesso!', sessao: createdSession });
});

// PUT /api/sessoes/:id - Edita sessão existente
app.put('/api/sessoes/:id', async (req, res) => {
  const sessionId = parseInt(req.params.id, 10);
  const { inicio, duracao_minutos, observacao } = req.body;

  const sessCheck = await query('SELECT * FROM SessoesEstudo WHERE id_sessao = @id AND id_usuario = @id_usuario', {
    id: sessionId,
    id_usuario: req.userId
  });

  const sess = sessCheck.recordset[0];
  if (!sess) {
    return res.status(404).json({ erro: 'Sessão não encontrada.', codigo: 'NOT_FOUND' });
  }

  let startDate = sess.inicio;
  let endDate = sess.fim;

  if (duracao_minutos) {
    const durMin = parseInt(duracao_minutos, 10);
    if (durMin < 1 || durMin > 1440) {
      return res.status(400).json({ erro: 'A duração deve estar entre 1 minuto e 24 horas.', codigo: 'INVALID_DURATION' });
    }
    if (inicio) startDate = new Date(inicio);
    endDate = new Date(new Date(startDate).getTime() + durMin * 60 * 1000);
  } else if (inicio) {
    startDate = new Date(inicio);
  }

  await query(
    `UPDATE SessoesEstudo SET
       inicio = @inicio,
       fim = @fim,
       observacao = COALESCE(@observacao, observacao)
     WHERE id_sessao = @id AND id_usuario = @id_usuario`,
    {
      id: sessionId,
      id_usuario: req.userId,
      inicio: startDate,
      fim: endDate,
      observacao: observacao !== undefined ? observacao.trim() : null
    }
  );

  invalidateUserMetricsCache(req.userId);
  res.json({ mensagem: 'Sessão atualizada com sucesso!' });
});

// DELETE /api/sessoes/:id - Exclui sessão
app.delete('/api/sessoes/:id', async (req, res) => {
  const sessionId = parseInt(req.params.id, 10);

  const result = await query(
    'DELETE FROM SessoesEstudo WHERE id_sessao = @id AND id_usuario = @id_usuario',
    { id: sessionId, id_usuario: req.userId }
  );

  if (result.rowsAffected[0] === 0) {
    return res.status(404).json({ erro: 'Sessão não encontrada.', codigo: 'NOT_FOUND' });
  }

  invalidateUserMetricsCache(req.userId);
  res.json({ mensagem: 'Sessão excluída com sucesso!' });
});

// -------------------------------------------------------------
// DASHBOARD STATS (MVP) & PROXY ANALYTICS (V2)
// -------------------------------------------------------------

// GET /api/dashboard/stats (Compatibilidade MVP)
app.get('/api/dashboard/stats', async (req, res) => {
  try {
    const discStats = await query(
      `SELECT 
         id_disciplina as id,
         nome_disciplina as name,
         carga_horaria as hours,
         total_tarefas,
         concluidas as completed_tasks,
         pendentes as pending_tasks,
         progresso_simples_pct as progress_percent,
         progresso_ponderado_pct,
         horas_reais_total as hours_spent
       FROM vw_ProgressoDisciplina
       WHERE id_usuario = @id_usuario`,
      { id_usuario: req.userId }
    );

    const disciplines = discStats.recordset;
    const totalDisciplines = disciplines.length;
    const totalTasks = disciplines.reduce((acc, d) => acc + d.total_tarefas, 0);
    const completedTasks = disciplines.reduce((acc, d) => acc + d.completed_tasks, 0);
    const pendingTasks = disciplines.reduce((acc, d) => acc + d.pending_tasks, 0);
    const totalHoursSpent = disciplines.reduce((acc, d) => acc + (d.hours_spent || 0), 0);
    const totalCourseHours = disciplines.reduce((acc, d) => acc + d.hours, 0);
    const overallProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const timePerDiscipline = disciplines.map(d => ({
      name: d.name.length > 20 ? d.name.substring(0, 18) + '...' : d.name,
      fullName: d.name,
      hours: d.hours_spent,
      totalHours: d.hours
    }));

    const progressPerDiscipline = disciplines.map(d => ({
      name: d.name.length > 20 ? d.name.substring(0, 18) + '...' : d.name,
      fullName: d.name,
      progress: d.progress_percent,
      completed: d.completed_tasks,
      total: d.total_tarefas
    }));

    const upcomingTasks = await query(
      `SELECT TOP 5 
         t.id_tarefa as id, t.titulo as title, t.data_prevista as due_date, 
         t.status, d.nome as discipline_name 
       FROM Tarefas t 
       JOIN Disciplinas d ON d.id_disciplina = t.id_disciplina 
       WHERE d.id_usuario = @id_usuario AND t.status = 'Pendente' 
       ORDER BY CASE WHEN t.data_prevista IS NULL THEN 1 ELSE 0 END, t.data_prevista ASC`,
      { id_usuario: req.userId }
    );

    res.json({
      summary: {
        totalDisciplines,
        totalTasks,
        completedTasks,
        pendingTasks,
        totalHoursSpent: Number(totalHoursSpent.toFixed(1)),
        totalCourseHours,
        overallProgress
      },
      disciplines,
      charts: {
        timePerDiscipline,
        progressPerDiscipline
      },
      upcomingTasks: upcomingTasks.recordset
    });
  } catch (err) {
    console.error('[DASHBOARD STATS ERR]', err);
    res.status(500).json({ erro: 'Erro ao compilar dados do dashboard.', codigo: 'SERVER_ERROR' });
  }
});

// GET /api/dashboard/metricas - Proxy para Python com cache em memória (60s)
app.get('/api/dashboard/metricas', async (req, res) => {
  const userId = req.userId;
  const now = Date.now();

  const cached = metricsCache.get(userId);
  if (cached && cached.expiresAt > now) {
    return res.json(cached.data);
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const pyRes = await fetch(`${ANALYTICS_URL}/v1/usuarios/${userId}/metricas`, {
      headers: { 'X-Internal-Key': ANALYTICS_KEY },
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (!pyRes.ok) {
      throw new Error(`Analytics service respondeu status ${pyRes.status}`);
    }

    const data = await pyRes.json();
    metricsCache.set(userId, { data, expiresAt: now + 60 * 1000 });
    res.json(data);
  } catch (err) {
    // Fallback gracioso: calcular diretamente a partir das views do SQL Server
    const discRes = await query(
      `SELECT 
         id_disciplina, nome_disciplina as nome, carga_horaria,
         progresso_simples_pct, progresso_ponderado_pct,
         horas_estimadas_total, horas_reais_total,
         CASE 
           WHEN horas_estimadas_total > 0 AND horas_reais_total > 0 
           THEN CAST(ROUND(((horas_reais_total - horas_estimadas_total) / horas_estimadas_total) * 100.0, 1) AS DECIMAL(6,1))
           ELSE NULL 
         END as desvio_pct,
         data_fim,
         CASE 
           WHEN pendentes = 0 THEN 'concluida'
           WHEN atrasadas > 0 THEN 'atrasada'
           ELSE 'no_prazo'
         END as situacao_previsao,
         'media' as confianca,
         0 as tarefas_sem_estimativa
       FROM vw_ProgressoDisciplina
       WHERE id_usuario = @id_usuario`,
      { id_usuario: userId }
    );

    const countsRes = await query(
      `SELECT 
         COUNT(*) as total,
         SUM(CASE WHEN t.status = 'Pendente' THEN 1 ELSE 0 END) as pendentes,
         SUM(CASE WHEN t.status = 'Concluida' THEN 1 ELSE 0 END) as concluidas,
         SUM(CASE WHEN t.status = 'Pendente' AND t.data_prevista < CAST(GETDATE() AS DATE) THEN 1 ELSE 0 END) as atrasadas,
         SUM(CASE WHEN t.status = 'Pendente' AND t.data_prevista >= CAST(GETDATE() AS DATE) AND t.data_prevista <= DATEADD(DAY, 7, CAST(GETDATE() AS DATE)) THEN 1 ELSE 0 END) as vencendo_7_dias
       FROM Tarefas t 
       JOIN Disciplinas d ON d.id_disciplina = t.id_disciplina 
       WHERE d.id_usuario = @id_usuario`,
      { id_usuario: userId }
    );

    const userRes = await query('SELECT meta_semanal_horas FROM Usuarios WHERE id_usuario = @id_usuario', { id_usuario: userId });
    const metaSemanal = Number(userRes.recordset[0]?.meta_semanal_horas || 10);

    const horasSemanaRes = await query(
      `SELECT TOP 8 semana_inicio, horas_estudadas as horas_reais, tarefas_concluidas
       FROM vw_HorasPorSemana 
       WHERE id_usuario = @id_usuario 
       ORDER BY semana_inicio DESC`,
      { id_usuario: userId }
    );

    const evolucaoSemanal = (horasSemanaRes.recordset || []).map(s => ({
      ...s,
      meta_horas: metaSemanal
    }));

    const disciplinas = discRes.recordset;
    const somaCargas = disciplinas.reduce((acc, d) => acc + d.carga_horaria, 0);
    const progGeralPond = somaCargas > 0
      ? Number((disciplinas.reduce((acc, d) => acc + (d.carga_horaria * (d.progresso_ponderado_pct || 0)), 0) / somaCargas).toFixed(1))
      : 0;
    const progGeralSimples = disciplinas.length > 0
      ? Number((disciplinas.reduce((acc, d) => acc + (d.progresso_simples_pct || 0), 0) / disciplinas.length).toFixed(1))
      : 0;

    const fallbackMetrics = {
      gerado_em: new Date().toISOString(),
      fonte: 'fallback_sql',
      geral: {
        progresso_geral_ponderado_pct: progGeralPond,
        progresso_geral_simples_pct: progGeralSimples,
        velocidade_horas_semana: 5.0,
        velocidade_tarefas_semana: 2.5,
        horas_semana_atual: evolucaoSemanal[0]?.horas_reais || 0,
        meta_semanal_horas: metaSemanal,
        percentual_meta_semanal: metaSemanal > 0 ? Number((((evolucaoSemanal[0]?.horas_reais || 0) / metaSemanal) * 100).toFixed(1)) : 0,
        sequencia_dias: 3,
        tarefas: countsRes.recordset[0] || { pendentes: 0, concluidas: 0, atrasadas: 0, vencendo_7_dias: 0 }
      },
      disciplinas,
      evolucao_semanal: evolucaoSemanal
    };

    res.json(fallbackMetrics);
  }
});

const runningIaJobs = new Set();

// GET /api/insights - Insights Inteligentes (Seção 5.6)
app.get('/api/insights', async (req, res) => {
  const userId = req.userId;
  const force = req.query.forcar === 'true';

  try {
    const userRes = await query('SELECT ia_habilitada FROM Usuarios WHERE id_usuario = @id_usuario', { id_usuario: userId });
    const iaHabilitada = userRes.recordset[0]?.ia_habilitada === 1 || userRes.recordset[0]?.ia_habilitada === true;

    if (!force) {
      const cacheRes = await query(
        `SELECT payload_json, expira_em 
         FROM InsightCache 
         WHERE id_usuario = @id_usuario AND expira_em > SYSUTCDATETIME()`,
        { id_usuario: userId }
      );
      if (cacheRes.recordset.length > 0) {
        const payload = JSON.parse(cacheRes.recordset[0].payload_json);
        return res.json(payload);
      }
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const ruleRes = await fetch(`${ANALYTICS_URL}/v1/usuarios/${userId}/insights?modo=regras`, {
      headers: { 'X-Internal-Key': ANALYTICS_KEY },
      signal: controller.signal
    });
    clearTimeout(timeout);

    let ruleData = { insights: [], fonte_predominante: 'regra', status_ia: iaHabilitada ? 'processando' : 'desativada' };
    if (ruleRes.ok) {
      ruleData = await ruleRes.json();
    }

    if (iaHabilitada && !runningIaJobs.has(userId)) {
      runningIaJobs.add(userId);
      (async () => {
        try {
          const iaRes = await fetch(`${ANALYTICS_URL}/v1/usuarios/${userId}/insights?modo=ia`, {
            headers: { 'X-Internal-Key': ANALYTICS_KEY }
          });
          if (iaRes.ok) {
            const iaData = await iaRes.json();
            const inputHash = crypto.createHash('sha256').update(JSON.stringify(iaData.insights.map(i => i.id))).digest('hex');
            
            await query(
              `MERGE INTO InsightCache AS target
               USING (VALUES (@id_usuario, @hash_entrada, @payload_json, DATEADD(HOUR, 6, SYSUTCDATETIME()))) 
               AS source (id_usuario, hash_entrada, payload_json, expira_em)
               ON target.id_usuario = source.id_usuario
               WHEN MATCHED THEN 
                 UPDATE SET hash_entrada = source.hash_entrada, payload_json = source.payload_json, expira_em = source.expira_em, gerado_em = SYSUTCDATETIME()
               WHEN NOT MATCHED THEN
                 INSERT (id_usuario, hash_entrada, payload_json, expira_em)
                 VALUES (source.id_usuario, source.hash_entrada, source.payload_json, source.expira_em);`,
              {
                id_usuario: userId,
                hash_entrada: inputHash,
                payload_json: JSON.stringify(iaData)
              }
            );
          }
        } catch (iaErr) {
          console.warn('[INSIGHTS BACKGROUND IA ERR]', iaErr.message);
        } finally {
          runningIaJobs.delete(userId);
        }
      })();
    }

    res.json(ruleData);
  } catch (err) {
    res.json({
      gerado_em: new Date().toISOString(),
      fonte_predominante: 'regra',
      status_ia: 'indisponivel',
      insights: [
        {
          id: 'DICA_GERAL',
          codigo: 'DICA_GERAL',
          severidade: 'info',
          titulo: 'Mantenha o foco em suas metas',
          texto: 'Registre sessões regulares de estudo para alimentar previsões e recomendações inteligentes.',
          fonte: 'regra',
          metricas: {},
          acao_sugerida: null
        }
      ]
    });
  }
});

// -------------------------------------------------------------
// RELATÓRIOS SEMANAIS EM PDF (ASSÍNCRONO - SEÇÃO 7)
// -------------------------------------------------------------

app.post('/api/relatorios/semanal', reportLimiter, async (req, res) => {
  const { semana_inicio } = req.body;
  const userId = req.userId;

  try {
    const pyRes = await fetch(`${ANALYTICS_URL}/v1/relatorios`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Key': ANALYTICS_KEY
      },
      body: JSON.stringify({ id_usuario: userId, semana_inicio: semana_inicio || null })
    });

    if (pyRes.status === 429) {
      return res.status(429).json({ erro: 'Limite de relatórios simultâneos atingido. Tente em instantes.', codigo: 'CONCURRENCY_LIMIT' });
    }

    if (!pyRes.ok) {
      throw new Error(`Analytics service respondeu ${pyRes.status}`);
    }

    const jobInfo = await pyRes.json();
    res.status(202).json(jobInfo);
  } catch (err) {
    console.error('[REPORT ERROR]', err);
    res.status(503).json({ erro: 'Serviço de geração de relatórios indisponível no momento.', detalhe: err.message, codigo: 'SERVICE_UNAVAILABLE' });
  }
});

app.get('/api/relatorios/semanal/:id_job', async (req, res) => {
  const { id_job } = req.params;
  const userId = req.userId;

  try {
    const pyRes = await fetch(`${ANALYTICS_URL}/v1/relatorios/${id_job}?id_usuario=${userId}`, {
      headers: { 'X-Internal-Key': ANALYTICS_KEY }
    });

    if (pyRes.status === 404) {
      return res.status(404).json({ erro: 'Relatório não encontrado.', codigo: 'NOT_FOUND' });
    }

    const status = await pyRes.json();
    res.json(status);
  } catch (err) {
    res.status(503).json({ erro: 'Falha ao consultar status do relatório.', codigo: 'SERVICE_UNAVAILABLE' });
  }
});

app.get('/api/relatorios/semanal/:id_job/arquivo', async (req, res) => {
  const { id_job } = req.params;
  const userId = req.userId;

  try {
    const pyRes = await fetch(`${ANALYTICS_URL}/v1/relatorios/${id_job}/arquivo?id_usuario=${userId}`, {
      headers: { 'X-Internal-Key': ANALYTICS_KEY }
    });

    if (pyRes.status === 404) {
      return res.status(404).json({ erro: 'Arquivo do relatório não encontrado.', codigo: 'NOT_FOUND' });
    }

    const contentDisposition = pyRes.headers.get('content-disposition') || `attachment; filename="EduTrack_Relatorio_${id_job}.pdf"`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', contentDisposition);

    const buffer = await pyRes.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch (err) {
    res.status(503).json({ erro: 'Falha ao descarregar PDF do relatório.', codigo: 'SERVICE_UNAVAILABLE' });
  }
});

// -------------------------------------------------------------
// SERVIR ARQUIVOS ESTÁTICOS DO FRONTEND EM PRODUÇÃO
// -------------------------------------------------------------
const frontendDist = path.join(__dirname, '../frontend/dist');
if (require('fs').existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

app.use('/api/*', (req, res) => {
  res.status(404).json({ erro: 'Endpoint não encontrado.', codigo: 'NOT_FOUND' });
});

app.use((err, req, res, next) => {
  console.error('[UNHANDLED ERROR]', err);
  res.status(500).json({ erro: 'Ocorreu um erro interno no servidor.', codigo: 'INTERNAL_SERVER_ERROR' });
});

app.listen(PORT, () => {
  console.log(`[SERVER] EduTrack AI Backend rodando com sucesso na porta ${PORT}`);
});

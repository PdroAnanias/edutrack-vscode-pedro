const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');
const { generateInsights } = require('./aiEngine');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Helper to get userId from header or default to first user for simplicity
function getUserId(req) {
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const parsed = parseInt(token, 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  // Fallback to first user in db
  const firstUser = db.prepare('SELECT id FROM users LIMIT 1').get();
  return firstUser ? firstUser.id : 1;
}

// -------------------------------------------------------------
// AUTH ROUTES
// -------------------------------------------------------------

// POST /api/auth/login
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email e senha são obrigatórios.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.trim().toLowerCase());
  if (!user || user.password !== password) {
    return res.status(401).json({ error: 'E-mail ou senha incorretos.' });
  }

  const { password: _, ...userWithoutPassword } = user;
  res.json({
    message: 'Login realizado com sucesso!',
    token: String(user.id),
    user: userWithoutPassword
  });
});

// POST /api/auth/register
app.post('/api/auth/register', (req, res) => {
  const { name, surname, email, password, phone, course } = req.body;
  if (!name || !surname || !email || !password || !course) {
    return res.status(400).json({ error: 'Preencha todos os campos obrigatórios.' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.trim().toLowerCase());
  if (existing) {
    return res.status(400).json({ error: 'Este e-mail já está cadastrado.' });
  }

  try {
    const insert = db.prepare(`
      INSERT INTO users (name, surname, email, password, phone, course, avatar)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const result = insert.run(
      name.trim(),
      surname.trim(),
      email.trim().toLowerCase(),
      password,
      phone ? phone.trim() : '',
      course,
      ''
    );
    const newUserId = result.lastInsertRowid;
    const user = db.prepare('SELECT id, name, surname, email, phone, course, avatar FROM users WHERE id = ?').get(newUserId);

    res.status(201).json({
      message: 'Cadastro realizado com sucesso!',
      token: String(newUserId),
      user
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao cadastrar usuário: ' + err.message });
  }
});

// POST /api/auth/forgot-password/request (Screen 1)
app.post('/api/auth/forgot-password/request', (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Informe o e-mail.' });
  }

  const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email.trim().toLowerCase());
  if (!user) {
    return res.status(404).json({ error: 'Nenhuma conta encontrada com este e-mail.' });
  }

  // Generate 5-digit verification code
  const code = Math.floor(10000 + Math.random() * 90000).toString();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  db.prepare(`
    INSERT INTO password_resets (email, code, expires_at)
    VALUES (?, ?, ?)
    ON CONFLICT(email) DO UPDATE SET code = excluded.code, expires_at = excluded.expires_at
  `).run(email.trim().toLowerCase(), code, expiresAt);

  console.log(`[EduTrack AI] Código de verificação para ${email}: ${code}`);

  res.json({
    message: 'Código de verificação enviado com sucesso!',
    // Return code in dev for instant convenient testing
    demoCode: code
  });
});

// POST /api/auth/forgot-password/verify (Screen 2)
app.post('/api/auth/forgot-password/verify', (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) {
    return res.status(400).json({ error: 'E-mail e código são obrigatórios.' });
  }

  const reset = db.prepare('SELECT * FROM password_resets WHERE email = ?').get(email.trim().toLowerCase());
  if (!reset) {
    return res.status(400).json({ error: 'Nenhuma solicitação ativa encontrada para este e-mail.' });
  }

  if (reset.code !== code.trim()) {
    return res.status(400).json({ error: 'Código de verificação inválido. Tente novamente.' });
  }

  res.json({ message: 'Código validado com sucesso! Prossiga para redefinir sua senha.' });
});

// POST /api/auth/forgot-password/reset (Screen 3)
app.post('/api/auth/forgot-password/reset', (req, res) => {
  const { email, code, newPassword } = req.body;
  if (!email || !code || !newPassword) {
    return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
  }

  const reset = db.prepare('SELECT * FROM password_resets WHERE email = ?').get(email.trim().toLowerCase());
  if (!reset || reset.code !== code.trim()) {
    return res.status(400).json({ error: 'Código inválido ou expirado.' });
  }

  db.prepare('UPDATE users SET password = ? WHERE email = ?').run(newPassword, email.trim().toLowerCase());
  db.prepare('DELETE FROM password_resets WHERE email = ?').run(email.trim().toLowerCase());

  res.json({ message: 'Senha atualizada com sucesso! Você já pode fazer login.' });
});

// -------------------------------------------------------------
// USER PROFILE
// -------------------------------------------------------------

app.get('/api/user/profile', (req, res) => {
  const userId = getUserId(req);
  const user = db.prepare('SELECT id, name, surname, email, phone, course, avatar FROM users WHERE id = ?').get(userId);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });
  res.json(user);
});

app.put('/api/user/profile', (req, res) => {
  const userId = getUserId(req);
  const { name, surname, email, phone, course, avatar } = req.body;
  
  if (!name || !surname || !email) {
    return res.status(400).json({ error: 'Nome, sobrenome e e-mail são obrigatórios.' });
  }

  db.prepare(`
    UPDATE users 
    SET name = ?, surname = ?, email = ?, phone = ?, course = ?, avatar = COALESCE(?, avatar)
    WHERE id = ?
  `).run(name.trim(), surname.trim(), email.trim().toLowerCase(), phone || '', course || '', avatar, userId);

  const updated = db.prepare('SELECT id, name, surname, email, phone, course, avatar FROM users WHERE id = ?').get(userId);
  res.json({ message: 'Perfil atualizado com sucesso!', user: updated });
});

// -------------------------------------------------------------
// DISCIPLINES & TASKS
// -------------------------------------------------------------

// Helper to get discipline list with aggregated statistics
function getDisciplinesWithStats(userId) {
  const disciplines = db.prepare('SELECT * FROM disciplines WHERE user_id = ? ORDER BY name ASC').all(userId);
  const tasks = db.prepare('SELECT * FROM tasks WHERE user_id = ?').all(userId);

  return disciplines.map(disc => {
    const discTasks = tasks.filter(t => t.discipline_id === disc.id);
    const total_tasks = discTasks.length;
    const completed_tasks = discTasks.filter(t => t.status === 'Concluída').length;
    const pending_tasks = total_tasks - completed_tasks;
    const progress_percent = total_tasks > 0 ? Math.round((completed_tasks / total_tasks) * 100) : 0;
    const hours_spent = discTasks.reduce((acc, t) => acc + (Number(t.hours_spent) || 0), 0);

    return {
      ...disc,
      total_tasks,
      completed_tasks,
      pending_tasks,
      progress_percent,
      hours_spent: Number(hours_spent.toFixed(1))
    };
  });
}

// GET /api/disciplines
app.get('/api/disciplines', (req, res) => {
  const userId = getUserId(req);
  const list = getDisciplinesWithStats(userId);
  res.json(list);
});

// POST /api/disciplines
app.post('/api/disciplines', (req, res) => {
  const userId = getUserId(req);
  const { name, teacher, hours, description, start_date, end_date } = req.body;

  if (!name || !teacher) {
    return res.status(400).json({ error: 'Nome da disciplina e nome do professor são obrigatórios.' });
  }

  const result = db.prepare(`
    INSERT INTO disciplines (user_id, name, teacher, hours, description, start_date, end_date)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    userId,
    name.trim(),
    teacher.trim(),
    parseInt(hours, 10) || 60,
    description ? description.trim() : '',
    start_date || '',
    end_date || ''
  );

  const created = db.prepare('SELECT * FROM disciplines WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({
    message: 'Disciplina criada com sucesso!',
    discipline: {
      ...created,
      total_tasks: 0,
      completed_tasks: 0,
      pending_tasks: 0,
      progress_percent: 0,
      hours_spent: 0
    }
  });
});

// PUT /api/disciplines/:id
app.put('/api/disciplines/:id', (req, res) => {
  const userId = getUserId(req);
  const discId = parseInt(req.params.id, 10);
  const { name, teacher, hours, description, start_date, end_date } = req.body;

  if (!name || !teacher) {
    return res.status(400).json({ error: 'Nome e professor são obrigatórios.' });
  }

  const result = db.prepare(`
    UPDATE disciplines
    SET name = ?, teacher = ?, hours = ?, description = ?, start_date = ?, end_date = ?
    WHERE id = ? AND user_id = ?
  `).run(
    name.trim(),
    teacher.trim(),
    parseInt(hours, 10) || 60,
    description ? description.trim() : '',
    start_date || '',
    end_date || '',
    discId,
    userId
  );

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Disciplina não encontrada.' });
  }

  res.json({ message: 'Disciplina atualizada com sucesso!' });
});

// DELETE /api/disciplines/:id
app.delete('/api/disciplines/:id', (req, res) => {
  const userId = getUserId(req);
  const discId = parseInt(req.params.id, 10);

  db.prepare('DELETE FROM tasks WHERE discipline_id = ? AND user_id = ?').run(discId, userId);
  const result = db.prepare('DELETE FROM disciplines WHERE id = ? AND user_id = ?').run(discId, userId);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Disciplina não encontrada.' });
  }

  res.json({ message: 'Disciplina e tarefas vinculadas excluídas com sucesso!' });
});

// -------------------------------------------------------------
// TASKS
// -------------------------------------------------------------

// GET /api/tasks
app.get('/api/tasks', (req, res) => {
  const userId = getUserId(req);
  const { discipline_id } = req.query;

  let query = `
    SELECT t.*, d.name as discipline_name 
    FROM tasks t
    JOIN disciplines d ON d.id = t.discipline_id
    WHERE t.user_id = ?
  `;
  const params = [userId];

  if (discipline_id) {
    query += ` AND t.discipline_id = ?`;
    params.push(parseInt(discipline_id, 10));
  }

  query += ` ORDER BY t.due_date ASC, t.id DESC`;

  const tasks = db.prepare(query).all(...params);
  res.json(tasks);
});

// POST /api/tasks
app.post('/api/tasks', (req, res) => {
  const userId = getUserId(req);
  const { discipline_id, title, description, due_date, status, notes, hours_spent } = req.body;

  if (!discipline_id || !title) {
    return res.status(400).json({ error: 'Disciplina e título da tarefa são obrigatórios.' });
  }

  const result = db.prepare(`
    INSERT INTO tasks (discipline_id, user_id, title, description, due_date, status, notes, hours_spent)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    parseInt(discipline_id, 10),
    userId,
    title.trim(),
    description ? description.trim() : '',
    due_date || '',
    status || 'Pendente',
    notes ? notes.trim() : '',
    parseFloat(hours_spent) || 0
  );

  const created = db.prepare(`
    SELECT t.*, d.name as discipline_name 
    FROM tasks t
    JOIN disciplines d ON d.id = t.discipline_id
    WHERE t.id = ?
  `).get(result.lastInsertRowid);

  res.status(201).json({ message: 'Tarefa criada com sucesso!', task: created });
});

// PUT /api/tasks/:id
app.put('/api/tasks/:id', (req, res) => {
  const userId = getUserId(req);
  const taskId = parseInt(req.params.id, 10);
  const { title, description, due_date, status, notes, hours_spent } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'Título é obrigatório.' });
  }

  const result = db.prepare(`
    UPDATE tasks
    SET title = ?, description = ?, due_date = ?, status = ?, notes = ?, hours_spent = ?
    WHERE id = ? AND user_id = ?
  `).run(
    title.trim(),
    description ? description.trim() : '',
    due_date || '',
    status || 'Pendente',
    notes ? notes.trim() : '',
    parseFloat(hours_spent) || 0,
    taskId,
    userId
  );

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Tarefa não encontrada.' });
  }

  const updated = db.prepare(`
    SELECT t.*, d.name as discipline_name 
    FROM tasks t
    JOIN disciplines d ON d.id = t.discipline_id
    WHERE t.id = ?
  `).get(taskId);

  res.json({ message: 'Tarefa atualizada com sucesso!', task: updated });
});

// DELETE /api/tasks/:id
app.delete('/api/tasks/:id', (req, res) => {
  const userId = getUserId(req);
  const taskId = parseInt(req.params.id, 10);

  const result = db.prepare('DELETE FROM tasks WHERE id = ? AND user_id = ?').run(taskId, userId);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Tarefa não encontrada.' });
  }

  res.json({ message: 'Tarefa excluída com sucesso!' });
});

// -------------------------------------------------------------
// DASHBOARD & AI INSIGHTS
// -------------------------------------------------------------

// GET /api/dashboard/stats
app.get('/api/dashboard/stats', (req, res) => {
  const userId = getUserId(req);
  const disciplines = getDisciplinesWithStats(userId);
  const tasks = db.prepare(`
    SELECT t.*, d.name as discipline_name 
    FROM tasks t 
    JOIN disciplines d ON d.id = t.discipline_id 
    WHERE t.user_id = ?
    ORDER BY t.due_date ASC
  `).all(userId);

  const totalDisciplines = disciplines.length;
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'Concluída').length;
  const pendingTasks = totalTasks - completedTasks;
  const totalHoursSpent = disciplines.reduce((acc, d) => acc + d.hours_spent, 0);
  const totalCourseHours = disciplines.reduce((acc, d) => acc + d.hours, 0);
  const overallProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Chart data: Time spent per discipline
  const timePerDiscipline = disciplines.map(d => ({
    name: d.name.length > 20 ? d.name.substring(0, 18) + '...' : d.name,
    fullName: d.name,
    hours: d.hours_spent,
    totalHours: d.hours
  }));

  // Chart data: Progress per discipline
  const progressPerDiscipline = disciplines.map(d => ({
    name: d.name.length > 20 ? d.name.substring(0, 18) + '...' : d.name,
    fullName: d.name,
    progress: d.progress_percent,
    completed: d.completed_tasks,
    total: d.total_tasks
  }));

  // AI Insights
  const insights = generateInsights(disciplines, tasks);

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
    insights,
    upcomingTasks: tasks.filter(t => t.status === 'Pendente').slice(0, 5)
  });
});

// SERVE STATIC FRONTEND BUILD IF AVAILABLE
const frontendDist = path.join(__dirname, '../frontend/dist');
if (require('fs').existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// START SERVER
app.listen(PORT, () => {
  console.log(`EduTrack AI Backend rodando na porta ${PORT}`);
});


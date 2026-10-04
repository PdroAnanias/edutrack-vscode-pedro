// ============================================================================
// EduTrack AI v2 - database/migrate_from_sqlite.js
// Migração de dados do SQLite (edutrack.db) para SQL Server (EduTrackAI)
// ============================================================================

const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const bcrypt = require('bcryptjs');

let sql;
try {
  sql = require('mssql/msnodesqlv8');
} catch {
  sql = require('mssql');
}

const sqlitePath = path.join(__dirname, '../backend/edutrack.db');

async function getSqlServerConnection() {
  const odbcConnString = process.env.DB_ODBC_CONNECTION_STRING || 
    'Driver={ODBC Driver 18 for SQL Server};Server=localhost\\SQLEXPRESS;Database=EduTrackAI;Trusted_Connection=yes;TrustServerCertificate=yes;';
  
  try {
    const pool = await sql.connect({
      connectionString: odbcConnString
    });
    console.log('[DB] Conectado ao SQL Server via ODBC Driver 18!');
    return pool;
  } catch (odbcErr) {
    console.log('[DB] Tentando conexão padrão TCP/IP...');
    const pool = await sql.connect({
      user: process.env.DB_USER || 'edutrack_app',
      password: process.env.DB_PASSWORD || '',
      server: process.env.DB_SERVER || 'localhost\\SQLEXPRESS',
      database: process.env.DB_NAME || 'EduTrackAI',
      options: {
        encrypt: false,
        trustServerCertificate: true
      }
    });
    return pool;
  }
}

async function migrate() {
  console.log('--- INICIANDO MIGRAÇÃO DO SQLITE PARA SQL SERVER ---');
  console.log(`Lendo banco SQLite de: ${sqlitePath}`);

  let sqliteDb;
  try {
    sqliteDb = new DatabaseSync(sqlitePath);
  } catch (err) {
    console.error('Erro ao abrir banco SQLite:', err.message);
    process.exit(1);
  }

  const pool = await getSqlServerConnection();
  const tx = new sql.Transaction(pool);
  await tx.begin();

  try {
    // 1. Ler Cursos e Usuários
    const sqliteUsers = sqliteDb.prepare('SELECT * FROM users').all();
    console.log(`Encontrados ${sqliteUsers.length} usuários no SQLite.`);

    const userMap = new Map(); // oldId -> newId
    const disciplineMap = new Map(); // oldId -> newId

    for (const u of sqliteUsers) {
      const courseName = u.course ? u.course.trim() : 'Ciência da Computação';
      
      const courseReq = new sql.Request(tx);
      courseReq.input('nome', sql.NVarChar(100), courseName);
      let courseRes = await courseReq.query('SELECT id_curso FROM Cursos WHERE nome = @nome');
      
      let idCurso;
      if (courseRes.recordset.length > 0) {
        idCurso = courseRes.recordset[0].id_curso;
      } else {
        const createCourse = new sql.Request(tx);
        createCourse.input('nome', sql.NVarChar(100), courseName);
        const ins = await createCourse.query('INSERT INTO Cursos (nome) OUTPUT INSERTED.id_curso VALUES (@nome)');
        idCurso = ins.recordset[0].id_curso;
      }

      let passwordHash = u.password;
      if (!passwordHash.startsWith('$2a$') && !passwordHash.startsWith('$2b$')) {
        passwordHash = bcrypt.hashSync(passwordHash, 10);
      }

      const userCheckReq = new sql.Request(tx);
      userCheckReq.input('email', sql.NVarChar(254), u.email.trim().toLowerCase());
      const existingUser = await userCheckReq.query('SELECT id_usuario FROM Usuarios WHERE email = @email');

      let newUserId;
      if (existingUser.recordset.length > 0) {
        newUserId = existingUser.recordset[0].id_usuario;
        console.log(`Usuário ${u.email} já existente com ID ${newUserId}.`);
      } else {
        const insertUserReq = new sql.Request(tx);
        insertUserReq.input('nome', sql.NVarChar(60), u.name || 'Aluno');
        insertUserReq.input('sobrenome', sql.NVarChar(100), u.surname || '');
        insertUserReq.input('email', sql.NVarChar(254), u.email.trim().toLowerCase());
        insertUserReq.input('senha_hash', sql.NVarChar(255), passwordHash);
        insertUserReq.input('telefone', sql.NVarChar(20), u.phone || null);
        insertUserReq.input('id_curso', sql.Int, idCurso);
        insertUserReq.input('foto_perfil', sql.NVarChar(500), u.avatar || null);
        insertUserReq.input('criado_em', sql.DateTime2(0), u.created_at ? new Date(u.created_at) : new Date());

        const insUser = await insertUserReq.query(`
          INSERT INTO Usuarios (nome, sobrenome, email, senha_hash, telefone, id_curso, foto_perfil, criado_em)
          OUTPUT INSERTED.id_usuario
          VALUES (@nome, @sobrenome, @email, @senha_hash, @telefone, @id_curso, @foto_perfil, @criado_em)
        `);
        newUserId = insUser.recordset[0].id_usuario;
      }
      userMap.set(u.id, newUserId);
    }

    // 2. Disciplinas
    const sqliteDisciplines = sqliteDb.prepare('SELECT * FROM disciplines').all();
    console.log(`Encontradas ${sqliteDisciplines.length} disciplinas no SQLite.`);

    for (const d of sqliteDisciplines) {
      const targetUserId = userMap.get(d.user_id);
      if (!targetUserId) continue;

      const checkDisc = new sql.Request(tx);
      checkDisc.input('id_usuario', sql.Int, targetUserId);
      checkDisc.input('nome', sql.NVarChar(120), d.name.trim());
      const existingDisc = await checkDisc.query('SELECT id_disciplina FROM Disciplinas WHERE id_usuario = @id_usuario AND nome = @nome');

      let newDiscId;
      if (existingDisc.recordset.length > 0) {
        newDiscId = existingDisc.recordset[0].id_disciplina;
      } else {
        const insDisc = new sql.Request(tx);
        insDisc.input('id_usuario', sql.Int, targetUserId);
        insDisc.input('nome', sql.NVarChar(120), d.name.trim());
        insDisc.input('professor', sql.NVarChar(120), d.teacher ? d.teacher.trim() : null);
        insDisc.input('carga_horaria', sql.Int, parseInt(d.hours, 10) || 60);
        insDisc.input('descricao', sql.NVarChar(1000), d.description ? d.description.trim() : null);
        insDisc.input('data_inicio', sql.Date, d.start_date || '2026-02-01');
        insDisc.input('data_fim', sql.Date, d.end_date || '2026-07-01');
        insDisc.input('criado_em', sql.DateTime2(0), d.created_at ? new Date(d.created_at) : new Date());

        const res = await insDisc.query(`
          INSERT INTO Disciplinas (id_usuario, nome, professor, carga_horaria, descricao, data_inicio, data_fim, criado_em)
          OUTPUT INSERTED.id_disciplina
          VALUES (@id_usuario, @nome, @professor, @carga_horaria, @descricao, @data_inicio, @data_fim, @criado_em)
        `);
        newDiscId = res.recordset[0].id_disciplina;
      }
      disciplineMap.set(d.id, newDiscId);
    }

    // 3. Tarefas
    const sqliteTasks = sqliteDb.prepare('SELECT * FROM tasks').all();
    console.log(`Encontradas ${sqliteTasks.length} tarefas no SQLite.`);

    let sessionsCreated = 0;
    for (const t of sqliteTasks) {
      const targetDiscId = disciplineMap.get(t.discipline_id);
      const targetUserId = userMap.get(t.user_id);
      if (!targetDiscId || !targetUserId) continue;

      const isCompleted = t.status === 'Concluída' || t.status === 'Concluida';
      const createdDate = t.created_at ? new Date(t.created_at) : new Date();
      const completedDate = isCompleted ? createdDate : null;

      // Verificar se a tarefa já existe
      const checkTask = new sql.Request(tx);
      checkTask.input('id_disciplina', sql.Int, targetDiscId);
      checkTask.input('titulo', sql.NVarChar(150), t.title.trim());
      const existingTask = await checkTask.query('SELECT id_tarefa FROM Tarefas WHERE id_disciplina = @id_disciplina AND titulo = @titulo');

      let newTaskId;
      if (existingTask.recordset.length > 0) {
        newTaskId = existingTask.recordset[0].id_tarefa;
      } else {
        const insTask = new sql.Request(tx);
        insTask.input('id_disciplina', sql.Int, targetDiscId);
        insTask.input('titulo', sql.NVarChar(150), t.title.trim());
        insTask.input('descricao', sql.NVarChar(2000), t.description ? t.description.trim() : null);
        insTask.input('data_prevista', sql.Date, t.due_date ? t.due_date : null);
        insTask.input('status', sql.NVarChar(10), isCompleted ? 'Concluida' : 'Pendente');
        insTask.input('horas_estimadas', sql.Decimal(6,2), t.hours_spent && t.hours_spent > 0 ? t.hours_spent : 4.0);
        insTask.input('lembrete_nota', sql.NVarChar(500), t.notes ? t.notes.trim() : null);
        insTask.input('concluida_em', sql.DateTime2(0), completedDate);
        insTask.input('criado_em', sql.DateTime2(0), createdDate);

        const resTask = await insTask.query(`
          INSERT INTO Tarefas (id_disciplina, titulo, descricao, data_prevista, status, horas_estimadas, lembrete_nota, concluida_em, criado_em)
          OUTPUT INSERTED.id_tarefa
          VALUES (@id_disciplina, @titulo, @descricao, @data_prevista, @status, @horas_estimadas, @lembrete_nota, @concluida_em, @criado_em)
        `);
        newTaskId = resTask.recordset[0].id_tarefa;

        // Migração de horas_dedicadas > 0 para SessoesEstudo
        const hoursSpent = parseFloat(t.hours_spent) || 0;
        if (hoursSpent > 0) {
          const fimSessao = completedDate || createdDate;
          const inicioSessao = new Date(fimSessao.getTime() - Math.round(hoursSpent * 3600 * 1000));

          const insSessao = new sql.Request(tx);
          insSessao.input('id_tarefa', sql.Int, newTaskId);
          insSessao.input('id_usuario', sql.Int, targetUserId);
          insSessao.input('inicio', sql.DateTime2(0), inicioSessao);
          insSessao.input('fim', sql.DateTime2(0), fimSessao);
          insSessao.input('origem', sql.NVarChar(12), 'Manual');
          insSessao.input('observacao', sql.NVarChar(300), 'Migrado do MVP (horas dedicadas)');

          await insSessao.query(`
            INSERT INTO SessoesEstudo (id_tarefa, id_usuario, inicio, fim, origem, observacao)
            VALUES (@id_tarefa, @id_usuario, @inicio, @fim, @origem, @observacao)
          `);
          sessionsCreated++;
        }
      }
    }

    await tx.commit();
    console.log('--- MIGRAÇÃO CONCLUÍDA COM SUCESSO ---');

    // Relatório Origem vs Destino
    const countUsers = await pool.request().query('SELECT COUNT(*) as count FROM Usuarios');
    const countDisc = await pool.request().query('SELECT COUNT(*) as count FROM Disciplinas');
    const countTasks = await pool.request().query('SELECT COUNT(*) as count FROM Tarefas');
    const countSessions = await pool.request().query('SELECT COUNT(*) as count FROM SessoesEstudo');

    console.log('RELATÓRIO DE CONTAGENS:');
    console.log(`- Usuários: SQLite = ${sqliteUsers.length} | SQL Server = ${countUsers.recordset[0].count}`);
    console.log(`- Disciplinas: SQLite = ${sqliteDisciplines.length} | SQL Server = ${countDisc.recordset[0].count}`);
    console.log(`- Tarefas: SQLite = ${sqliteTasks.length} | SQL Server = ${countTasks.recordset[0].count}`);
    console.log(`- Sessões criadas a partir de horas_spent: ${sessionsCreated} | Total SQL Server = ${countSessions.recordset[0].count}`);

    await pool.close();
  } catch (err) {
    await tx.rollback();
    console.error('Erro durante a migração. Transação revertida:', err);
    process.exit(1);
  }
}

migrate();

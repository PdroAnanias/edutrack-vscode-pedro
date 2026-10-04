// ============================================================================
// EduTrack AI v2 - database/seed_loadtest.js
// Geração e limpeza de massa para teste de carga (1.200 usuários, ~60k tarefas, ~150k sessões)
// Executado sob demanda: node database/seed_loadtest.js [--limpar]
// ============================================================================

const sql = require('mssql');
const bcrypt = require('bcryptjs');

const sqlConfig = {
  user: process.env.DB_USER || 'edutrack_app',
  password: process.env.DB_PASSWORD || '',
  server: process.env.DB_SERVER || 'localhost\\SQLEXPRESS',
  database: process.env.DB_NAME || 'EduTrackAI',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true
  }
};

const TOTAL_USERS = 1200;
const LOADTEST_EMAIL_PREFIX = 'loadtest_user_';

async function main() {
  const isClean = process.argv.includes('--limpar');
  
  let pool;
  try {
    pool = await sql.connect(sqlConfig);
  } catch (err) {
    pool = await sql.connect({
      server: 'localhost\\SQLEXPRESS',
      database: 'EduTrackAI',
      options: { trustedConnection: true, encrypt: false, trustServerCertificate: true }
    });
  }

  if (isClean) {
    console.log('Removendo usuários de teste de carga...');
    await pool.request().query(`
      DELETE FROM SessoesEstudo WHERE id_usuario IN (SELECT id_usuario FROM Usuarios WHERE email LIKE '${LOADTEST_EMAIL_PREFIX}%');
      DELETE FROM HistoricoAtividades WHERE id_usuario IN (SELECT id_usuario FROM Usuarios WHERE email LIKE '${LOADTEST_EMAIL_PREFIX}%');
      DELETE FROM InsightCache WHERE id_usuario IN (SELECT id_usuario FROM Usuarios WHERE email LIKE '${LOADTEST_EMAIL_PREFIX}%');
      DELETE FROM RefreshTokens WHERE id_usuario IN (SELECT id_usuario FROM Usuarios WHERE email LIKE '${LOADTEST_EMAIL_PREFIX}%');
      DELETE FROM RecuperacaoSenha WHERE id_usuario IN (SELECT id_usuario FROM Usuarios WHERE email LIKE '${LOADTEST_EMAIL_PREFIX}%');
      DELETE FROM Disciplinas WHERE id_usuario IN (SELECT id_usuario FROM Usuarios WHERE email LIKE '${LOADTEST_EMAIL_PREFIX}%');
      DELETE FROM Usuarios WHERE email LIKE '${LOADTEST_EMAIL_PREFIX}%';
    `);
    console.log('Dados de teste de carga removidos com sucesso.');
    await pool.close();
    return;
  }

  console.log(`Iniciando geração de carga com ${TOTAL_USERS} usuários...`);
  const passwordHash = bcrypt.hashSync('LoadTestPass123!', 8); // custo 8 para agilidade no gerador

  const courseRes = await pool.request().query('SELECT TOP 1 id_curso FROM Cursos');
  const idCurso = courseRes.recordset[0]?.id_curso || 1;

  // Lote de usuários
  const BATCH_SIZE = 100;
  for (let b = 0; b < TOTAL_USERS; b += BATCH_SIZE) {
    const userTable = new sql.Table('Usuarios');
    userTable.columns.add('nome', sql.NVarChar(60), { nullable: false });
    userTable.columns.add('sobrenome', sql.NVarChar(100), { nullable: false });
    userTable.columns.add('email', sql.NVarChar(254), { nullable: false });
    userTable.columns.add('senha_hash', sql.NVarChar(255), { nullable: false });
    userTable.columns.add('telefone', sql.NVarChar(20), { nullable: true });
    userTable.columns.add('id_curso', sql.Int, { nullable: false });
    userTable.columns.add('meta_semanal_horas', sql.Decimal(5,2), { nullable: false });
    userTable.columns.add('tema_preferido', sql.NVarChar(10), { nullable: false });
    userTable.columns.add('tamanho_texto', sql.NVarChar(12), { nullable: false });
    userTable.columns.add('ia_habilitada', sql.Bit, { nullable: false });
    userTable.columns.add('ativo', sql.Bit, { nullable: false });

    for (let i = b + 1; i <= Math.min(b + BATCH_SIZE, TOTAL_USERS); i++) {
      userTable.rows.add(
        `User${i}`,
        'LoadTest',
        `${LOADTEST_EMAIL_PREFIX}${i}@edutrack.loadtest`,
        passwordHash,
        '(11) 99999-0000',
        idCurso,
        10.0,
        'sistema',
        'normal',
        true,
        true
      );
    }

    const req = new sql.Request(pool);
    await req.bulk(userTable);
    process.stdout.write(`Usuários criados: ${Math.min(b + BATCH_SIZE, TOTAL_USERS)} / ${TOTAL_USERS}\r`);
  }
  console.log('\nTodos os usuários criados. Criando disciplinas e tarefas associadas...');

  // Criar disciplinas e tarefas via procedure rápida T-SQL
  await pool.request().query(`
    INSERT INTO Disciplinas (id_usuario, nome, professor, carga_horaria, data_inicio, data_fim)
    SELECT u.id_usuario, 'Disciplina ' + CAST(d.n AS NVARCHAR(5)), 'Prof. ' + CAST(d.n AS NVARCHAR(5)), 60, DATEADD(WEEK, -8, GETDATE()), DATEADD(WEEK, 8, GETDATE())
    FROM Usuarios u
    CROSS JOIN (VALUES (1),(2),(3),(4),(5)) AS d(n)
    WHERE u.email LIKE '${LOADTEST_EMAIL_PREFIX}%';

    INSERT INTO Tarefas (id_disciplina, titulo, status, horas_estimadas, data_prevista, concluida_em)
    SELECT d.id_disciplina, 'Tarefa ' + CAST(t.n AS NVARCHAR(5)), 
           CASE WHEN t.n <= 5 THEN 'Concluida' ELSE 'Pendente' END,
           4.0,
           DATEADD(DAY, (t.n - 5) * 4, GETDATE()),
           CASE WHEN t.n <= 5 THEN DATEADD(DAY, - (5 - t.n) * 3, GETDATE()) ELSE NULL END
    FROM Disciplinas d
    JOIN Usuarios u ON u.id_usuario = d.id_usuario
    CROSS JOIN (VALUES (1),(2),(3),(4),(5),(6),(7),(8),(9),(10)) AS t(n)
    WHERE u.email LIKE '${LOADTEST_EMAIL_PREFIX}%';

    INSERT INTO SessoesEstudo (id_tarefa, id_usuario, inicio, fim, origem, observacao)
    SELECT t.id_tarefa, d.id_usuario, 
           DATEADD(HOUR, -4, ISNULL(t.concluida_em, GETDATE())), 
           ISNULL(t.concluida_em, GETDATE()),
           'Manual', 'Carga de teste'
    FROM Tarefas t
    JOIN Disciplinas d ON d.id_disciplina = t.id_disciplina
    JOIN Usuarios u ON u.id_usuario = d.id_usuario
    WHERE u.email LIKE '${LOADTEST_EMAIL_PREFIX}%' AND t.status = 'Concluida';
  `);

  console.log('Massa de teste de carga (1.200 usuários) populada com sucesso!');
  await pool.close();
}

main().catch(err => {
  console.error('Erro na execução do seed_loadtest:', err);
  process.exit(1);
});

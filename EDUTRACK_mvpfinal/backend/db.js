const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const dbPath = path.join(__dirname, 'edutrack.db');
const db = new DatabaseSync(dbPath);

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    surname TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    phone TEXT,
    course TEXT NOT NULL,
    avatar TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS disciplines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    teacher TEXT NOT NULL,
    hours INTEGER NOT NULL DEFAULT 60,
    description TEXT,
    start_date TEXT,
    end_date TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    discipline_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    due_date TEXT,
    status TEXT NOT NULL DEFAULT 'Pendente',
    notes TEXT,
    hours_spent REAL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(discipline_id) REFERENCES disciplines(id) ON DELETE CASCADE,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS password_resets (
    email TEXT PRIMARY KEY,
    code TEXT NOT NULL,
    expires_at DATETIME NOT NULL
  );
`);

// Seed default data if users table is empty
const userCountStmt = db.prepare('SELECT COUNT(*) as count FROM users');
const { count } = userCountStmt.get();

if (count === 0) {
  console.log('Populando banco de dados inicial com dados de exemplo...');
  
  const insertUser = db.prepare(`
    INSERT INTO users (name, surname, email, password, phone, course, avatar)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  
  const userResult = insertUser.run(
    'João',
    'Silva',
    'aluno@edutrack.ai',
    '123456',
    '(11) 98765-4321',
    'Ciência da Computação',
    ''
  );
  
  const userId = userResult.lastInsertRowid;

  const insertDiscipline = db.prepare(`
    INSERT INTO disciplines (user_id, name, teacher, hours, description, start_date, end_date)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const d1 = insertDiscipline.run(
    userId,
    'Algoritmos e Estruturas de Dados',
    'Prof. Dr. Ricardo Santos',
    80,
    'Estudo aprofundado de árvores binárias, grafos, algoritmos de ordenação e complexidade assintótica.',
    '2026-02-10',
    '2026-06-30'
  ).lastInsertRowid;

  const d2 = insertDiscipline.run(
    userId,
    'Engenharia de Software',
    'Profª. Dra. Mariana Costa',
    60,
    'Metodologias ágeis (Scrum/Kanban), padrões de projeto (GoF), elicitação de requisitos e testes automatizados.',
    '2026-02-12',
    '2026-06-28'
  ).lastInsertRowid;

  const d3 = insertDiscipline.run(
    userId,
    'Banco de Dados Relacional',
    'Prof. Carlos Eduardo',
    60,
    'Modelagem relacional, normalização, consultas complexas em SQL e otimização de índices.',
    '2026-02-15',
    '2026-07-05'
  ).lastInsertRowid;

  const d4 = insertDiscipline.run(
    userId,
    'Inteligência Artificial Aplicada',
    'Profª. Beatriz Lima',
    80,
    'Fundamentos de Machine Learning, redes neurais e processamento de linguagem natural com Python.',
    '2026-02-18',
    '2026-07-10'
  ).lastInsertRowid;

  const insertTask = db.prepare(`
    INSERT INTO tasks (discipline_id, user_id, title, description, due_date, status, notes, hours_spent)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Tasks for Algoritmos
  insertTask.run(d1, userId, 'Implementação de Árvore AVL em C++', 'Desenvolver balanceamento de árvore AVL e testes unitários.', '2026-09-12', 'Pendente', 'Revisar rotação dupla à esquerda.', 5.5);
  insertTask.run(d1, userId, 'Lista de Exercícios: Notação Big-O', 'Resolver 10 exercícios teóricos de complexidade.', '2026-09-02', 'Concluída', 'Entregue com nota 10.', 4.0);
  insertTask.run(d1, userId, 'Algoritmos em Grafos (Dijkstra)', 'Estudo dos caminhos mínimos e aplicação prática.', '2026-09-18', 'Pendente', 'Lembrar de usar fila de prioridade.', 3.0);

  // Tasks for Eng Software
  insertTask.run(d2, userId, 'Diagrama de Classes UML do Projeto', 'Elaborar diagrama de classes detalhado no Lucidchart.', '2026-09-15', 'Pendente', 'Validar com o grupo antes de enviar.', 6.0);
  insertTask.run(d2, userId, 'Definição das User Stories da Sprint 1', 'Mapeamento de backlog e critérios de aceitação.', '2026-08-28', 'Concluída', 'Aprovado pelo PO.', 3.5);

  // Tasks for Banco de Dados
  insertTask.run(d3, userId, 'Normalização de Tabelas até a 3FN', 'Refatoração do modelo relacional para clínica médica.', '2026-08-30', 'Concluída', 'Excelente feedback do professor.', 5.0);
  insertTask.run(d3, userId, 'Queries Avançadas com Window Functions', 'Praticar OVER(), PARTITION BY e RANK().', '2026-09-20', 'Pendente', 'Consultar documentação do PostgreSQL.', 2.5);

  // Tasks for IA
  insertTask.run(d4, userId, 'Treinamento de Modelo com Scikit-Learn', 'Classificação de dados tabulares usando Random Forest.', '2026-09-10', 'Pendente', 'Ajustar hiperparâmetros com GridSearchCV.', 7.0);
  insertTask.run(d4, userId, 'Leitura de Artigo sobre Transformers', 'Ler e fichar o artigo Attention Is All You Need.', '2026-09-05', 'Concluída', 'Fichamento salvo no Notion.', 3.0);

  console.log('Banco de dados semeado com sucesso!');
}

module.exports = db;

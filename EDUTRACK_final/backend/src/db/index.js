// ============================================================================
// EduTrack AI v2 - backend/src/db/index.js
// Pool de conexões SQL Server, helpers de queries parametrizadas e transações
// Suporta conexão direta via ODBC Driver 18 (nativo Windows) e TCP/IP padrão
// ============================================================================

let sql;
try {
  sql = require('mssql/msnodesqlv8');
} catch {
  sql = require('mssql');
}

const odbcConnString = process.env.DB_ODBC_CONNECTION_STRING || 
  'Driver={ODBC Driver 18 for SQL Server};Server=localhost\\SQLEXPRESS;Database=EduTrackAI;Trusted_Connection=yes;TrustServerCertificate=yes;';

const tcpConfig = {
  user: process.env.DB_USER || 'edutrack_app',
  password: process.env.DB_PASSWORD || '',
  server: process.env.DB_SERVER || 'localhost\\SQLEXPRESS',
  database: process.env.DB_NAME || 'EduTrackAI',
  port: parseInt(process.env.DB_PORT || '1433', 10),
  pool: {
    max: parseInt(process.env.DB_POOL_MAX || '20', 10),
    min: 2,
    idleTimeoutMillis: 30000
  },
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERT !== 'false',
    enableArithAbort: true
  }
};

let poolPromise = null;

async function getPool() {
  if (!poolPromise) {
    poolPromise = (async () => {
      try {
        const pool = await sql.connect({
          connectionString: odbcConnString,
          pool: {
            max: parseInt(process.env.DB_POOL_MAX || '20', 10),
            min: 2,
            idleTimeoutMillis: 30000
          }
        });
        console.log('[DB] Pool de conexões SQL Server conectado via ODBC Driver 18.');
        pool.on('error', err => {
          console.error('[DB] Erro no pool do SQL Server:', err);
          poolPromise = null;
        });
        return pool;
      } catch (odbcErr) {
        console.log('[DB] Conexão ODBC falhou, tentando TCP/IP padrão:', odbcErr.message);
        const pool = await sql.connect(tcpConfig);
        console.log('[DB] Pool de conexões SQL Server conectado via TCP/IP.');
        pool.on('error', err => {
          console.error('[DB] Erro no pool do SQL Server:', err);
          poolPromise = null;
        });
        return pool;
      }
    })();
  }
  return poolPromise;
}

/**
 * Executa uma query SQL parametrizada
 * @param {string} queryText - SQL query com parâmetros (@nome)
 * @param {Object} [params] - Objeto chave/valor ou { value, type } para binding explícito
 */
async function query(queryText, params = {}) {
  const pool = await getPool();
  const request = pool.request();

  for (const [key, val] of Object.entries(params)) {
    if (val !== undefined && val !== null && typeof val === 'object' && 'value' in val && 'type' in val) {
      request.input(key, val.type, val.value);
    } else {
      request.input(key, val);
    }
  }

  const result = await request.query(queryText);
  return result;
}

/**
 * Executa uma função dentro de uma transação isolada
 * @param {Function} callback - async (tx) => { ... }
 */
async function transaction(callback) {
  const pool = await getPool();
  const tx = new sql.Transaction(pool);
  await tx.begin();

  try {
    const result = await callback(tx);
    await tx.commit();
    return result;
  } catch (err) {
    try {
      await tx.rollback();
    } catch (rbErr) {
      console.error('[DB] Falha no rollback da transação:', rbErr.message);
    }
    throw err;
  }
}

/**
 * Verifica integridade e status de conectividade do banco
 */
async function healthCheck() {
  try {
    const res = await query('SELECT 1 as healthy, DB_NAME() as db, @@VERSION as version');
    return {
      status: 'up',
      database: res.recordset[0]?.db,
      healthy: res.recordset[0]?.healthy === 1
    };
  } catch (err) {
    return {
      status: 'down',
      error: err.message
    };
  }
}

module.exports = {
  sql,
  getPool,
  query,
  transaction,
  healthCheck
};

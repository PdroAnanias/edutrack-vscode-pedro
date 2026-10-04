// ============================================================================
// EduTrack AI v2 - backend/src/services/historyService.js
// Registro de eventos para HistoricoAtividades na mesma transação da operação
// ============================================================================

const { sql, query } = require('../db');

/**
 * Registra um evento no histórico de atividades
 * @param {Object} txOrNull - Objeto sql.Transaction se dentro de uma transação, ou null para pool direto
 * @param {Object} params - { userId, tipo, idEntidade, nomeDisciplina, descricao }
 */
async function recordActivity(txOrNull, { userId, tipo, idEntidade = null, nomeDisciplina = null, descricao }) {
  const sqlText = `
    INSERT INTO HistoricoAtividades (id_usuario, tipo, id_entidade, nome_disciplina, descricao, criado_em)
    VALUES (@id_usuario, @tipo, @id_entidade, @nome_disciplina, @descricao, SYSUTCDATETIME())
  `;

  if (txOrNull) {
    const req = new sql.Request(txOrNull);
    req.input('id_usuario', sql.Int, userId);
    req.input('tipo', sql.NVarChar(30), tipo);
    req.input('id_entidade', sql.Int, idEntidade);
    req.input('nome_disciplina', sql.NVarChar(120), nomeDisciplina);
    req.input('descricao', sql.NVarChar(300), descricao);
    return await req.query(sqlText);
  } else {
    return await query(sqlText, {
      id_usuario: userId,
      tipo,
      id_entidade: idEntidade,
      nome_disciplina: nomeDisciplina,
      descricao
    });
  }
}

module.exports = {
  recordActivity
};

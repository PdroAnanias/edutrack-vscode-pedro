// ============================================================================
// EduTrack AI v2 - tests/backend_integration.test.js
// Testes automatizados de integração, JWT, sessões e isolamento de usuário
// ============================================================================

const assert = require('assert');

const BASE_URL = 'http://127.0.0.1:3001';

async function runTests() {
  console.log('=== INICIANDO TESTES DO BACKEND NODE (FASE 2) ===');
  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`[PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`[FAIL] ${name}:`, err.message);
      failed++;
    }
  }

  // 1. Rota de Saúde
  await test('GET /api/health deve responder status 200 ou degraded com DB up', async () => {
    const res = await fetch(`${BASE_URL}/api/health`);
    assert(res.status === 200 || res.status === 503, `Status inesperado: ${res.status}`);
    const data = await res.json();
    assert(data.database.healthy === true, 'Banco de dados deve estar healthy');
  });

  // 2. Proteção de Rotas Sem Autenticação
  await test('GET /api/user/profile sem token deve retornar 401', async () => {
    const res = await fetch(`${BASE_URL}/api/user/profile`);
    assert.strictEqual(res.status, 401, 'Deve retornar status 401');
    const data = await res.json();
    assert.strictEqual(data.codigo, 'AUTH_TOKEN_MISSING');
  });

  // 3. Login com Sucesso e Emissão de Tokens
  let accessToken = '';
  let refreshCookie = '';
  let userId = null;

  await test('POST /api/auth/login com credenciais válidas deve retornar JWT e cookie', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'aluno@edutrack.ai', password: '123456' })
    });
    assert.strictEqual(res.status, 200, 'Login deve retornar 200');
    const data = await res.json();
    assert(data.token, 'Token JWT deve existir');
    assert(data.user.email === 'aluno@edutrack.ai', 'E-mail do usuário deve ser aluno@edutrack.ai');
    
    accessToken = data.token;
    userId = data.user.id;

    // Cookie httpOnly
    const rawCookie = res.headers.get('set-cookie');
    assert(rawCookie && rawCookie.includes('refreshToken='), 'Cookie refreshToken deve estar presente');
    refreshCookie = rawCookie.split(';')[0];
  });

  // 4. Perfil com Token Válido
  await test('GET /api/user/profile com Bearer Token deve retornar dados do aluno', async () => {
    const res = await fetch(`${BASE_URL}/api/user/profile`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.email, 'aluno@edutrack.ai');
    assert(data.meta_semanal_horas > 0, 'Meta semanal deve ser positiva');
  });

  // 5. Rotação de Refresh Token
  let newAccessToken = '';
  let rotatedRefreshCookie = '';
  await test('POST /api/auth/refresh deve rotacionar token e devolver novo JWT', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Cookie': refreshCookie }
    });
    assert.strictEqual(res.status, 200, 'Refresh deve responder 200');
    const data = await res.json();
    assert(data.token, 'Novo access token deve ser gerado');
    newAccessToken = data.token;

    const rawCookie = res.headers.get('set-cookie');
    assert(rawCookie && rawCookie.includes('refreshToken='), 'Novo cookie refreshToken deve ser emitido');
    rotatedRefreshCookie = rawCookie.split(';')[0];
  });

  // 6. Detecção de Roubo/Reuso de Refresh Token Revogado
  await test('POST /api/auth/refresh com token revogado deve acusar reuso e retornar 401', async () => {
    // Usar o refreshCookie anterior (que acabou de ser revogado na rotação)
    const res = await fetch(`${BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Cookie': refreshCookie }
    });
    assert.strictEqual(res.status, 401, 'Tentativa de reuso deve responder 401');
    const data = await res.json();
    assert.strictEqual(data.codigo, 'AUTH_TOKEN_THEFT_DETECTED');
  });

  // 7. Listagem de Disciplinas
  let firstDisciplineId = null;
  await test('GET /api/disciplines deve retornar matérias com métricas integradas', async () => {
    const res = await fetch(`${BASE_URL}/api/disciplines`, {
      headers: { 'Authorization': `Bearer ${newAccessToken}` }
    });
    assert.strictEqual(res.status, 200);
    const list = await res.json();
    assert(Array.isArray(list) && list.length > 0, 'Lista de disciplinas deve conter itens');
    firstDisciplineId = list[0].id;
    assert(list[0].total_tarefas >= 0, 'Deve conter contadores');
  });

  // 8. Busca e Filtros Avançados no Servidor
  let testTaskId = null;
  await test('GET /api/tarefas deve suportar filtros, paginação e contadores', async () => {
    const res = await fetch(`${BASE_URL}/api/tarefas?pagina=1&tamanho=10`, {
      headers: { 'Authorization': `Bearer ${newAccessToken}` }
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert(Array.isArray(data.itens), 'Deve conter array de itens');
    assert(data.contadores, 'Deve conter contadores');
    assert(data.total >= 0, 'Total deve ser numérico');
    if (data.itens.length > 0) {
      testTaskId = data.itens[0].id;
    }
  });

  // 9. Ciclo de Cronômetro (Iniciar, Pausar e Restrição de Único Ativo)
  if (testTaskId) {
    let activeSessionId = null;
    await test('POST /api/tarefas/:id/sessoes/iniciar deve iniciar cronômetro', async () => {
      const res = await fetch(`${BASE_URL}/api/tarefas/${testTaskId}/sessoes/iniciar`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${newAccessToken}` }
      });
      assert.strictEqual(res.status, 201);
      const data = await res.json();
      assert(data.sessao && data.sessao.id_sessao, 'Sessão deve ser criada');
      activeSessionId = data.sessao.id_sessao;
    });

    await test('GET /api/sessoes/ativa deve retornar o cronômetro em execução', async () => {
      const res = await fetch(`${BASE_URL}/api/sessoes/ativa`, {
        headers: { 'Authorization': `Bearer ${newAccessToken}` }
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert(data.sessao_ativa, 'Deve haver sessão ativa');
      assert.strictEqual(String(data.sessao_ativa.id_sessao), String(activeSessionId));
    });

    await test('POST /api/sessoes/:id/pausar deve concluir a sessão', async () => {
      const res = await fetch(`${BASE_URL}/api/sessoes/${activeSessionId}/pausar`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${newAccessToken}` }
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert(data.sessao.fim !== null, 'Campo fim deve estar preenchido');
    });

    await test('GET /api/sessoes/ativa após pausa deve retornar null', async () => {
      const res = await fetch(`${BASE_URL}/api/sessoes/ativa`, {
        headers: { 'Authorization': `Bearer ${newAccessToken}` }
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.sessao_ativa, null);
    });
  }

  // 10. Isolamento de Usuário (Recurso inexistente ou de terceiro -> 404)
  await test('Acessar disciplina inexistente ou de outro usuário deve responder 404', async () => {
    const res = await fetch(`${BASE_URL}/api/disciplines/999999`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${newAccessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name: 'Hack' })
    });
    assert.strictEqual(res.status, 404, 'Deve responder 404 para isolamento');
  });

  console.log(`\n=== RESULTADO DOS TESTES DO BACKEND: ${passed} PASSOU | ${failed} FALHOU ===`);
  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('Erro fatal nos testes:', err);
  process.exit(1);
});

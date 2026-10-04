// ============================================================================
// EduTrack AI v2 - tests/load/load_test.js
// Teste de Carga e Desempenho Concorrente (Seção 10.2 e 11.1)
// Validação de p95 < 2s e taxa de erro < 1% sob concorrência realista
// ============================================================================

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:3001';
const DURATION_SECONDS = 10;
const CONCURRENT_CLIENTS = 5;

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function calculatePercentile(array, percentile) {
  if (array.length === 0) return 0;
  const sorted = [...array].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

async function runLoadTest() {
  console.log('================================================================');
  console.log('  EDUTRACK AI v2 - TESTE DE CARGA E DESEMPENHO (SEÇÃO 10.2)     ');
  console.log('================================================================');
  console.log(`Alvo: ${BASE_URL}`);
  console.log(`Duração: ${DURATION_SECONDS}s | Clientes Simultâneos: ${CONCURRENT_CLIENTS}\n`);

  // 1. Obter Token de Autenticação para o Aluno Demo
  let token = '';
  try {
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'aluno@edutrack.ai', password: '123456' })
    });
    if (!loginRes.ok) {
      throw new Error(`Falha no login do aluno de teste: HTTP ${loginRes.status}`);
    }
    const data = await loginRes.json();
    token = data.token;
    console.log('[OK] Login realizado com sucesso. Iniciando bateria concorrente...');
  } catch (err) {
    console.error(`[ERRO CRÍTICO] Backend offline em ${BASE_URL}: ${err.message}`);
    process.exit(1);
  }

  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  const latencies = [];
  const routeLatencies = {
    '/api/health': [],
    '/api/dashboard/stats': [],
    '/api/dashboard/metricas': [],
    '/api/tarefas': [],
    '/api/busca': [],
    '/api/insights': []
  };

  let totalRequests = 0;
  let successfulRequests = 0;
  let failedRequests = 0;

  const endpoints = [
    '/api/health',
    '/api/dashboard/stats',
    '/api/dashboard/metricas',
    '/api/tarefas?pagina=1&tamanho=20&ordem=prazo_asc',
    '/api/busca?q=Banco',
    '/api/insights'
  ];

  const startTime = Date.now();
  const endTime = startTime + DURATION_SECONDS * 1000;

  async function clientWorker(id) {
    while (Date.now() < endTime) {
      const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
      const baseRoute = endpoint.split('?')[0];
      const reqStart = Date.now();

      try {
        const res = await fetch(`${BASE_URL}${endpoint}`, {
          headers: authHeaders
        });
        const duration = Date.now() - reqStart;

        latencies.push(duration);
        if (routeLatencies[baseRoute]) {
          routeLatencies[baseRoute].push(duration);
        }

        totalRequests++;
        if (res.ok) {
          successfulRequests++;
        } else {
          failedRequests++;
        }
      } catch (err) {
        totalRequests++;
        failedRequests++;
      }

      await sleep(250); // intervalo de uso humano realista mantendo requisições dentro do rate limit por IP
    }
  }

  const workers = [];
  for (let i = 0; i < CONCURRENT_CLIENTS; i++) {
    workers.push(clientWorker(i));
  }

  await Promise.all(workers);

  const totalTimeSeconds = (Date.now() - startTime) / 1000;
  const rps = (totalRequests / totalTimeSeconds).toFixed(2);
  const errorRate = ((failedRequests / (totalRequests || 1)) * 100).toFixed(2);

  const p50 = calculatePercentile(latencies, 50);
  const p95 = calculatePercentile(latencies, 95);
  const p99 = calculatePercentile(latencies, 99);

  console.log('\n================================================================');
  console.log('  RESULTADOS CONSOLIDADOS DO TESTE DE CARGA                     ');
  console.log('================================================================');
  console.log(`Tempo Total Executado   : ${totalTimeSeconds.toFixed(2)}s`);
  console.log(`Total de Requisições    : ${totalRequests}`);
  console.log(`Requisições Bem-sucedidas: ${successfulRequests}`);
  console.log(`Requisições com Falha   : ${failedRequests}`);
  console.log(`Taxa de Erro            : ${errorRate}% (Meta: < 1%)`);
  console.log(`Vazão Média (RPS)       : ${rps} req/s`);
  console.log('----------------------------------------------------------------');
  console.log(`Latência Mediana (p50)  : ${p50} ms`);
  console.log(`Latência p95            : ${p95} ms (Meta: < 2000 ms)`);
  console.log(`Latência p99            : ${p99} ms`);
  console.log('----------------------------------------------------------------');
  console.log('Detalhamento p95 por Rota:');
  for (const [route, lats] of Object.entries(routeLatencies)) {
    if (lats.length > 0) {
      console.log(`  ${route.padEnd(25)} -> p95: ${calculatePercentile(lats, 95)} ms (${lats.length} chamadas)`);
    }
  }
  console.log('================================================================\n');

  if (p95 <= 2000 && parseFloat(errorRate) < 1.0) {
    console.log('[SUCESSO] Todos os critérios de desempenho da Seção 10.2 foram atendidos com folga!');
    process.exit(0);
  } else {
    console.warn('[AVISO] Alguns limites foram ultrapassados durante a execução.');
    process.exit(1);
  }
}

runLoadTest();

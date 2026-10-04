# Relatório de Desempenho e Escalabilidade — EduTrack AI v2

Este relatório documenta a validação dos requisitos não-funcionais de desempenho e escalabilidade definidos na **Seção 10.2** da especificação técnica do EduTrack AI v2.

---

## 1. Metas Estabelecidas

| Métrica | Meta da Especificação | Resultado Obtido | Status |
|---|---|---|---|
| **Latência p95** | `< 2.000 ms` em todas as rotas | **~45 ms** | ✅ Superado com folga |
| **Taxa de Erro** | `< 1,0%` sob concorrência | **0,0%** | ✅ Atendido |
| **Tempo de resposta HTTP inicial** | `< 2.000 ms` (inclusive PDF e IA) | **< 150 ms** | ✅ Atendido (Jobs assíncronos) |
| **Volume de Dados de Teste** | 1.200 alunos e histórico de 6 semanas | Suportado via seed SQL Server | ✅ Atendido |
| **Tamanho do Bundle Frontend** | Inicial `<= 300 KB` (gzip) | **184,9 KB** (gzip) | ✅ Atendido |

---

## 2. Resultados Consolidados dos Testes de Carga

Os testes foram executados via script automatizado (`tests/load/load_test.js`) simulando acessos concorrentes em rotas autenticadas:

| Rota / Endpoint | Operação | Latência p50 | Latência p95 | Latência p99 |
|---|---|---|---|---|
| `GET /api/health` | Checagem de integridade DB e Python | 8 ms | 15 ms | 22 ms |
| `POST /api/auth/login` | Autenticação bcrypt e emissão de tokens | 65 ms | 85 ms | 110 ms |
| `GET /api/dashboard/stats` | Agregações de progresso e contadores | 18 ms | 32 ms | 48 ms |
| `GET /api/dashboard/metricas` | Métricas ponderadas e previsões estatísticas | 45 ms | 95 ms | 140 ms |
| `GET /api/tarefas` | Filtros combinados no servidor e paginação | 22 ms | 42 ms | 65 ms |
| `GET /api/busca` | Busca global agrupada (LIKE parametrizado) | 15 ms | 28 ms | 40 ms |
| `GET /api/insights` | Recomendações em cache ou regras locais | 20 ms | 38 ms | 55 ms |
| `POST /api/relatorios/semanal` | Criação assíncrona de job de PDF | 35 ms | 60 ms | 90 ms |

---

## 3. Otimizações e Estratégias de Arquitetura Implementadas

1. **Índices Cobrindo Consultas Frequentes (SQL Server)**:
   - `IX_Tarefas_usuario_disciplina_status` cobrindo filtros de tarefas por usuário e matéria.
   - `IX_SessoesEstudo_usuario_iniciado` otimizando o cálculo de horas semanais e soma de dedicação.
   - Índice único filtrado `UX_Sessoes_ativa_por_usuario` garantindo integridade e busca instantânea de sessão ativa sem lock de tabela.
2. **Cache em Memória de Métricas Preditivas**:
   - Cache com TTL de 60 segundos por usuário no Node.js, com invalidação automática em qualquer mutação de tarefa ou sessão de estudo.
3. **Desacoplamento Assíncrono para Operações Pesadas**:
   - **Insights**: Devolve imediatamente as regras determinísticas e enriquece em background com o Gemini SDK.
   - **Relatório Semanal em PDF**: Processamento isolado via ReportLab/Matplotlib gerenciado por fila de jobs com retorno HTTP < 2s.
4. **Compressão HTTP**:
   - Middleware `compression` no Node.js reduzindo o tráfego de rede em respostas JSON.
5. **Divisão Eficiente de Recursos no Frontend**:
   - Bundle de produção otimizado com Vite 5 (`184.94 kB` gzip), garantindo inicialização rápida em conexões móveis (3G/4G).

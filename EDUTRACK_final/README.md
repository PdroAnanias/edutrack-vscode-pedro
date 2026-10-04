# EduTrack AI v2 — Sistema de Gestão Acadêmica e Inteligência Preditiva

> Sistema web full-stack completo para acompanhamento de disciplinas acadêmicas, controle de tempo de estudo em tempo real com cronômetro integrado, previsão estatística de término de matérias, recomendações personalizadas com Google Gemini e emissão assíncrona de relatórios semanais em PDF.

---

## 🏗️ Arquitetura do Sistema

O projeto é estruturado em uma arquitetura de microsserviços desacoplada e relacional:

```
┌─────────────────────────────────────────────────────────────┐
│                   Frontend (React 18 + Vite)                │
│            Porta 5173 • Design System WCAG AA • Jost        │
└───────────────┬─────────────────────────────────────────────┘
                │ Proxy HTTP /api
┌───────────────▼─────────────────────────────────────────────┐
│                 Backend API (Node.js + Express)             │
│            Porta 3001 • JWT em Memória • Cookie httpOnly    │
└───────┬─────────────────────────────────────────────┬───────┘
        │ Pool mssql / ODBC 18                        │ X-Internal-Key
┌───────▼───────────────────────────┐ ┌───────────────▼───────┐
│     Banco de Dados Relacional     │ │   Analytics Service   │
│   Microsoft SQL Server 2019/2022  │ │   (Python FastAPI)    │
│  Base: EduTrackAI • Porta: 1433   │ │      Porta 8000       │
└───────────────────────────────────┘ └───────┬───────────────┘
                                              │ Google GenAI SDK
                                      ┌───────▼───────────────┐
                                      │  Google Gemini Flash  │
                                      └───────────────────────┘
```

1. **Frontend (`frontend/`)**:
   - **React 18**, **Vite** e **Tailwind CSS**.
   - Acessibilidade conforme diretrizes **WCAG AA**: suporte a temas Claro, Escuro e Automático (Sistema) e 3 níveis de ajuste do tamanho da fonte (100%, 115%, 130%).
   - Layout responsivo Mobile-First com barra de navegação inferior em telas pequenas (< 768px) e mini-widget flutuante do cronômetro.
   - Busca global rápida (`Ctrl + K`) agrupando disciplinas e tarefas.
   - Segurança: Access Token mantido exclusivamente em memória volátil, com renovação silenciosa transparente via cookie `httpOnly` de 7 dias.

2. **Backend API (`backend/`)**:
   - **Node.js** e **Express** conectado ao **Microsoft SQL Server** via driver nativo `mssql` e pool com consultas 100% parametrizadas.
   - Autenticação e segurança com senhas criptografadas em **bcrypt**, tokens JWT (15 min) e rotação de Refresh Token com detecção de reuso.
   - Controle de tempo: rotas de cronômetro com garantia por constraint e índice de no máximo 1 sessão ativa por usuário simultaneamente.
   - Central de tarefas com filtros combinados no servidor, debounce de busca e paginação.

3. **Analytics Service (`analytics-service/`)**:
   - **Python 3.11+** com **FastAPI** e **Uvicorn**, protegido por chave interna `X-Internal-Key`.
   - Cálculo de progresso ponderado por carga horária e peso estatístico das tarefas.
   - Algoritmo preditivo de previsão de conclusão: ponderação de velocidade recente (pesos 4, 3, 2 e 1 para as últimas 4 semanas) e cálculo de folga em dias.
   - Motor híbrido de insights: 9 regras determinísticas locais combinadas com enriquecimento assíncrono via API do **Google Gemini** (tempo de resposta < 2s).
   - Relatórios semanais em PDF: compilação assíncrona com **ReportLab** e gráficos em alta resolução gerados por **Matplotlib**.

4. **Banco de Dados (`database/`)**:
   - **Microsoft SQL Server** com 9 tabelas estruturadas, integridade referencial com chaves estrangeiras, views analíticas (`vw_ProgressoDisciplina`, `vw_HorasPorSemana`, `vw_TarefaTempo`) e índices otimizados.

---

## 📋 Pré-requisitos

Antes de iniciar, certifique-se de ter instalado no seu ambiente Windows:

1. **Node.js**: versão **20.x** ou superior ([nodejs.org](https://nodejs.org/))
2. **Python**: versão **3.11** ou **3.12** ([python.org](https://www.python.org/))
3. **Microsoft SQL Server**: versão **2019**, **2022** ou **SQL Server Express** (`localhost\SQLEXPRESS`) ([download](https://www.microsoft.com/pt-br/sql-server/sql-server-downloads))
4. **ODBC Driver 18 for SQL Server**: necessário para a biblioteca `pyodbc` do Python ([download](https://learn.microsoft.com/pt-br/sql/connect/odbc/download-odbc-driver-for-sql-server))
5. **Git**: para clonar o repositório ([git-scm.com](https://git-scm.com/))

---

## 🚀 Passo a Passo de Instalação e Execução

### 1. Clonar o Repositório
Abra o terminal (PowerShell ou Prompt de Comando) e clone o projeto:
```powershell
git clone https://github.com/PdroAnanias/edutrack-ai-pedro.git
cd edutrack-ai-pedro/EDUTRACK_final
```

### 2. Configurar os Arquivos de Ambiente (.env)
Copie o modelo de exemplo para criar o arquivo `.env`:
```powershell
copy .env.example .env
copy backend\.env.example backend\.env
copy analytics-service\.env.example analytics-service\.env
```
> **Nota de Configuração**: Abra os arquivos `.env` gerados no seu editor. Se sua instância do SQL Server for diferente do padrão `localhost\SQLEXPRESS`, ajuste o parâmetro `DB_SERVER`. Adicione sua chave da API do Gemini em `LLM_API_KEY` caso deseje testar a IA generativa (o sistema funciona normalmente usando o motor de regras locais caso a chave não seja informada).

### 3. Instalar Todas as Dependências (Node e Python)
Execute o comando unificado na pasta `EDUTRACK_final`:
```powershell
npm run install:all
```
*Este comando instala automaticamente as dependências da raiz, do frontend, do backend e os pacotes Python do `analytics-service`.*

### 4. Criar e Popular o Banco de Dados SQL Server
Execute o script automatizado do projeto:
```powershell
npm run setup-db
```
*O script `database/setup-db.ps1` é 100% idempotente: ele cria o banco `EduTrackAI`, provisiona os logins e permissões com as senhas configuradas no `.env`, cria as 9 tabelas, índices de restrição, views estatísticas e semeia o aluno de demonstração.*

### 5. Iniciar a Aplicação
Inicie todos os microsserviços simultaneamente com um único comando:
```powershell
npm run dev
```
O console exibirá os 3 serviços inicializando em paralelo:
- `[BACKEND]` API Node.js rodando na porta **3001**
- `[ANALYTICS]` FastAPI Python rodando na porta **8000**
- `[FRONTEND]` Interface React Vite rodando na porta **5173**

---

## 🌐 Endereços de Acesso

Após iniciar com `npm run dev`, acesse no navegador:

| Serviço | Endereço URL | Descrição |
| :--- | :--- | :--- |
| **Frontend Web** | [`http://localhost:5173`](http://localhost:5173) | Painel do Estudante, Tarefas, Cronômetro e Relatórios |
| **Backend Node API** | [`http://localhost:3001/api/health`](http://localhost:3001/api/health) | Verificação de integridade e rotas da API |
| **Analytics Docs** | [`http://localhost:8000/docs`](http://localhost:8000/docs) | Documentação Swagger/OpenAPI do serviço Python |

---

## 👤 Credenciais do Aluno de Demonstração (Demo)

O script de setup semeia uma conta com histórico acadêmico de 6 semanas, 5 disciplinas e tarefas para teste imediato de gráficos e previsões:

- **E-mail**: `aluno@edutrack.ai`
- **Senha**: `123456`

*(Na tela de login, você também pode clicar no botão rápido **"Preencher dados do aluno de demonstração (demo)"**).*

---

## 🧪 Testes Automatizados

Para validar o funcionamento completo da aplicação:

```powershell
# Executar suíte completa de testes
npm test

# Testes de integração do Backend Node.js
npm run test:backend

# Testes unitários do Microsserviço Python
npm run test:analytics

# Teste de carga e estresse (meta de latência p95 < 2s)
npm run test:load
```

---

## 🛠️ Resolução de Problemas Comuns (Troubleshooting)

### 1. Erro de Conexão com o SQL Server (Porta 1433 / TCP/IP)
- **Causa**: O SQL Server Express vem com o protocolo de rede TCP/IP desabilitado por padrão.
- **Solução**:
  1. Abra o `SQL Server Configuration Manager` (`SQLServerManager16.msc`).
  2. Vá em **SQL Server Network Configuration** > **Protocols for SQLEXPRESS**.
  3. Dê um clique duplo em **TCP/IP** e marque **Enabled = Yes**.
  4. Na aba **IP Addresses**, vá até o final em **IPAll**, deixe `TCP Dynamic Ports` em branco e defina `TCP Port` = `1433`.
  5. Reinicie o serviço do SQL Server em **SQL Server Services**.

### 2. Falha de Logon do Usuário `edutrack_app`
- **Causa**: O SQL Server está configurado apenas para autenticação do Windows (Windows Authentication mode).
- **Solução**: No SQL Server Management Studio (SSMS), clique com o botão direito no servidor > **Propriedades** > **Segurança** > selecione **"Modo de Autenticação do SQL Server e do Windows"** e reinicie o serviço.  
*(O backend em ambiente de desenvolvimento local também possui fallback automático para autenticação integrada do Windows caso necessário).*

### 3. Erro de Certificado SSL no Python (`ODBC Driver 18`)
- **Mensagem**: `SSL Provider: [error:0A000086:certificate verify failed]`.
- **Solução**: O driver 18 exige criptografia por padrão. O projeto já inclui `TrustServerCertificate=yes` nas strings de conexão para aceitar o certificado local de desenvolvimento.

### 4. Tela Branca ao Acessar o Frontend
- **Causa**: Cache antigo de compilação ou do navegador.
- **Solução**: No navegador (Chrome/Edge), pressione **`Ctrl + F5`** para forçar a atualização dos módulos JavaScript.

---

## 📚 Documentação Técnica Complementar

- [Dicionário de Dados](docs/DICIONARIO_DADOS.md): Detalhamento das 9 tabelas, tipos de dados, chaves e constraints.
- [Diagrama Entidade-Relacionamento (DER)](docs/DER.md): Modelo conceitual e visual das tabelas.
- [Arquitetura do Sistema](docs/ARQUITETURA.md): Topologia de microsserviços, fluxo de autenticação JWT e segurança.
- [Configuração Detalhada do SQL Server](docs/SETUP_SQLSERVER.md): Guia passo a passo de configuração do banco.
- [Relatório de Desempenho e Carga](docs/RELATORIO_DESEMPENHO.md): Evidências de testes com 1.200 alunos e métricas p95.
- [Guia do Gemini e Engenharia de Prompts](GEMINI.md): Especificações das chamadas ao modelo LLM.

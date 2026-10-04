# Contexto do Projeto: EduTrack AI v2 (Guia para Gemini e Desenvolvedores)

Este documento centraliza as diretrizes arquiteturais, regras de implementação e convenções do **EduTrack AI v2**, servindo como fonte de verdade para o desenvolvimento assistido por IA (Google Gemini / Antigravity).

---

## 1. Visão Geral e Estrutura do Repositório

O projeto é um sistema web acadêmico de alto desempenho voltado ao acompanhamento e previsão de conclusão de disciplinas:

```text
EDUTRACK_mvpfinal/
├── backend/               # Servidor Node.js + Express (MSSQL, JWT, Cronômetro, Sessões)
├── analytics-service/     # Microsserviço Python FastAPI (Métricas, Previsão, Insights, PDF)
├── frontend/              # Aplicação React 18 + Vite + Tailwind CSS (Responsiva e Temas)
├── database/              # DDLs, Dicionário, Seeds e Migrações SQL Server
├── docs/                  # DER, Dicionário de Dados, Arquitetura e Relatório de Desempenho
├── tests/                 # Testes de Integração e Testes de Carga (p95 < 2s)
├── package.json           # Orquestração geral do ecossistema
└── GEMINI.md              # Este arquivo de contexto
```

---

## 2. Como Rodar e Testar o Sistema

### Pré-requisitos
- Node.js >= 20.x
- Python >= 3.11 com `pip`
- Microsoft SQL Server (`localhost\SQLEXPRESS`) rodando com ODBC Driver 18.

### Comandos Rápidos na Raiz (`EDUTRACK_mvpfinal`)
```bash
# 1. Instalar todas as dependências do ecossistema
npm run install:all

# 2. Executar a aplicação completa (Backend, Frontend e Analytics)
npm run dev

# 3. Executar os testes automatizados do Backend
npm run test:backend

# 4. Executar os testes automatizados do Microsserviço Python
npm run test:analytics

# 5. Executar o teste de carga e latência (Seção 10.2)
npm run test:load
```

---

## 3. Convenções de Código e Idioma

1. **Idioma dos Textos**: Todo o sistema (interface, mensagens de erro, tooltips, relatórios e documentação) é em **Português do Brasil (pt-BR)**.
2. **Nomenclatura no Banco de Dados**:
   - Tabelas em PascalCase no plural (`Usuarios`, `Disciplinas`, `Tarefas`, `SessoesEstudo`).
   - Colunas em snake_case em português (`id_usuario`, `nome_disciplina`, `horas_estimadas`, `iniciado_em`).
3. **Padrão de Cores (Identidade Visual)**:
   - Navy: `#2C2E4C` (fundo auth, botões primários, texto no claro).
   - Light: `#E7ECEF` (fundo no tema claro).
   - Gold: `#C8B755` (destaque, barras de progresso, bordas).
   - Gold Escuro para contraste WCAG AA no tema claro: `#6B6019`.
   - Dark Surface: `#16172B` (fundo página escuro), `#2C2E4C` (cards escuro).

---

## 4. Regras Obrigatórias de Segurança (Seção 10.1)

> [!IMPORTANT]
> **REGRAS INEGOCIÁVEIS DE SEGURANÇA:**
> 1. **NUNCA ler `id_usuario` do corpo, da query string ou da URL da requisição.** O ID do aluno deve SEMPRE ser extraído da claim `sub` do token JWT autenticado no middleware `auth.js`.
> 2. **NUNCA concatenar valores em queries SQL.** Sempre usar consultas parametrizadas com `input('param', sql.Tipo, valor)`.
> 3. **NUNCA salvar tokens em `localStorage` ou `sessionStorage`.** O Access Token reside apenas na memória volátil (`inMemoryToken`). A persistência segura entre abas/reloads é provida exclusivamente pelo Refresh Token rotativo em cookie `httpOnly` (`SameSite=Lax`, `Path=/api/auth`).
> 4. **Isolamento de Dados Privados:** Se o usuário tentar acessar, editar ou remover um recurso que não pertence a ele, responder SEMPRE com **HTTP 404** (e nunca 403), para não revelar a existência do ID numérico.
> 5. **Comunicação Segura de Microsserviços:** O microsserviço Python escuta estritamente em `127.0.0.1:8000` e exige a chave interna `X-Internal-Key` enviada pelo backend Node.

---

## 5. O que NÃO Fazer

- ❌ Não usar `fetch` direto no backend esperando o Gemini em tempo real nas rotas de Dashboard: use processamento assíncrono e cache para manter p95 < 2s.
- ❌ Não quebrar a identidade visual nem alterar a fonte padrão **Jost**.
- ❌ Não utilizar cor `#C8B755` como cor de texto puro sobre fundos claros (contraste insuficiente para WCAG AA).
- ❌ Não criar tabelas adicionais sem documentar no `DICIONARIO_DADOS.md` e `DER.md`.
- ❌ Não fazer commit de senhas reais ou chaves de API: mantenha segredos em arquivos `.env` ignorados pelo `.gitignore`.

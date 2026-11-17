# EduTrack AI — Sistema de Gestão Acadêmica

> Aplicativo de gestão acadêmica com foco em organização de disciplinas, controle de tarefas e prazos, cálculo automatizado de progresso escolar e emissão de relatórios de desempenho em PDF.

> [!NOTE]
> **Contexto de Versões do Projeto:**
> Este repositório documenta e implementa a versão atual do **EduTrack AI**, cujo frontend está sendo desenvolvido dentro do **FlutterFlow** e o backend gerenciado no **Xano** (via **XanoScript**), utilizando **OpenSpec** para especificação de requisitos e **Python** para scripts utilitários.
> A versão final/original do ecossistema encontra-se em outro projeto, tendo sido estruturada com **Google Antigravity**, **Microsoft SQL Server**, **JavaScript**, **Node.js** e **Python**.

---

## 📱 Visão Geral da Arquitetura Atual

```
┌─────────────────────────────────────────────────────────────┐
│                 Frontend (FlutterFlow)                      │
│        App Mobile & Web • Interface Intuitiva e Reativa      │
└───────────────┬─────────────────────────────────────────────┘
                │ Chamadas REST com Bearer Token (JWT)
┌───────────────▼─────────────────────────────────────────────┐
│                  Backend (Xano / XanoScript)                │
│    APIs RESTful • Isolamento Multi-tenant (user_id == auth) │
│       Grupos: Subjects (CRUD + Busca) • Reports (Download)   │
└───────┬─────────────────────────────────────────────┬───────┘
        │ Banco de Dados Relacional                   │ Execução Local / CLI
┌───────▼───────────────────────────┐ ┌───────────────▼───────┐
│        Tabelas no Xano            │ │     Scripts de Apoio  │
│  user • subjects • academic_tasks │ │        (Python)       │
└───────────────────────────────────┘ └───────────────────────┘
```

- **Frontend (FlutterFlow)**: Desenvolvimento da interface do usuário (UI/UX) diretamente no **FlutterFlow**, compilando para Web e dispositivos móveis (Android e iOS). Consome os endpoints REST do Xano através de chamadas autenticadas com Bearer Token, oferecendo dashboards de matérias, checklists de tarefas e visualização de relatórios.
- **Backend (Xano via XanoScript)**: Camada de persistência e lógica de negócio codificada em **XanoScript** (`.xs`), garantindo regras estritas de autorização e endpoints performáticos.
- **Scripts Utilitários (Python)**: Scripts auxiliares para cálculos analíticos de conclusão de tarefas, detecção temporal de pendências e compilação de relatórios acadêmicos em formato PDF.
- **Metodologia (OpenSpec)**: Abordagem *Spec-Driven Development* (SDD). Qualquer nova funcionalidade ou alteração passa por propostas, especificações e lista de tarefas antes da codificação.
- **Assistência de IA**: Suporte com **Google Gemini** para desenvolvimento orientado e lógica analítica.

---

## 🗄️ Estrutura de Tabelas (Xano)

Os esquemas das tabelas estão localizados no diretório `tables/`:

1. **`user`** (`tables/745539_user.xs`):
   - Registro de estudantes e autenticação nativa com senhas criptografadas, controle de perfis e fluxo de recuperação de acesso.
2. **`subjects`** (`tables/916048_subjects.xs`):
   - Disciplinas acadêmicas cadastradas (`name`, `teacher`, `hours`), isoladas estritamente por estudante através do campo `user_id`.
3. **`academic_tasks`** (`tables/academic_tasks.xs`):
   - Atividades e tarefas escolares com controle de status (`pending`, `completed`), data limite (`due_date`) e vínculos com a disciplina (`subject_id`) e com o aluno (`user_id`).

---

## 🔌 Endpoints de API (RESTful)

As APIs estão organizadas no diretório `apis/`. Todos os endpoints protegidos exigem autenticação ativa (`auth = "user"`) e aplicam validação estrita de segurança (`user_id == $auth.id`):

### Grupo `Subjects` (`apis/subjects/`)
- `GET /subjects`: Lista as disciplinas do aluno autenticado.
- `POST /subjects`: Cadastra uma nova disciplina vinculada ao `user_id`.
- `GET /subjects/{id}`: Detalha uma disciplina específica, validando permissão de acesso.
- `PATCH /subjects/{id}`: Atualiza os dados de uma disciplina existente.
- `DELETE /subjects/{id}`: Remove uma disciplina do estudante.
- `GET /subjects/search`: Busca avançada que localiza matérias por correspondência de texto no nome **ou** que possuam tarefas pendentes em atraso (`due_date < now`).

### Grupo `Reports` (`apis/reports/`)
- `GET /reports/performance/download`: Recupera os dados acadêmicos consolidados do aluno (disciplinas e tarefas concluídas/pendentes) para entrega e geração do relatório de desempenho.

---

## 🎨 Integração com o FlutterFlow

O frontend está sendo construído no **FlutterFlow** seguindo as seguintes etapas de integração:

1. **Autenticação**:
   - Criação de telas de login e cadastro integradas aos endpoints de autenticação do Xano.
   - Armazenamento persistente e seguro do JWT no App State para injeção automática no header `Authorization: Bearer [token]`.
2. **Módulo de Disciplinas**:
   - Telas de listagem em cards ou listas reativas conectadas ao `GET /subjects`.
   - Modais/formulários de cadastro e edição consumindo `POST /subjects` e `PATCH /subjects/{id}`.
   - Barra de pesquisa integrada com debounce conectada ao `GET /subjects/search`.
3. **Módulo de Tarefas e Prazos**:
   - Listagem de tarefas por disciplina com tags visuais de status e alertas para itens com `due_date` expirado.
4. **Relatório de Desempenho**:
   - Botão de ação que consome `GET /reports/performance/download` para acionar a visualização ou download do relatório consolidado do estudante.

---

## 🐍 Scripts Utilitários em Python

Localizados no diretório `scripts/`, preparados para execução independente via linha de comando com tratamento de erros (`try/except`) e retorno estruturado em JSON:

- **`scripts/generate_performance_report.py`**:
  - Compila métricas acadêmicas (disciplinas, total de tarefas, taxa de conclusão e notas) e gera um arquivo PDF diagramado.
  - Compatível com a biblioteca ReportLab e com gerador de PDF-1.4 nativo (zero dependências obrigatórias).
  - *Exemplo de uso via terminal:*
    ```bash
    python scripts/generate_performance_report.py --student-id "1" --student-name "Carlos Silva" --output "relatorio.pdf"
    ```
- **`scripts/calculate_progress.py`**:
  - Calcula a porcentagem e métricas de conclusão de tarefas a partir de valores concluídos e totais.
- **`scripts/filter_overdue_subjects.py`**:
  - Utilitário de filtragem de disciplinas que contenham atividades com prazo vencido em relação ao horário UTC atual.

---

## 📋 Governança e Metodologia (OpenSpec)

O projeto adota o **OpenSpec** como padrão de desenvolvimento orientado a especificações:

- `openspec/specs/`: Especificações permanentes e consolidadas das capacidades do sistema.
- `openspec/changes/`: Especificações de mudanças ativas, propostas e tarefas em andamento.
- `openspec/changes/archive/`: Histórico de mudanças implementadas e arquivadas.

Comandos frequentes:
```bash
# Validar integridade das especificações
openspec validate --strict

# Consultar status das tarefas de uma mudança
openspec instructions apply --change "<nome-da-change>" --json
```

---

## 📂 Estrutura de Pastas do Projeto

```
edutrack-ai-pedro/
├── apis/                     # Endpoints e grupos de API em XanoScript
│   ├── reports/              # API de relatórios e download
│   └── subjects/             # API de disciplinas (CRUD + busca)
├── tables/                   # Definição das tabelas em XanoScript (.xs)
│   ├── 745539_user.xs        # Tabela de usuários e autenticação
│   ├── 916048_subjects.xs    # Tabela de disciplinas
│   └── academic_tasks.xs     # Tabela de tarefas acadêmicas
├── scripts/                  # Utilitários e geradores em Python
│   ├── calculate_progress.py
│   ├── filter_overdue_subjects.py
│   └── generate_performance_report.py
├── openspec/                 # Metodologia Spec-Driven Development
│   ├── changes/              # Mudanças ativas e arquivadas
│   └── specs/                # Especificações consolidadas
├── AGENTS.md                 # Regras e diretrizes para agentes de IA
└── README.md                 # Documentação principal da versão atual
```

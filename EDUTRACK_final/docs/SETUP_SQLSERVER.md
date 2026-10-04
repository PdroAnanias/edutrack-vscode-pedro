# Guia de Configuração do SQL Server Local (Windows) — EduTrack AI v2

Este guia descreve os passos necessários para configurar o ambiente do **Microsoft SQL Server** no Windows para o funcionamento do backend Node.js e do microsserviço Python.

---

## 1. Pré-requisitos Instalados

1. **SQL Server Express ou Developer** (instância padrão: `localhost\SQLEXPRESS`).
2. **ODBC Driver 18 for SQL Server** (x64) instalado para conexão do Python (`pyodbc`).
3. Ferramenta de linha de comando `sqlcmd` (instalada junto com o SQL Server ou Command Line Utilities).

---

## 2. Habilitação de TCP/IP no SQL Server Configuration Manager

Para permitir que drivers de rede e microsserviços se conectem via porta 1433:

1. Pressione `Win + R`, digite `SQLServerManager16.msc` (ou o correspondente à sua versão) e pressione **Enter**.
2. No menu à esquerda, expanda **SQL Server Network Configuration** > **Protocols for SQLEXPRESS**.
3. Dê um clique duplo em **TCP/IP** e defina:
   - **Enabled**: `Yes`
4. Na aba **IP Addresses**:
   - Role até a seção **IPAll**.
   - Se houver valor em **TCP Dynamic Ports**, apague-o (deixe em branco).
   - Defina **TCP Port**: `1433`.
   - Clique em **OK**.
5. Reinicie o serviço do SQL Server em **SQL Server Services** > clique com botão direito em **SQL Server (SQLEXPRESS)** > **Restart**.

---

## 3. Habilitação de Autenticação Mista (SQL Server e Windows)

Caso deseje autenticar via usuário e senha do SQL Server (`edutrack_app` / `edutrack_py_ro`):

1. Abra o **SQL Server Management Studio (SSMS)** ou execute via `sqlcmd`:
   ```sql
   EXEC xp_instance_regwrite N'HKEY_LOCAL_MACHINE', N'Software\Microsoft\MSSQLServer\MSSQLServer', N'LoginMode', REG_DWORD, 2;
   ```
2. Reinicie o serviço do SQL Server para aplicar a alteração.

> **Dica**: No Windows local, o backend Node.js também suporta autenticação integrada do Windows (`Trusted_Connection=yes`) automaticamente se você estiver logado na máquina onde o SQL Server está rodando.

---

## 4. Criação do Banco de Dados e Usuários com setup-db.ps1

A forma mais rápida e recomendada é executar o script automatizado do projeto, que lê as credenciais do seu arquivo `.env`:

```powershell
npm run setup-db
```

Ou diretamente no PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File .\database\setup-db.ps1
```

O script executa sequencialmente e de forma idempotente:
1. `01_create_database.sql`: Cria o banco `EduTrackAI` (collation `Latin1_General_CI_AS`).
2. `02_create_logins.sql`: Cria os logins e usuários com permissões específicas usando as senhas do `.env`.
3. `03_schema.sql`: Cria as 9 tabelas estruturadas e constraints.
4. `04_indexes.sql`: Cria os índices de performance e o índice único filtrado `UX_Sessoes_ativa_por_usuario`.
5. `05_views.sql`: Cria as views analíticas (`vw_TarefaTempo`, `vw_ProgressoDisciplina`, `vw_HorasPorSemana`).
6. `06_seed_cursos.sql`: Semeia cursos padrão de graduação.
7. `07_seed_demo.sql`: Semeia dados fictícios de demonstração para `aluno@edutrack.ai` (senha `123456`).

---

## 5. Permissões dos Logins Provisionados

- **`edutrack_app`**:
  - Permissões: `db_datareader`, `db_datawriter`, `GRANT EXECUTE`.
  - Utilizado pelo Backend Node.js.
- **`edutrack_py_ro`**:
  - Permissões: `db_datareader` (somente leitura).
  - Utilizado pelo microsserviço Python Analytics.

---

## 6. Testando a Conectividade

### Teste com login SQL Server via sqlcmd:
```powershell
sqlcmd -S "localhost\SQLEXPRESS" -U "edutrack_app" -P "SuaSenhaDefinidaNoEnv" -d "EduTrackAI" -C -Q "SELECT @@VERSION, DB_NAME();"
```

### Configurações no arquivo `.env` (Backend Node.js):
```env
DB_SERVER=localhost\SQLEXPRESS
DB_NAME=EduTrackAI
DB_USER=edutrack_app
DB_PASSWORD=SuaSenhaForteApp123!
DB_PORT=1433
DB_ENCRYPT=false
DB_TRUST_SERVER_CERT=true
```

### Configurações no arquivo `.env` (Python Analytics):
```env
DB_SERVER=localhost\SQLEXPRESS
DB_NAME=EduTrackAI
DB_USER=edutrack_py_ro
DB_PASSWORD=SuaSenhaFortePyRo123!
DB_DRIVER=ODBC Driver 18 for SQL Server
```

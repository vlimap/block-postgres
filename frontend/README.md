# block-postgres

Modelador visual de esquemas **PostgreSQL** no navegador.  
Interface construída com **React** e **React Flow** (ERD) e edição declarativa via **Google Blockly** (tabelas, colunas, constraints, índices, tipos). Gera **prévia de DDL SQL**, suporta **múltiplos schemas**, exporta/importa o **workspace** em JSON e faz auto-save local.

> Escopo atual: **frontend**. O backend para introspecção/aplicação de DDL (Node.js + Express + `pg`) é planejado como fase seguinte, sem quebrar o contrato do modelo.

---

## Sumário

- [Recursos](#recursos)
- [Stack](#stack)
- [Arquitetura (frontend)](#arquitetura-frontend)
- [Requisitos](#requisitos)
- [Instalação e execução](#instalação-e-execução)
- [Backend (API)](#backend-api)
- [Scripts](#scripts)
- [Estrutura de pastas](#estrutura-de-pastas)
- [Uso](#uso)
- [Validação e qualidade](#validação-e-qualidade)
- [Roadmap](#roadmap)
- [Referências técnicas](#referências-técnicas)
- [Licença](#licença)

---

## Recursos

- **Modelagem por blocos (Blockly)**:
  - `schema`, `enum`, `domain`
  - `table`, `column` (tipo, nullability, default, `GENERATED AS IDENTITY`, `collate`)
  - Constraints: `PRIMARY KEY`, `UNIQUE` (com `NULLS NOT DISTINCT`), `CHECK`, `FOREIGN KEY` (on update/delete, `DEFERRABLE`)
  - Índices: método (`btree`, `hash`, `gin`, `gist`, `brin`), `UNIQUE`, `INCLUDE`, `WHERE`, colunas/expressões
  - Tipos: built-ins (`uuid`, `text`, `varchar(n)`, `numeric(p,s)`, `timestamp/timestamptz`, `jsonb`, etc.), `enum`, `domain`, `array`, `custom`
- **ERD (React Flow)**:
  - Nós = tabelas; arestas = FKs; minimapa, zoom/pan; auto-layout com **elkjs**
- **Geração de SQL (preview)**:
  - Ordem: `CREATE SCHEMA` → `CREATE TYPE (ENUM/DOMAIN)` → `CREATE TABLE` → `CREATE INDEX`
- **Persistência**:
  - Auto-save em `localStorage`
  - Export/Import de workspace `.pgjson`
- **Múltiplos schemas** (padrão `public`)
- **Validação do modelo** antes de renderizar SQL (erros e avisos)

---

## Stack

- **React + TypeScript**
- **@xyflow/react (React Flow)** para ERD
- **elkjs** para auto-layout
- **Google Blockly** para blocos customizados e toolbox em JSON
- **Zustand** para estado global
- **Zod** para validação de metamodelo
- Build com **Vite**

---

## Arquitetura (frontend)

- **Blockly** é a camada de **edição** do esquema (blocos).  
- **Conversor**: workspace → **metamodelo JSON** (estrutura tipada).  
- **Gerador**: metamodelo → **SQL Preview** (DDL).  
- **React Flow** renderiza **ERD** a partir do mesmo metamodelo (tabelas/FKs).  
- **Right Pane** exibe **Modelo (JSON)** e **SQL Preview** com ações (Novo, Importar, Salvar, Copiar).

```
[Blockly] --workspace--> [Model JSON] --(Zod valida)--> [SQL Preview]
                                   \--> [React Flow ERD]
```

---

## Requisitos

- **Ubuntu/Linux**
- **Node.js 20+** e **npm** (ou pnpm/yarn)
- Navegador moderno

---

## Instalação e execução

Clonar e instalar dependências:

```bash
git clone https://github.com/vlimap/block-postgres.git
cd block-postgres
npm ci
```

Executar em modo desenvolvimento:

```bash
npm run dev
```

Build de produção:

```bash
npm run build
npm run preview
```

> O frontend agora consome uma API autenticada. Defina `VITE_API_BASE_URL` (ex.: `http://localhost:4000`) num arquivo `.env` na raiz ao rodar em desenvolvimento ou build de produção.

## Backend (API)

O diretório [`backend/`](./backend) contém uma API Express com **PostgreSQL + Sequelize**, autenticação via **GitHub OAuth** e armazenamentos de projetos por usuário.

### Configuração

1. No GitHub, registre um OAuth App:
   - **Homepage URL:** `http://localhost:5173` (ou a URL do frontend em produção)
   - **Authorization callback URL:** `http://localhost:4000/api/auth/github/callback`
2. Copie `.env.example` para `.env` em `backend/` e preencha:
   ```bash
   PORT=4000
   FRONTEND_URL=http://localhost:5173
   SESSION_SECRET=<chave-forte>
   GITHUB_CLIENT_ID=<client-id>
   GITHUB_CLIENT_SECRET=<client-secret>
   PGHOST=localhost
   PGPORT=5432
   PGDATABASE=blocos_db
   PGUSER=blocos_user
   PGPASSWORD=example_password
   ```
   - Para múltiplas origens (ex.: deploy Vercel), adicione `CORS_ORIGINS` com valores separados por vírgula.
   - Em produção, exponha `GITHUB_CALLBACK_URL` com o domínio público.
   - Vai usar o PostgreSQL gratuito do Supabase/Vercel? Crie um arquivo `.env` com:
     ```bash
     DATABASE_URL=${POSTGRES_URL_NON_POOLING}  # utilize a string "non pooling" gerada pelo Supabase
     DB_SSL=true
     DB_POOL_MAX=5
     ```
     (Substitua `${POSTGRES_URL_NON_POOLING}` pela URL fornecida. Para ambientes serverless, utilize a URL "pooler".)
3. Instale dependências e rode a API:
   ```bash
   cd backend
   npm install
   npm run dev
   ```

### Segurança aplicada

- **Helmet** com CSP (libera avatares do GitHub) e headers de proteção.
- **Rate limiting** (120 req/min geral, 20 req/5min para login) e `trust proxy` para ambientes como Vercel.
- **Sessions** persistidas em Postgres (`connect-session-sequelize`) com `SameSite=None`/`secure` em produção.
- **CORS restrito** às origens configuradas.
- **Payload validation** com Zod para salvar/atualizar projetos.
- **Consentimento de marketing**: guarda `marketingOptIn` + timestamp de consentimento explícito.
- Limite de payload JSON (`1mb`) e compressão de resposta.
- Tratamento centralizado de erros e monitoramento de rejections.

### Fluxo de autenticação

1. O frontend abre `/api/auth/github` (botão “Entrar com GitHub”).
2. GitHub redireciona para `/api/auth/github/callback` (URL configurada).
3. A API cria/atualiza o usuário no Postgres e guarda a sessão.
4. `GET /api/me` retorna o perfil (`id`, `name`, `email`, `avatarUrl`).
5. `GET/POST/PUT/DELETE /api/projects` manipulam os projetos do usuário autenticado.

> Caso o projeto ainda não tenha sido inicializado via Vite, crie com:
> ```bash
> npm create vite@latest . -- --template react-ts
> npm i @xyflow/react elkjs blockly zod zustand
> npm i -D eslint prettier @typescript-eslint/parser @typescript-eslint/eslint-plugin vite-plugin-checker
> ```

---

## Scripts

| Script             | Descrição                                                   |
|--------------------|-------------------------------------------------------------|
| `npm run dev`      | Dev server com HMR                                          |
| `npm run build`    | Build de produção (Vite)                                    |
| `npm run preview`  | Servir build localmente                                     |
| `npm run lint`     | Lint (ESLint)                                               |
| `npm run typecheck`| Checagem de tipos (TS)                                      |
| `npm run test`     | Testes unitários (se configurados)                          |
| `npm run dev` (backend) | Executa a API Express com `nodemon`                     |
| `npm run start` (backend) | Executa a API em modo produção                      |

---

## Estrutura de pastas

> Ajuste conforme sua árvore real. Esta é a organização recomendada.

```
src/
  blockly/
    blocks.ts          # defineBlocksWithJsonArray para todos os blocos
    toolbox.ts         # toolbox em JSON
    generator.ts       # workspace -> Model + SQL preview
    model.ts           # metamodelo TypeScript
  erd/
    Erd.tsx            # React Flow + elkjs (model -> nodes/edges)
  state/
    useModelStore.ts   # Zustand: modelo, SQL, erros, refs
  components/
    BlocklyEditor.tsx  # wrapper do workspace
    RightPane.tsx      # tabs Modelo/SQL + ações
  App.tsx
  main.tsx
```

---

## Uso

1. Abra a aplicação (`npm run dev`) no navegador.
2. No painel esquerdo, arraste blocos:
   - `schema`, `enum`, `domain` (opcional)
   - `table` → empilhe `column`, constraints e índices
3. A cada alteração:
   - Aba **Modelo (JSON)** mostra o metamodelo tipado
   - Aba **SQL Preview** mostra DDL ordenada
4. **Exportar**: botão para salvar o workspace em `.pgjson`  
   **Importar**: carregue um `.pgjson` previamente salvo
5. Abra o **ERD** para visualizar tabelas e FKs no canvas (React Flow)

Erros e avisos (ex.: FK referencia coluna inexistente) são mostrados no topo do painel direito.

---

## Validação e qualidade

- **Zod** valida o metamodelo antes de gerar SQL
- **ESLint + Prettier** garantem consistência de código
- **TypeScript `strict: true`** e `noUncheckedIndexedAccess`
- Testes unitários recomendados para:
  - Conversão workspace → modelo
  - Emissão de DDL (casos de PK/UK/FK/índices)

---

## Roadmap

- Backend (fase 2):  
  - **Introspecção**: converter um banco real (`pg_catalog`) → modelo  
  - **Diff/Migrações**: `from` → `to` com ordem por dependências e transações
  - **Aplicação de DDL** segura (timeouts, logs)
- **Particionamento** (`PARTITION BY`) e **RLS** (Row Level Security)
- **Views/Materialized Views** e **Comentários** (`COMMENT ON`)
- **Casts explícitos** para `ALTER COLUMN TYPE` em migrações
- **Templates** de projeto e preferências de estilos de modelagem

---

## Referências técnicas

- **PostgreSQL**  
  - Comandos DDL: `CREATE TABLE`, `CREATE TYPE`, `CREATE DOMAIN`, `CREATE INDEX`, `ALTER TABLE`, `GENERATED AS IDENTITY`  
    https://www.postgresql.org/docs/current/sql-commands.html  
  - Catálogos: `pg_namespace`, `pg_class`, `pg_attribute`, `pg_type`, `pg_constraint`, `pg_index`, `pg_enum`, `pg_am`  
    https://www.postgresql.org/docs/current/catalogs.html  
  - `UNIQUE ... NULLS NOT DISTINCT` (≥ 15)  
    https://www.postgresql.org/docs/current/ddl-constraints.html
- **Blockly**  
  - Toolbox em JSON, blocos via `defineBlocksWithJsonArray`, serialização `workspaces.save/load`  
    https://developers.google.com/blockly
- **React Flow (@xyflow/react)**  
  https://reactflow.dev/
- **elkjs**  
  https://www.eclipse.org/elk/

---

## Licença

[MIT](LICENSE)

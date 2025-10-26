# PG Modeler

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/I2I5GOM2U)

Modelador visual de esquemas **PostgreSQL** feito para rodar direto no navegador. O projeto combina uma interface rica em React Flow para diagramar tabelas e relacionamentos, geração declarativa de DDL SQL e uma API Node.js que persiste workspaces, autentica com GitHub e expõe métricas/tarefas auxiliares.

## Visão Geral

- **Frontend (Vite + React 18)** — editor interativo com auto layout ELK, atalhos de teclado, exportação em PNG/SVG/PDF, suporte a múltiplos schemas e pré-visualização de SQL.  
- **Backend (Express + Sequelize)** — API REST segura com sessões persistidas em Postgres, autenticação GitHub OAuth e limites de rate.  
- **Workspace completo** — salve/importe diagramas em JSON, acompanhe alterações em tempo real e organize versões de projetos.

## Estrutura do Repositório

```text
.
├── frontend/        # Aplicação React + Vite (editor ERD)
│   ├── public/
│   ├── src/
│   └── package.json
└── backend/         # API Express com Sequelize + Postgres
    ├── src/
    ├── package.json
    └── .env.example
```

## Pré-requisitos

- Node.js **18** ou superior
- npm (instalado com Node)
- Uma instância PostgreSQL acessível (ex.: Neon, Supabase, Railway, Render, Azure Flexible Server)
- Credenciais OAuth do GitHub (para login social, opcional em desenvolvimento)

## Como rodar o projeto localmente

1. Instale as dependências de cada pacote:

   ```bash
   cd frontend && npm install
   cd backend && npm install
   ```

2. Copie o arquivo de exemplo de variáveis de ambiente do backend e ajuste valores:

   ```bash
   cp backend/.env.example backend/.env
   ```

   Campos importantes:
   - `PG*` ou `DATABASE_URL` — apontam para o serviço de banco de dados gerenciado que você preferir (não publique esses valores)
   - `SESSION_SECRET` — chave longa e aleatória para assinar a sessão
   - `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_CALLBACK_URL` — credenciais OAuth (use placeholders se não estiver ativando login)
   - `FRONTEND_URL` — origem autorizada para a aplicação cliente (ajuste conforme seu domínio ou ambiente de desenvolvimento)

3. Inicie a API:

   ```bash
   cd backend
   npm run dev
   ```

   A API sobe na porta definida em `PORT` (4000 por padrão) e cria/atualiza o schema do banco automaticamente.

4. Em outra aba, suba o frontend:

   ```bash
   cd frontend
   npm run dev
   ```

   O Vite exibirá no terminal a URL local para acesso ao editor (porta 5173 por padrão).

## Scripts úteis

### Frontend

- `npm run dev` — inicia o Vite com hot reload  
- `npm run build` — cheque de tipos + bundle de produção  
- `npm run preview` — serve o build gerado  
- `npm run lint` — roda ESLint sobre o código React/TypeScript

### Backend

- `npm run dev` — inicia o servidor Express com Nodemon  
- `npm start` — executa o servidor em modo produção

## Recursos em destaque

- Editor ERD visual com cards responsivos, handles de relacionamento e atalhos de teclado
- Auto layout com ELK para organizar grandes diagramas
- Exportação do canvas em PNG, SVG vetorial ou PDF mantendo o estilo da tela
- Geração e pré-visualização de DDL SQL para o diagrama atual
- Suporte a múltiplos schemas, tipos customizados e gerenciamento de versões de projetos
- Persistência opcional no backend com autenticação GitHub

## Contribuindo

Contribuições são muito bem-vindas! Abra uma issue descrevendo a ideia/bug ou envie um pull request. Siga o estilo de código existente, mantenha mensagens de commit objetivas e, se possível, atualize a documentação.

<div align="center">

<a href="https://github.com/vlimap/block-postgres/stargazers" target="_blank" rel="noopener">
  <img src="https://img.shields.io/github/stars/vlimap/block-postgres?label=Deixe%20uma%20star&style=social" alt="GitHub stars"/>
</a>

<details>
  <summary>Por que apoiar?</summary>

  Cada estrela, feedback ou contribuição financeira ajuda a manter o Blocos evoluindo — cobrindo custos de infraestrutura, priorizando novas funcionalidades e garantindo suporte contínuo para a comunidade.
</details>

<img src="./frontend/public/qrcode.png" alt="DOE um café para apoiar o Blocos" width="200" />

</div>

## Fluxo Git e Pull Requests

Para manter o projeto organizado, seguimos um fluxo simples baseado em duas branches principais:

- `main`: branch de produção. Recebe apenas merges revisados e liberados pela equipe.
- `develop`: branch de integração. Toda contribuição deve sair deste branch.

### Como contribuir

1. **Abra uma issue**  
   - Use o template padrão informando o objetivo (bug, melhoria, feature).  
   - Descreva claramente o problema, os passos para reproduzir (se aplicável) e anexar capturas de tela/logs quando possível.

2. **Crie uma branch a partir de `develop`**  
   ```bash
   git checkout develop
   git pull
   git checkout -b feature/nome-curto
   ```
   - Use prefixos como `feature/`, `fix/`, `docs/` para indicar o tipo de mudança.

3. **Implemente e valide**  
   - Mantenha commits objetivos (`git commit -m "feat: descrição breve"`).  
   - Execute os scripts de lint/tests relevantes antes de abrir o PR.

4. **Abra o Pull Request**  
   - Base: `develop`.  
   - Inclua no título a referência da issue (`[#123] feat: descrição`).  
   - Preencha o template marcando checklists, descrevendo mudanças, cenários testados e pendências.
   - Solicite revisão de pelo menos um mantenedor.

5. **Revisão e merge**  
   - Enderece comentários via commits adicionais ou correções interativas.  
   - Após aprovação e CI verde, um maintainer fará o merge em `develop`.  
   - A branch `develop` é incorporada em `main` apenas em releases controladas.

Esse fluxo garante que o ambiente de produção permaneça estável enquanto colaboramos no desenvolvimento contínuo.

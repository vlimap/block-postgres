# Contribuindo com o Blocos

Obrigado por dedicar tempo para melhorar este projeto! Este guia resume como contribuir de forma produtiva e segura.

## Visão geral do fluxo

- `main` — branch de produção. Somente maintainers realizam merges aqui em releases controladas.
- `develop` — branch de integração. Toda contribuição partindo da comunidade deve ser baseada nesta branch.

### Passo a passo

1. **Abra uma issue**  
   - Escolha o template apropriado (bug ou feature).  
   - Descreva o contexto, passos e evidências.

2. **Crie sua branch**  
   ```bash
   git checkout develop
   git pull
   git checkout -b feature/minha-melhoria
   ```

3. **Implemente e valide**  
   - Mantenha commits claros (`feat:`, `fix:`, `docs:` etc.).  
   - Execute `npm run lint` e demais testes pertinentes antes do PR.

4. **Abra o Pull Request**  
   - Base: `develop`.  
  - Preencha o template, referenciando a issue (`#123`).  
   - Marque checklists, inclua evidências e descreva testes.

5. **Revisão**  
   - Responda feedbacks e ajuste o PR até obter aprovação.  
   - Um maintainer fará o merge após a validação do CI.

## Padrões de código

- Frontend usa TypeScript + React; prefira hooks, componentes funcionais e keep-alive with lint rules.  
- Respeite as configurações de `eslint`, `prettier` (se aplicável) e Tailwind.  
- Evite dependências adicionais sem discussão prévia na issue.

## Ambiente de desenvolvimento

- Requer Node.js 18+.  
- Instale dependências em `frontend/` e `backend/` com `npm install`.  
- Configure `.env` no backend usando o exemplo fornecido.  
- Use `npm run dev` em cada pacote para desenvolvimento.

## Comunicação

- Utilize issues para rastrear trabalho e dúvidas objetivas.  
- Discussões gerais podem ser abertas em [GitHub Discussions](https://github.com/vlimap/block-postgres/discussions).  
- Para vulnerabilidades, siga o processo descrito em `SECURITY.md`.

Agradecemos qualquer contribuição — desde reports até melhorias de docs! 🙌


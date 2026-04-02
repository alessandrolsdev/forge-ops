# Contribuindo com o ForgeOps

Este repositório segue um fluxo de engenharia orientado por issue, branch dedicada, PR pequeno e validacoes obrigatorias. Antes de contribuir, leia:

- `AGENTS.md`
- `PROJECT.md`
- a documentacao relevante em `docs/`

## Fluxo esperado

1. Crie ou selecione uma issue real no GitHub.
2. Defina a branch antes de editar qualquer arquivo.
3. Respeite o escopo da issue. Nao misture entregas.
4. Atualize ou crie testes quando houver alteracao de logica.
5. Abra um PR para `main` com metadata completa e `Closes #<numero>`.

## Convencao de branches

Use nomes curtos e semanticos:

- `feature/<descricao-curta>`
- `fix/<descricao-curta>`
- `docs/<descricao-curta>`
- `chore/<descricao-curta>`
- `test/<descricao-curta>`
- `refactor/<descricao-curta>`

## Padrao de commits

Use Conventional Commits em portugues do Brasil.

Formato:

```text
tipo(escopo): descricao curta no imperativo
```

Tipos aceitos:
- `feat`
- `fix`
- `refactor`
- `perf`
- `docs`
- `test`
- `chore`
- `build`
- `ci`
- `style`
- `revert`

Exemplos:
- `feat(api): adiciona listagem protegida de pull requests`
- `fix(ci): garante comentario final sem pat no codex-review`
- `docs(readme): descreve setup local do monorepo`

## Pull Requests

Todo PR deve:
- apontar para `main`, salvo excecao explicitamente combinada
- ter escopo unico e revisavel
- referenciar a issue com `Closes #<numero>`
- usar descricao em pt-BR com contexto, validacao e riscos
- ter metadata aplicada:
  - assignee
  - labels
  - milestone quando aplicavel
  - project quando aplicavel

## Validacoes obrigatorias

Antes de abrir PR, rode no minimo:

```bash
pnpm lint
pnpm typecheck
pnpm test
```

Se a mudanca atingir apenas parte do workspace, ainda assim documente claramente qualquer validacao parcial ou limitacao encontrada.

## Planejamento antes de features

Antes de implementar feature, refactor relevante ou integracao:
- use o fluxo de `architecture-planning`
- explicite objetivo, riscos, arquivos afetados e criterios de aceite
- so depois avance para a implementacao

Isso vale especialmente para:
- endpoints
- integracoes com GitHub
- workflows de CI
- mudancas de arquitetura

## Guidelines de codigo

- TypeScript strict, sem `any`
- sem segredos hardcoded
- validacao de entrada nas bordas
- controller delega, service decide, repository persiste
- sem refactor fora do escopo da issue
- sem remover testes para fazer CI passar

## Documentacao

Mudancas que alterem arquitetura, onboarding, operacao ou contribuicao devem atualizar a documentacao relevante em:

- `README.md`
- `docs/architecture/`
- `docs/guides/`
- `docs/workflows/`

## Seguranca

Contribuicoes devem preservar:
- menor privilegio em GitHub Actions
- ausencia de segredos no codigo
- logs sem dados sensiveis
- fallbacks honestos e seguros

Se houver risco residual, documente explicitamente no PR.

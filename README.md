# ForgeOps

ForgeOps e uma plataforma de governanca de automacoes de engenharia. O projeto centraliza visibilidade operacional sobre GitHub Actions, pull requests, reviews automatizados com Codex e sinais basicos de qualidade por repositorio.

Hoje o repositório já entrega a base para:
- registro de repositórios monitorados
- catalogo de workflows
- visibilidade de workflow runs e jobs
- sincronizacao de pull requests
- automacao advisory de review com Codex no GitHub Actions

## Problema que o projeto resolve

Equipes de engenharia costumam ter automacoes importantes espalhadas entre repositorios, workflows, checks e comentarios de review. Isso dificulta responder perguntas como:
- quais repositorios estao fora do padrao
- quais automacoes estao falhando com frequencia
- quais PRs carregam risco operacional relevante
- onde falta review automatizado, teste ou cobertura minima de qualidade

ForgeOps existe para transformar esses sinais em um sistema governavel e navegavel.

## Estado atual do produto

O projeto esta em evolucao incremental orientada por milestone. A base atual do MVP ja cobre:
- `Repository Registry`
- `Workflow Catalog`
- `Workflow Runs Visibility`
- baseline inicial de `Pull Request Insights`

Funcionalidades como `Review Intelligence`, `Automation Health` e `Policy Engine` ainda estao em progresso.

## Visao geral da arquitetura

ForgeOps segue uma arquitetura de monorepo com fronteiras explicitas:

- `frontend/`
  interface web em Next.js 15 + React 19
- `backend/`
  API Fastify com TypeScript strict, Prisma e integracoes com GitHub
- `packages/`
  configuracoes compartilhadas de lint e TypeScript
- `docs/`
  arquitetura, ADRs, planos e guias operacionais
- `.github/`
  workflows, prompts versionados e automacoes do proprio repositorio

Fluxo de alto nivel:

```text
GitHub -> backend (sync e persistencia) -> PostgreSQL
        -> frontend (API protegida) -> operador
        -> GitHub Actions (codex-review) -> comentarios advisory no PR
```

Documentacao arquitetural complementar:
- [Arquitetura atual](docs/architecture/current.md)
- [Fronteiras do monorepo](docs/architecture/monorepo-boundaries.md)
- [Fluxo arquitetural do Codex Review](docs/architecture/codex-review.md)

## Fluxo de Codex Review

O repositório possui um workflow advisory de review automatizado em `.github/workflows/codex-review.yml`.

Resumo do comportamento atual:
1. Um pull request para `main` dispara o workflow.
2. O workflow ignora PRs de fork e PRs draft.
3. Se `CODEX_REVIEW_PAT` estiver valido, o comentario inicial `@codex review` e publicado como usuario real.
4. O workflow tenta gerar um review automatizado via OpenAI.
5. Se o caminho principal nao produzir um review utilizavel, entra o fallback via OpenRouter.
6. Se nenhum provider produzir conteudo publicavel, o workflow publica um comentario advisory explicando o motivo observado.
7. Quando o PAT nao estiver disponivel, a publicacao final cai para `GITHUB_TOKEN`, preservando o comentario de status como `github-actions[bot]`.

Documentacao detalhada:
- [Arquitetura do Codex Review](docs/architecture/codex-review.md)
- [Workflow do Codex Review](docs/workflows/codex-review.md)
- [Guia de debugging do Codex Review](docs/guides/debug-codex-review.md)

## Setup local

### Requisitos

- Node.js 22+
- pnpm 9
- Docker e Docker Compose

### 1. Instalar dependencias

```bash
pnpm install
```

### 2. Subir dependencias locais

```bash
docker compose up -d
```

Isso sobe:
- PostgreSQL em `localhost:5432`
- Redis em `localhost:6379`

### 3. Configurar ambiente

Use `.env.example` como base:

```bash
cp .env.example .env
```

Variaveis locais principais:
- `PORT`
- `DATABASE_URL`
- `REDIS_URL`
- `NEXT_PUBLIC_API_BASE_URL`
- `GITHUB_APP_ID`
- `GITHUB_APP_INSTALLATION_ID`
- `GITHUB_APP_PRIVATE_KEY`
- `GITHUB_APP_WEBHOOK_SECRET`

### 4. Preparar Prisma

```bash
pnpm --filter @forgeops/backend prisma:generate
```

### 5. Rodar o monorepo

```bash
pnpm dev
```

Servicos esperados:
- frontend: `http://localhost:3000`
- backend: `http://localhost:3333`

## Variaveis de ambiente para o workflow Codex Review

O `codex-review` usa configuracao de GitHub Actions, nao o `.env` local da aplicacao. As variaveis e segredos mais importantes sao:

- `CODEX_REVIEW_PAT`
  secret opcional para publicar comentarios como usuario real
- `OPENROUTER_API_KEY`
  secret para o provider de fallback
- `OPENROUTER_MODEL`
  repository variable preferencial para o modelo da OpenRouter

Observacoes:
- o workflow tambem suporta `OPENAI_API_KEY` para o caminho principal de review automatizado
- por compatibilidade operacional, o workflow ainda aceita `CODEX_REVIEW_OPENROUTER_MODEL` como alias legado
- sem `CODEX_REVIEW_PAT`, o comentario final continua sendo publicado via `GITHUB_TOKEN`

## Testes e validacoes

Validacoes do workspace:

```bash
pnpm lint
pnpm typecheck
pnpm test
```

Validacoes uteis do backend:

```bash
pnpm --filter @forgeops/backend prisma:validate
pnpm --filter @forgeops/backend prisma:generate
```

## Estrutura de documentacao

- [CONTRIBUTING.md](CONTRIBUTING.md)
- [docs/architecture/](docs/architecture/)
- [docs/guides/](docs/guides/)
- [docs/workflows/](docs/workflows/)
- [docs/adr/](docs/adr/)

## Licenca

Este projeto esta licenciado sob a [MIT License](LICENSE).

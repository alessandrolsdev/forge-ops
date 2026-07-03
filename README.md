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

O projeto esta em evolucao incremental orientada por milestone. A base atual ja cobre:

- `Repository Registry`
- `Workflow Catalog`
- `Workflow Runs Visibility`
- `Pull Request Insights` com detalhe enriquecido e review insights agregados
- `Policy Engine` (avaliacao persistida de padroes minimos por repositorio)
- `Automation Health` (score 0-100 por repositorio + dashboard)
- `Audit & Sync` (trilha de sync events)
- distribuicao standalone via `@forgeops/cli` e composite action de review

## Comece em 2 minutos (sem servidor, sem OAuth)

Dentro de qualquer repositorio:

```bash
npx @forgeops/cli init \
  --openrouter-key <sua-chave> \
  --openrouter-model anthropic/claude-sonnet-4.5

npx @forgeops/cli score      # health score no terminal
npx @forgeops/cli dashboard  # dashboard local em http://127.0.0.1:4400
```

O `init` cria `.github/workflows/forgeops.yml`, pre-configura o Vitest com gate
de cobertura quando ausente e grava as credenciais de review via `gh` CLI.
A partir dai:

- todo pull request recebe um comentario com o **automation health score**;
- comentar **`@forgeops review`** em um PR dispara o **review por IA**
  (OpenRouter com fallback Gemini), publicado como comentario advisory pela
  composite action `alessandrolsdev/forge-ops/.github/actions/forgeops-review`.

O modo servidor (backend + frontend deste monorepo) continua disponivel para
governanca centralizada de multiplos repositorios.

## Visao geral da arquitetura

ForgeOps segue uma arquitetura de monorepo com fronteiras explicitas:

- `frontend/`
  interface web em Next.js 15 + React 19
- `backend/`
  API Fastify com TypeScript strict, Prisma e integracoes com GitHub
- `packages/core/`
  motor puro do framework (sinais de politica, formula do score, scanner local)
- `packages/cli/`
  CLI `forgeops` (init, score, dashboard local) distribuida via NPM
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
3. O fluxo automatico tenta gerar um review complementar via OpenRouter.
4. Se o caminho principal nao produzir um review utilizavel, entra o fallback via Gemini 2.5 Flash.
5. Cada provider automatico tem um retry unico antes de o workflow passar para o proximo fallback.
6. Se nenhum provider produzir conteudo publicavel, o workflow publica um comentario advisory explicando o motivo observado.
7. O comentario final do fluxo automatico sai sempre via `GITHUB_TOKEN`, preservando o bot como autor.
8. O Codex fica reservado para o fluxo manual premium via `label codex-review`, com comentario publicado como usuario real quando `CODEX_REVIEW_PAT` estiver valido.

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

### 2. Configurar ambiente

Use `.env.example` como base:

```bash
cp .env.example .env
```

Variaveis locais principais:

- `FORGEOPS_PROXY_PORT`
- `TRAEFIK_DOCKER_PROVIDER_ENABLED`
- `TRAEFIK_DOCKER_PROVIDER_ENDPOINT`
- `PORT`
- `DATABASE_URL`
- `REDIS_URL`
- `NEXT_PUBLIC_API_BASE_URL`
- `GITHUB_APP_ID`
- `GITHUB_APP_INSTALLATION_ID`
- `GITHUB_APP_PRIVATE_KEY`
- `GITHUB_APP_WEBHOOK_SECRET`

No modo Docker, `docker-compose.yml` sobrescreve `DATABASE_URL` e `REDIS_URL` para usar service discovery. O frontend containerizado deriva `NEXT_PUBLIC_API_BASE_URL` a partir de `FORGEOPS_PROXY_PORT`, mantendo `http://api.forgeops.local` quando a porta publicada e `80` e adicionando `:<porta>` quando o proxy local usa outra porta. O `.env` continua servindo como modo legado para execucao direta fora de containers.

Configuracao do proxy local:

- `TRAEFIK_DOCKER_PROVIDER_ENABLED=false`
  mantem o modo estavel usando apenas `file provider`
- `TRAEFIK_DOCKER_PROVIDER_ENABLED=true`
  liga o `docker provider` em modo experimental, sem remover o fallback atual
- `TRAEFIK_DOCKER_PROVIDER_ENDPOINT`
  endpoint do Docker usado no preflight do provider experimental

### 3. Configurar hosts locais

Adicione estas entradas no arquivo de hosts do sistema operacional:

```text
127.0.0.1 forgeops.local
127.0.0.1 api.forgeops.local
```

No Windows, o arquivo fica em:

```text
C:\Windows\System32\drivers\etc\hosts
```

### 4. Subir ambiente containerizado

Fluxo recomendado:

```bash
docker compose up --build
```

Servicos esperados:

- frontend: `http://forgeops.local` quando `FORGEOPS_PROXY_PORT=80`, ou `http://forgeops.local:<porta>` quando a porta publicada for diferente
- backend: `http://api.forgeops.local` quando `FORGEOPS_PROXY_PORT=80`, ou `http://api.forgeops.local:<porta>` quando a porta publicada for diferente
- proxy reverso: porta `80` apenas

PostgreSQL e Redis permanecem acessiveis apenas na rede Docker durante o uso normal da aplicacao.

Se a porta `80` ja estiver ocupada por outra stack local, ajuste apenas `FORGEOPS_PROXY_PORT` no `.env`. O roteamento continua o mesmo, muda apenas a porta publicada pelo proxy, e o frontend containerizado passa a embutir a base URL correta da API no bundle local.

### 4.1 Provider do Traefik: estavel vs. experimental

Modo padrao:

- `file provider` ativo
- `docker provider` desligado
- roteamento principal estavel em `forgeops.local` e `api.forgeops.local`

Modo experimental:

- manter `file provider` ativo
- definir `TRAEFIK_DOCKER_PROVIDER_ENABLED=true`
- o proxy tenta habilitar o `docker provider` sem afetar as rotas principais
- se houver falha de socket, API ou descoberta, o sistema continua funcional com `file provider`

Hosts experimentais do `docker provider`:

- `docker-frontend.forgeops.local`
- `docker-api.forgeops.local`

Esses hosts nao sao necessarios para o fluxo normal. Eles existem para validar a descoberta do provider experimental sem competir com as rotas estaveis.

### 5. Rodar o monorepo sem Docker

```bash
docker compose up -d postgres redis
pnpm dev
```

Nesse modo legado, os servicos esperados continuam:

- frontend: `http://localhost:3000`
- backend: `http://localhost:3333`

### 6. Preparar Prisma

```bash
pnpm --filter @forgeops/backend prisma:generate
```

## Variaveis de ambiente para o workflow Codex Review

O `codex-review` usa configuracao de GitHub Actions, nao o `.env` local da aplicacao. As variaveis e segredos mais importantes sao:

- `CODEX_REVIEW_PAT`
  secret opcional para publicar a solicitacao manual de `@codex review` como usuario real
- `OPENROUTER_API_KEY`
  secret para o provider automatico primario
- `OPENROUTER_MODEL`
  repository variable preferencial para o modelo da OpenRouter
- `GEMINI_API_KEY`
  secret preferencial para o fallback automatico via Gemini 2.5 Flash
- `GOOGLE_API_KEY`
  alias aceito para o fallback automatico via Gemini 2.5 Flash
- `GEMINI_MODEL`
  repository variable opcional; sem definicao explicita o workflow usa `gemini-2.5-flash`

Observacoes:

- o fluxo automatico nao chama mais `@codex review`
- por compatibilidade operacional, o workflow ainda aceita `CODEX_REVIEW_OPENROUTER_MODEL` como alias legado
- sem `CODEX_REVIEW_PAT`, o fluxo automatico continua funcionando e comentando como bot; apenas o gatilho manual do Codex fica indisponivel

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

Documentacao do ambiente local e do fallback do proxy:

- [docs/architecture/current.md](docs/architecture/current.md)
- [docs/architecture/local-dev-proxy.md](docs/architecture/local-dev-proxy.md)

## Licenca

Este projeto esta licenciado sob a [MIT License](LICENSE).

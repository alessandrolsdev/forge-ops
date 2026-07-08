# Changelog

Todas as mudancas relevantes deste projeto sao documentadas neste arquivo.

O formato segue o [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e o projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

## [Unreleased]

### Adicionado

- Pacote `@forgeops/core`: motor puro do framework extraido do backend (sinais de politica, formula do automation health score e scanner local de workflows que computa os sinais 100% offline a partir de `.github/workflows`). Fonte unica das regras consumida pelo backend, pelo CLI e pelas automacoes.
- Pacote `@forgeops/cli` (bin `forgeops`): `forgeops init` scaffolda o workflow `forgeops.yml` (health score em PRs + gatilho por comentario `@forgeops review`), pre-configura o Vitest com gate de cobertura quando ausente e grava credenciais de review via `gh` CLI; `forgeops score` calcula o health score do repositorio local (terminal, `--json`, `--markdown`, e `--github` para job summary + comentario de PR); `forgeops dashboard` sobe o painel local leve em `http://127.0.0.1:4400` sem servidor nem OAuth.
- Composite action `forgeops-review` (`.github/actions/forgeops-review`): review de pull request por IA (OpenRouter com fallback Gemini) reutilizavel por qualquer repositorio, suportando eventos `pull_request` e `issue_comment` (gatilho `@forgeops review`), com prompts embarcados, upsert de comentario advisory e degradacao explicita quando nenhum provider esta configurado. O proprio repositorio escuta o gatilho via `forgeops-mention.yml`.
- Workflow reutilizavel `reusable-node-checks.yml` (`workflow_call`) consumido por `lint.yml` e `typecheck.yml`, e workflow `security.yml` rodando `pnpm audit --prod --audit-level high` em PRs, pushes e agendamento semanal. Com isso os seis sinais de politica do proprio repositorio ficam compliant.
- Workflow `release.yml`: publica `@forgeops/core` e `@forgeops/cli` no npm ao enviar uma tag `v*`, com validacao de versao, build na ordem correta e testes antes de publicar. Metadados de publicacao (`publishConfig`, `repository`, `README`) e guia `docs/guides/publishing.md` adicionados.

### Alterado

- `fastify` atualizado para 5.x (opcao `logger` do servidor migrada para `loggerInstance`), `next` para 15.5.x e overrides de pnpm para `fast-uri`, `defu` e `effect`, reduzindo o `pnpm audit --prod --audit-level high` de 15 vulnerabilidades altas para 4 moderadas (transitivas em tooling de desenvolvimento).

- Policy Engine: entidade `PolicyCheck` persistida por repositorio e chave de politica, com avaliacao sob demanda de seis padroes minimos (CI, lint, testes, review automatizado, reusable workflows e seguranca) em `POST /api/v1/repositories/:id/policy-checks/evaluate` e leitura em `GET /api/v1/repositories/:id/policy-checks`. As regras vivem na funcao pura `evaluatePolicySignals`, compartilhada com o automation health.
- Automation Health: score deterministico de 0 a 100 por repositorio calculado sob demanda a partir dos dados sincronizados (sinais de politica com 75 pontos, confiabilidade dos ultimos 20 workflow runs completados com 25 pontos e penalidade de ate 15 pontos por blockers do Codex em PRs abertas), com grades `healthy`/`attention`/`critical`, overview em `GET /api/v1/automation-health` e detalhe em `GET /api/v1/repositories/:id/automation-health`.
- Review Insights: agregacao dos reviews do Codex por repositorio (PRs abertas e revisadas, blockers em aberto, totais de blockers/riscos/sugestoes e data do ultimo review) em `GET /api/v1/repositories/:id/review-insights`.
- Audit & Sync: entidade `SyncEvent` e porta `SyncEventRecorder` gravando trilha best-effort de sincronizacoes (workflows, runs, pull requests, codex review, conexao de repositorio e avaliacao de politicas) exposta em `GET /api/v1/repositories/:id/sync-events`.
- Dashboard de automation health na rota `/` do frontend: cards por repositorio com score, badge de grade, checklist de sinais, confiabilidade de CI, penalidade por blockers e drill-down com policy checks e reavaliacao sob demanda.
- Secao de governanca no detalhe do repositorio (frontend): resumo de review insights e trilha de sync events.
- Seis novos metodos tipados no api client do frontend com schemas Zod espelhando os contratos do backend.
- Harness de testes de integracao com PostgreSQL real: convencao `*.integration.test.ts`, config Vitest dedicada, helper com reset de banco e service container `postgres:17-alpine` no workflow de testes do CI.

### Alterado

- `pnpm test` passa a exigir cobertura minima de 80% (lines/functions/statements) em backend e frontend via `@vitest/coverage-v8`.
- O workflow `test.yml` aplica as migrations e executa a suite de integracao contra PostgreSQL apos os testes unitarios.
- `docs/architecture/current.md` atualizado para refletir os modulos, rotas e modelos entregues (corrigido drift sobre o detalhe de pull request e o estado da Review Intelligence).

### Removido

- Placeholder institucional da Home do frontend (`home-view.tsx`), substituido pelo dashboard de automation health.

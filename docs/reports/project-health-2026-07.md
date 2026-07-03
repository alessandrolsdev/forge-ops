# ForgeOps - Relatorio de Saude do Projeto

> Gerado em: 2026-07-03 | Escopo: fechamento do backlog do MVP (Epics 0-4)

Este relatorio aplica ao proprio ForgeOps a mesma leitura de saude que o framework calcula para os repositorios monitorados: sinais de automacao, confiabilidade da suite e divida tecnica conhecida.

---

## Resumo executivo

Todos os modulos previstos no blueprint do produto (`PROJECT.md`) foram entregues ou tem baseline funcional:

| Epic                            | Status                      |
| ------------------------------- | --------------------------- |
| Epic 0 - Monorepo foundation    | completo                    |
| Epic 1 - Repository integration | completo                    |
| Epic 2 - Workflow visibility    | completo                    |
| Epic 3 - Pull request insights  | completo para o slice atual |
| Epic 4 - Automation health      | completo para o slice atual |

Entregas desta rodada: Policy Engine, Automation Health (score + dashboard), Review Insights agregados, Audit & Sync (SyncEvent), testes de integracao contra PostgreSQL real no CI e gate de cobertura de 80%.

---

## Score do ForgeOps pela propria formula

Aplicando os seis sinais do policy engine ao proprio repositorio:

| Sinal (policyKey)           | Peso | Status        | Evidencia                                                                                             |
| --------------------------- | ---- | ------------- | ----------------------------------------------------------------------------------------------------- |
| `ci_workflow_present`       | 15   | compliant     | 7 workflows ativos em `.github/workflows/`                                                            |
| `lint_workflow_present`     | 10   | compliant     | `lint.yml`                                                                                            |
| `test_workflow_present`     | 15   | compliant     | `test.yml` (unit + coverage gate + integracao com Postgres)                                           |
| `automated_review_present`  | 15   | compliant     | `codex-review.yml` + `manual-codex-review.yml`                                                        |
| `reusable_workflow_present` | 10   | non_compliant | nenhum reusable workflow registrado                                                                   |
| `security_workflow_present` | 10   | non_compliant | sem workflow de seguranca dedicado (`actionlint` nao casa com os keywords security/codeql/audit/scan) |

Sinais: **55/75** (medido com `forgeops score` rodando o proprio motor contra este repositorio). Somando confiabilidade de CI (suite local integralmente verde no fechamento: 25/25) e sem blockers abertos (penalidade 0):

**Score: 80/100 - grade `healthy`.**

Gap declarado: adotar um reusable workflow e um scanner de seguranca dedicado (CodeQL/audit) levaria o score a 100.

---

## Cobertura de testes

Medida com `@vitest/coverage-v8` sobre o codigo de produto (`src/**`, excluindo testes e declaracoes), com threshold de 80% para lines/functions/statements aplicado em `pnpm test`:

| Pacote   | Lines | Functions | Statements | Arquivos de teste                                |
| -------- | ----- | --------- | ---------- | ------------------------------------------------ |
| backend  | 92.2% | 94.0%     | 92.2%      | 31 unit + 4 suites de integracao (Postgres real) |
| frontend | 89.4% | 84.6%     | 89.4%      | 9                                                |

Camadas de validacao no CI:

1. `lint.yml` - ESLint (zero `any` bloqueante)
2. `typecheck.yml` - TypeScript strict
3. `test.yml` - Vitest unit com gate de cobertura de 80% + migrations e testes de integracao contra `postgres:17-alpine`
4. `actionlint.yml` - validacao dos workflows
5. `codex-review.yml` - review automatizado advisory

---

## Divida tecnica identificada

| Item                                         | Severidade | Descricao                                                                                       | Direcao sugerida                                                       |
| -------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Auth de operador provisoria                  | media      | token colado manualmente e persistido em `localStorage`; sem fluxo de login                     | fluxo dedicado de autenticacao de operador                             |
| Vinculo PullRequest x WorkflowRun em memoria | baixa      | detalhe de PR casa runs por `headBranch` + timestamp, nao ha FK no schema                       | modelar relacao quando o volume justificar                             |
| Redis provisionado sem uso                   | baixa      | `docker-compose.yml` sobe Redis 7.4, nenhuma feature o consome                                  | remover do compose ou adotar para cache/fila quando houver caso real   |
| Overview de health com N+1                   | baixa      | `GET /api/v1/automation-health` calcula score por repositorio sequencialmente                   | interface de repository ja isola a otimizacao (query agrupada)         |
| Sinais de politica por keyword               | media      | deteccao de lint/test/security por substring em name/path pode gerar falsos positivos/negativos | evoluir para configuracao explicita por repositorio (Policy Engine v2) |
| Contadores de review por regex               | media      | blockers/sugestoes/riscos extraidos por regex do comentario do Codex                            | classificacao estruturada (Review Intelligence pleno)                  |
| E2E (Playwright) inexistente                 | baixa      | validacao ponta a ponta ainda e manual/documental                                               | suite E2E sobre o fluxo operador apos o fluxo de auth                  |
| Settings placeholder                         | baixa      | rota existe sem experiencia real                                                                | construir junto do fluxo de auth                                       |

---

## Como reproduzir as medicoes

```bash
pnpm install
pnpm lint && pnpm typecheck
pnpm test                                   # unit + gate de cobertura 80%
docker compose up -d postgres
DATABASE_URL=postgresql://forgeops:forgeops@localhost:5432/forgeops \
  pnpm --prefix backend run prisma:migrate:deploy
DATABASE_URL=postgresql://forgeops:forgeops@localhost:5432/forgeops \
  pnpm --prefix backend run test:integration
```

O score de qualquer repositorio monitorado (incluindo um ForgeOps auto-monitorado) fica disponivel em `GET /api/v1/automation-health` e no dashboard da rota `/` do frontend.

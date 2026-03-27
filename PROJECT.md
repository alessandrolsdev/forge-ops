# ForgeOps — Project Blueprint

## Visão do Produto
ForgeOps é uma plataforma centralizada para governança de automações de engenharia de software.

O objetivo é fornecer uma interface única para visualizar, monitorar e evoluir automações ligadas a:
- GitHub Actions
- Pull Requests
- Code reviews automatizados com Codex
- pipelines de CI/CD
- políticas mínimas de qualidade e segurança por repositório

ForgeOps deve permitir que um engenheiro ou tech lead entenda rapidamente:
- quais automações existem
- onde estão falhando
- quais repositórios estão aderentes ao padrão
- quais PRs possuem riscos relevantes
- quais melhorias de automação devem ser feitas a seguir

---

## Objetivos do MVP
O MVP deve permitir:

1. Conectar e listar repositórios monitorados
2. Listar workflows e reusable workflows por repositório
3. Visualizar workflow runs, jobs e status
4. Visualizar PRs relevantes e reviews automatizados do Codex
5. Exibir uma visão de saúde por repositório
6. Exibir falhas recentes e sinais de risco operacional
7. Servir como base para automações futuras e governança de engenharia

---

## Não objetivos do MVP
Ficam fora do MVP:
- editor visual de YAML
- criação automática de workflows por IA
- gestão completa de deploy
- billing multi-tenant
- controle fino de permissões por organização complexa
- observabilidade profunda de infraestrutura cloud
- execução arbitrária de comandos remotos em repositórios

---

## Proposta de valor
ForgeOps transforma automações espalhadas e invisíveis em um sistema governável.

Problemas que queremos resolver:
- falta de visão central sobre automações
- dificuldade em rastrear falhas recorrentes
- reviews inconsistentes
- ausência de padrão entre repositórios
- baixa visibilidade de risco técnico e operacional

---

## Usuários principais

### 1. Engenheiro individual
Quer saber:
- por que o workflow falhou
- se o PR está pronto para merge
- quais checks faltam

### 2. Tech lead / Staff engineer
Quer saber:
- quais repositórios estão fora do padrão
- onde há risco recorrente
- quais automações faltam

### 3. Time de plataforma / DevEx
Quer saber:
- adoção de reusable workflows
- saúde global da automação
- onde atuar primeiro

---

## Arquitetura de alto nível

### Monorepo
O projeto será um monorepo com duas aplicações principais:
- `frontend` — para a aplicação web
- `backend` — para a API e serviços

E pacotes compartilhados:
- `packages/ui`
- `packages/types`
- `packages/config`
- `packages/eslint-config`
- `packages/tsconfig`

Estrutura sugerida:

```text
.
├── frontend/
├── backend/
├── packages/
│   ├── ui/
│   ├── types/
│   ├── config/
│   ├── eslint-config/
│   └── tsconfig/
├── docs/
│   ├── adr/
│   ├── architecture/
│   └── plans/
├── .github/
│   ├── workflows/
│   ├── ISSUE_TEMPLATE/
│   └── pull_request_template.md
├── AGENTS.md
├── PROJECT.md
└── package.json
```

---

## Stack proposta

### Frontend
- Next.js
- React
- TypeScript strict
- Tailwind CSS
- shadcn/ui
- TanStack Query
- Zod
- React Hook Form

### Backend
- Node.js
- TypeScript strict
- Fastify
- Prisma
- PostgreSQL
- Redis
- Zod
- BullMQ ou equivalente para jobs

### Infra / DevEx
- Turborepo
- pnpm
- Docker
- GitHub Actions
- OpenAI Codex workflows
- Vitest / Jest
- Playwright no futuro
- ESLint + Prettier

---

## Módulos principais

### 1. Repository Registry

Responsável por:
- cadastrar repositórios
- armazenar metadados
- vincular integração GitHub
- definir status de monitoramento

### 2. Workflow Catalog

Responsável por:
- listar workflows por repositório
- distinguir workflows locais e reutilizáveis
- armazenar metadata de gatilhos e propósito

### 3. Workflow Runs

Responsável por:
- sincronizar workflow runs
- armazenar status, duração, jobs e falhas
- permitir filtros e histórico

### 4. Pull Request Insights

Responsável por:
- associar PRs aos workflows
- mostrar status de checks
- exibir revisões automáticas do Codex
- destacar PRs problemáticos

### 5. Review Intelligence

Responsável por:
- classificar observações do Codex
- separar bloqueantes, melhorias e riscos
- resumir padrões recorrentes

### 6. Automation Health

Responsável por:
- score por repositório
- presença ou ausência de padrões mínimos
- indicadores como:
  - CI
  - lint
  - testes
  - review automatizada
  - reusable workflows
  - segurança básica

### 7. Policy Engine

Responsável por:
- comparar o repositório com os padrões internos
- detectar ausência de automações essenciais
- exibir gaps

### 8. Audit & Sync

Responsável por:
- trilha de auditoria interna
- logs de sincronização
- retries e consistência

---

## Modelo de domínio inicial

### Repository
- `id`
- `githubRepoId`
- `owner`
- `name`
- `fullName`
- `defaultBranch`
- `isActive`
- `createdAt`
- `updatedAt`

### Workflow
- `id`
- `repositoryId`
- `githubWorkflowId`
- `name`
- `path`
- `state`
- `sourceType` (local, reusable)
- `createdAt`
- `updatedAt`

### WorkflowRun
- `id`
- `workflowId`
- `githubRunId`
- `status`
- `conclusion`
- `branch`
- `sha`
- `event`
- `startedAt`
- `finishedAt`
- `durationMs`

### WorkflowJob
- `id`
- `workflowRunId`
- `githubJobId`
- `name`
- `status`
- `conclusion`
- `startedAt`
- `finishedAt`

### PullRequest
- `id`
- `repositoryId`
- `githubPrId`
- `number`
- `title`
- `state`
- `author`
- `baseBranch`
- `headBranch`
- `createdAt`
- `updatedAt`

### CodexReview
- `id`
- `pullRequestId`
- `source` (github_review, workflow_comment)
- `summary`
- `blockersCount`
- `suggestionsCount`
- `risksCount`
- `rawContent`
- `createdAt`

### PolicyCheck
- `id`
- `repositoryId`
- `policyKey`
- `status`
- `details`
- `checkedAt`

### SyncEvent
- `id`
- `repositoryId`
- `type`
- `status`
- `details`
- `createdAt`

---

## Fluxos principais do MVP

### Fluxo 1 — Sincronização de repositório
1. Repositório é conectado
2. Backend consulta GitHub
3. Workflows são catalogados
4. Workflow runs recentes são sincronizados
5. Dashboard exibe estado atual

### Fluxo 2 — Visualização de falha
1. Usuário abre um workflow run falho
2. Visualiza jobs e status
3. Visualiza metadados do PR relacionado, se existir
4. Visualiza sinais resumidos de falha

### Fluxo 3 — PR review visibility
1. Usuário abre lista de PRs
2. Vê checks, status e reviews do Codex
3. Vê bloqueantes, melhorias e riscos
4. Prioriza atuação

### Fluxo 4 — Saúde do repositório
1. Usuário abre a página de um repo
2. ForgeOps calcula score de automação
3. Exibe gaps contra padrão mínimo
4. Sugere próximos passos

---

## Riscos técnicos iniciais

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Limites de API do GitHub | Média | Alto | cache, sync incremental, retries |
| Modelo de dados incompleto para todos os cenários de Actions | Média | Médio | começar com core entities e evoluir |
| Acoplamento excessivo ao formato atual do GitHub | Média | Médio | adapters e camada de integração |
| Regras de review do Codex inconsistentes entre repos | Alta | Alto | padronizar prompts e policy engine |
| Crescimento de complexidade cedo demais | Alta | Alto | escopo rígido de MVP |
| Painel virar "apenas observabilidade sem ação" | Média | Médio | exibir recomendações claras |

---

## Requisitos não funcionais

### Segurança
- segredos nunca expostos no frontend
- uso seguro de tokens
- validação de entrada em todas as bordas
- logs sem dados sensíveis
- trilha de auditoria de sync e ações relevantes

### Qualidade
- TypeScript strict
- zero `any`
- testes unitários em lógica de negócio
- lint e typecheck obrigatórios
- PR template e workflows de qualidade desde o início

### Manutenibilidade
- separação clara entre apps e packages
- interfaces explícitas entre camadas
- sem dependências desnecessárias
- evitar abstrações antes da necessidade real

### Performance
- sync incremental
- paginação em listas
- cache em consultas repetidas
- consultas eficientes em PostgreSQL

---

## Convenções arquiteturais

### Backend

Padrão de camadas:
- route/controller
- service/use case
- repository
- provider/client externo

### Frontend

Padrão por feature:
- app / rotas
- components
- hooks
- queries
- schemas
- types

### Shared packages
- `packages/ui` para componentes compartilháveis
- `packages/types` para contratos comuns
- `packages/config` para config compartilhada

---

## Estratégia de planejamento

Toda feature relevante deve passar por:
- leitura de `AGENTS.md`
- leitura deste `PROJECT.md`
- uso de `architecture-planning`
- quebra em issues com `github-workflow`
- implementação por issue
- revisão com `secure-pr-checklist`

Para trabalho longo, criar ou atualizar documento em `docs/plans/`.

---

## Backlog inicial sugerido

### Epic 0 — Monorepo foundation
- bootstrap do monorepo
- setup pnpm + turbo
- frontend e backend
- packages compartilhados
- lint, typecheck, test
- Docker base
- GitHub Actions base

### Epic 1 — Repository integration
- conectar repositórios GitHub
- sincronizar metadados básicos
- persistir repositórios

### Epic 2 — Workflow visibility
- listar workflows
- listar workflow runs
- detalhe de run e jobs

### Epic 3 — Pull request insights
- listar PRs
- vincular PR a checks
- exibir reviews do Codex

### Epic 4 — Automation health
- score do repositório
- policy checks
- gaps e recomendações

---

## Definition of Done do projeto

Uma entrega só está concluída quando:

- [ ] comportamento implementado
- [ ] testes relevantes criados/atualizados
- [ ] lint e typecheck passando
- [ ] sem segredos hardcoded
- [ ] sem mudança fora do escopo
- [ ] documentação essencial atualizada
- [ ] PR pronto para revisão
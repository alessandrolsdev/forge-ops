# @forgeops/core

Motor puro do [ForgeOps](https://github.com/alessandrolsdev/forge-ops): as
funcoes que calculam a saude de automacao de um repositorio, sem dependencia de
HTTP, banco ou framework.

## Instalacao

```bash
npm install @forgeops/core
```

## API

### `evaluatePolicySignals(input)`

Avalia os seis sinais de politica minima (CI, lint, testes, review automatizado,
reusable workflows e seguranca) a partir da lista de workflows do repositorio.

```ts
import { evaluatePolicySignals } from '@forgeops/core';

const signals = evaluatePolicySignals({
  workflows: [
    {
      name: 'CI',
      path: '.github/workflows/ci.yml',
      state: 'active',
      sourceType: 'local',
    },
  ],
  reviewedPullRequestCount: 3,
});
```

### `computeAutomationHealthScore(input)`

Calcula o score deterministico de 0 a 100: sinais de politica (75 pontos),
confiabilidade dos runs recentes de CI (25 pontos, excluindo `skipped`/`neutral`)
e penalidade de ate 15 pontos por blockers de review em pull requests abertas.

```ts
import { computeAutomationHealthScore } from '@forgeops/core';

const { score, grade, signals } = computeAutomationHealthScore({
  workflows,
  recentRunConclusions: ['success', 'failure', 'success'],
  reviewedPullRequests: [{ blockersCount: 1, isOpen: true }],
});
// grade: 'healthy' | 'attention' | 'critical'
```

### `scanLocalWorkflows(repositoryDir)`

Le `.github/workflows` do filesystem e retorna os workflows no formato aceito
por `evaluatePolicySignals` — permite calcular os sinais 100% offline.

## Licenca

MIT

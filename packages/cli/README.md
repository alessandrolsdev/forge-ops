# @forgeops/cli

CLI do [ForgeOps](https://github.com/alessandrolsdev/forge-ops): leva o health
score e o review por IA para qualquer repositorio, sem servidor e sem OAuth.

## Uso rapido

```bash
# Configura o repositorio: workflow de review + health, Vitest e credenciais
npx @forgeops/cli init \
  --openrouter-key <sua-chave> \
  --openrouter-model anthropic/claude-sonnet-4.5

# Health score do repositorio atual
npx @forgeops/cli score

# Dashboard local em http://127.0.0.1:4400
npx @forgeops/cli dashboard
```

## Comandos

| Comando              | Descricao                                                                                                                                                                                                           |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `forgeops init`      | Cria `.github/workflows/forgeops.yml` (health score em PRs + gatilho por comentario `@forgeops review`), pre-configura o Vitest com gate de cobertura quando ausente e grava as credenciais de review via `gh` CLI. |
| `forgeops score`     | Calcula o automation health score do repositorio local. Flags: `--json`, `--markdown`, `--github` (publica no job summary e como comentario do PR).                                                                 |
| `forgeops dashboard` | Sobe o dashboard local de automation health. Flag: `--port <port>` (padrao 4400).                                                                                                                                   |

## Como o review funciona

Depois do `init`, comentar **`@forgeops review`** em um pull request dispara a
composite action `alessandrolsdev/forge-ops/.github/actions/forgeops-review`,
que roda o review com OpenRouter (fallback Gemini) e publica um comentario
advisory. As chaves ficam como secrets do proprio repositorio — nenhum dado sai
para um servidor do ForgeOps.

## Score offline

Dos 100 pontos do score, 75 sao computados 100% offline a partir de
`.github/workflows`. A confiabilidade de CI (25 pontos) requer um token do
GitHub (`GITHUB_TOKEN` ou `gh auth login`); sem ele, o score marca a parte de CI
como indisponivel e reporta apenas os sinais.

## Licenca

MIT

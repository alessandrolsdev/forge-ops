# Workflow `codex-review`

## Objetivo

O workflow `codex-review` adiciona uma camada advisory de revisao automatizada sobre pull requests para `main`, combinando:
- review automatizado por API de baixo custo
- fallback de provider
- fallback advisory transparente quando nenhum review util e produzido

## Quando dispara

Trigger:
- `pull_request`
- `pull_request_target`

Eventos:
- `opened`
- `synchronize`
- `reopened`
- `ready_for_review`

Restricoes:
- apenas para PRs contra `main`
- o review automatico nao roda para PR draft
- ignora PRs de fork

## Permissoes

Permissoes atuais:
- `contents: read`
- `issues: write`
- `pull-requests: read`

Esse conjunto permite:
- ler contexto do PR
- publicar comentarios
- manter o workflow com privilegio reduzido

## Variaveis e segredos usados

### Variaveis de repositorio

- `CODEX_REVIEW_ENABLED`
  liga ou desliga a automacao
- `OPENROUTER_MODEL`
  modelo preferencial da OpenRouter

Compatibilidade:
- `CODEX_REVIEW_OPENROUTER_MODEL` ainda e aceito como alias legado

### Secrets

- `CODEX_REVIEW_PAT`
  opcional, para o fluxo manual premium publicar `@codex review` como usuario real
- `OPENROUTER_API_KEY`
  provider automatico primario
- `GEMINI_API_KEY` ou `GOOGLE_API_KEY`
  provider automatico secundario

## Cadeia de fallback

O workflow segue esta ordem:

1. review automatizado via OpenRouter
2. retry unico na OpenRouter quando a resposta nao for publicavel
3. review automatizado via Gemini 2.5 Flash
4. retry unico no Gemini quando a resposta nao for publicavel
5. comentario advisory final

Comentario final do fluxo automatico:
- sempre via `GITHUB_TOKEN` como bot
- nunca chama o Codex

Fluxo manual premium:
- label `codex-review`
- botao no frontend do ForgeOps que aplica a mesma label
- comentario `@codex review` publicado como usuario real somente quando `CODEX_REVIEW_PAT` estiver valido

## Comportamento em fork PR

PRs de fork sao ignorados intencionalmente.

Motivo:
- nao expor automacao e secrets a contexto nao confiavel
- manter principio de menor privilegio

## Estrutura de alto nivel do job

1. Checkout do repositório
2. Skip de fork PR
3. Check de configuracao
4. Resolucao dos providers automaticos
5. Coleta do contexto do PR e diff
6. Tentativa via OpenRouter
7. Retry unico da OpenRouter, se necessario
8. Tentativa via Gemini
9. Retry unico do Gemini, se necessario
10. Publicacao do comentario final automatico
11. Quando a PR recebe a label `codex-review`, o job manual publica `@codex review` como usuario real

## O que o workflow publica

### Comentario automatico final

Pode publicar:
- review automatizado complementar
- comentario de readiness/advisory
- fallback explicando o motivo observado

### Trigger manual do Codex

Publica `@codex review` apenas quando:
- a PR recebe a label `codex-review`
- `CODEX_REVIEW_PAT` esta disponivel e valido
- o comentario precisa sair como usuario real

## Falhas esperadas e degradacao

O workflow e desenhado para degradar sem quebrar o PR:

- PAT ausente ou invalido
  o fluxo automatico continua e o trigger manual nao e publicado
- OpenRouter indisponivel ou sem resposta publicavel
  tenta retry unico e depois Gemini
- Gemini indisponivel ou sem resposta publicavel
  cai em fallback humano
- parse invalido, resposta vazia ou texto claramente nao publicavel
  avanca para o proximo provider ou advisory final

## Arquivos relacionados

- workflow principal: `.github/workflows/codex-review.yml`
- smoke coverage: `.github/workflows/codex-review-smoke.yml`
- prompt principal: `.github/prompts/codex-review.md`
- fallback message: `.github/prompts/codex-fallback.md`
- readiness message: `.github/prompts/codex-readiness.md`
- marker: `.github/prompts/codex-comment-marker.txt`

## Documentacao relacionada

- [Arquitetura do Codex Review](../architecture/codex-review.md)
- [Guia de debugging](../guides/debug-codex-review.md)

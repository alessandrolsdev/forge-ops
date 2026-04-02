# Workflow `codex-review`

## Objetivo

O workflow `codex-review` adiciona uma camada advisory de revisao automatizada sobre pull requests para `main`, combinando:
- comentario de trigger para o Codex
- tentativa de review automatizado por API
- fallback de provider
- comentario final transparente quando nenhum review util e produzido

## Quando dispara

Trigger:
- `pull_request`

Eventos:
- `opened`
- `synchronize`
- `reopened`
- `ready_for_review`

Restricoes:
- apenas para PRs contra `main`
- nao roda para PR draft
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
  opcional, para comentar como usuario real
- `OPENAI_API_KEY`
  provider principal de review automatizado
- `OPENROUTER_API_KEY`
  provider de fallback

## Cadeia de fallback

O workflow segue esta ordem:

1. comentario inicial `@codex review` como usuario real, se `CODEX_REVIEW_PAT` estiver disponivel
2. review automatizado via OpenAI
3. review automatizado via OpenRouter
4. comentario final de fallback humano

Comentario final:
- com PAT valido: como usuario real
- sem PAT valido: via `GITHUB_TOKEN` como bot

## Comportamento em fork PR

PRs de fork sao ignorados intencionalmente.

Motivo:
- nao expor automacao e secrets a contexto nao confiavel
- manter principio de menor privilegio

## Estrutura de alto nivel do job

1. Checkout do repositório
2. Skip de fork PR
3. Check de configuracao
4. Resolucao opcional do commenter autenticado
5. Coleta do contexto do PR e diff
6. Publicacao do trigger `@codex review`
7. Tentativa via OpenAI
8. Fallback via OpenRouter
9. Resolucao do resultado final
10. Publicacao do comentario final

## O que o workflow publica

### Trigger comment

Quando possivel, publica:
- `@codex review`
- instrucao de resposta em portugues do Brasil
- foco em arquitetura, riscos e testes

### Final comment

Pode publicar:
- review automatizado complementar
- comentario de readiness/advisory
- fallback explicando o motivo observado

## Falhas esperadas e degradacao

O workflow e desenhado para degradar sem quebrar o PR:

- PAT ausente ou invalido
  comentario final deve continuar
- OpenAI indisponivel
  tenta OpenRouter
- OpenRouter indisponivel
  cai em fallback humano
- parsing sem texto util
  publica comentario com motivo observado

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

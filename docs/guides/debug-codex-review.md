# Guia de Debugging do Codex Review

Este guia ajuda a diagnosticar falhas no workflow `codex-review`.

## Onde olhar primeiro

1. Abra a aba `Actions` no GitHub.
2. Selecione o workflow `Codex Review`.
3. Identifique o run correspondente ao PR.
4. Revise os steps nesta ordem:
   - `Check review configuration`
   - `Resolve commenter identity`
   - `Collect pull request context`
   - `Run automated review via OpenAI API`
   - `Run automated review via OpenRouter fallback`
   - `Resolve review result`
   - `Publish Codex review status`

## Perguntas de diagnostico

### O workflow disparou?

Confirme:
- o PR aponta para `main`
- o PR nao esta em draft
- nao se trata de fork

### O comentario inicial foi publicado?

Se o comentario `@codex review` nao apareceu como usuario real:
- verifique `CODEX_REVIEW_PAT`
- verifique o step `Resolve commenter identity`
- confirme que o PAT tem permissao suficiente para ler PRs e comentar em issues

### O comentario final apareceu?

Se nao apareceu:
- verifique o step `Publish Codex review status`
- confirme se houve erro de listagem, patch ou post de comentario
- confirme que o run nao foi cancelado antes do step final

## Como validar API keys

### OpenAI

Sinais de problema:
- HTTP 401
- HTTP 429
- payload com erro de quota

Conferencias:
- o secret `OPENAI_API_KEY` existe no repositório
- a chave possui quota ativa
- nao houve revogacao ou expiracao

### OpenRouter

Sinais de problema:
- `OPENROUTER_MODEL` vazio
- HTTP 401 ou 403
- payload com `.error`
- resposta sem `choices`

Conferencias:
- o secret `OPENROUTER_API_KEY` existe
- a variable `OPENROUTER_MODEL` existe
- o modelo configurado esta disponivel no provider

## Como interpretar logs do GitHub Actions

### `Check review configuration`

Mostra se o workflow detectou:
- `enabled`
- `pat_present`
- `openai_present`
- `openrouter_present`

Se `openrouter_present=false`, o fallback OpenRouter nao sera tentado.

### `Resolve commenter identity`

Verifique:
- status HTTP da chamada para `/user`
- se `available=true`
- se o login foi resolvido

Se `available=false`, o comentario final ainda deve cair para `GITHUB_TOKEN`.

### `Run automated review via OpenAI API`

Possiveis saidas:
- `status=completed`
- `status=failed`
- `status=no_usable_output`

### `Run automated review via OpenRouter fallback`

Possiveis saidas:
- `status=completed`
- `status=failed`
- `status=no_usable_output`

Os logs tambem costumam ajudar a distinguir:
- ausencia de `choices`
- ausencia de `message.content`
- payload de erro do provider

## Cenarios comuns

### `insufficient_quota`

Sinal:
- status HTTP 429 ou mensagem de quota insuficiente

Leitura:
- autenticacao pode estar correta
- o problema e billing/quota do provider

Acao:
- renovar quota
- usar provider alternativo
- confirmar se o comentario final reportou o motivo observado

### PAT invalido

Sinais:
- `Resolve commenter identity` nao encontra login
- comentario inicial como usuario nao aparece

Comportamento esperado:
- o comentario final ainda deve ser publicado como bot

Se isso nao ocorrer, o problema esta no path final de publicacao.

### Parsing vazio

Sinais:
- `status=no_usable_output`
- logs mostrando payload sem texto publicavel

Acao:
- revisar prompt versionado em `.github/prompts/`
- revisar parsing no workflow
- verificar se o provider mudou o shape da resposta

## Ordem pratica de triagem

1. Confirmar que o workflow realmente disparou.
2. Confirmar que o PR nao era fork nem draft.
3. Verificar configuracao detectada no step inicial.
4. Verificar se OpenAI respondeu.
5. Verificar se OpenRouter respondeu.
6. Confirmar se o comentario final foi publicado.
7. Validar se o motivo observado no comentario final bate com os logs.

## Documentacao relacionada

- [Arquitetura do Codex Review](../architecture/codex-review.md)
- [Workflow do Codex Review](../workflows/codex-review.md)

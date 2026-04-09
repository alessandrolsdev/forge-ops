# Guia de Debugging do Codex Review

Este guia ajuda a diagnosticar falhas no workflow `codex-review`.

## Onde olhar primeiro

1. Abra a aba `Actions` no GitHub.
2. Selecione o workflow `Codex Review`.
3. Identifique o run correspondente ao PR.
4. Revise os steps nesta ordem:
   - `Check review configuration`
   - `Collect pull request context`
   - `Run automated review via OpenRouter`
   - `Run automated review via Gemini fallback`
   - `Resolve review result`
   - `Publish review status`

Se o gatilho manual premium foi acionado por label, revise:
- `Check manual review configuration`
- `Resolve commenter identity`
- `Publish manual Codex trigger comment as maintainer`

## Perguntas de diagnostico

### O workflow disparou?

Confirme:
- o PR aponta para `main`
- o PR nao esta em draft
- nao se trata de fork
- no fluxo manual, a label aplicada foi exatamente `codex-review`

### O comentario automatico final apareceu?

Se nao apareceu:
- verifique o step `Publish review status`
- confirme se houve erro de listagem, patch ou post de comentario
- confirme que o run nao foi cancelado antes do step final

### O comentario manual `@codex review` apareceu?

Se o comentario manual nao apareceu como usuario real:
- verifique `CODEX_REVIEW_PAT`
- verifique o step `Resolve commenter identity`
- confirme que o PAT tem permissao suficiente para ler PRs e comentar em issues

## Como validar API keys

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

### Gemini

Sinais de problema:
- HTTP 401 ou 403
- payload com `.error`
- resposta sem `candidates`
- `GEMINI_API_KEY` e `GOOGLE_API_KEY` ausentes

Conferencias:
- o secret `GEMINI_API_KEY` ou `GOOGLE_API_KEY` existe
- a variable `GEMINI_MODEL` esta valida quando definida
- o modelo configurado esta disponivel no provider

## Como interpretar logs do GitHub Actions

### `Check review configuration`

Mostra se o workflow detectou:
- `enabled`
- `openrouter_present`
- `gemini_present`

Se ambos forem `false`, o workflow cai direto em comentario advisory.

### `Run automated review via OpenRouter`

Possiveis saidas:
- `status=completed`
- `status=failed`

Os logs distinguem:
- erro de chamada
- HTTP nao-2xx
- payload sem conteudo publicavel
- retry unico antes do fallback

### `Run automated review via Gemini fallback`

Possiveis saidas:
- `status=completed`
- `status=failed`

Os logs distinguem:
- erro de chamada
- HTTP nao-2xx
- payload sem `candidates`
- retry unico antes do advisory final

### `Resolve commenter identity`

Verifique:
- status HTTP da chamada para `/user`
- se `available=true`
- se o login foi resolvido

Se `available=false`, o fluxo manual premium nao conseguira publicar `@codex review`.

## Cenarios comuns

### OpenRouter indisponivel

Sinais:
- erro de rede
- HTTP 401, 403 ou 429
- payload com `.error`

Comportamento esperado:
- retry unico
- fallback para Gemini

### Gemini indisponivel

Sinais:
- erro de rede
- HTTP 401, 403 ou 429
- payload com `.error`

Comportamento esperado:
- retry unico
- comentario advisory final se OpenRouter tambem nao tiver produzido review

### PAT invalido

Sinais:
- `Resolve commenter identity` nao encontra login
- comentario manual `@codex review` nao aparece como usuario real

Comportamento esperado:
- o fluxo automatico continua publicando como bot
- apenas o gatilho manual premium fica indisponivel

### Parsing vazio

Sinais:
- logs mostrando payload sem texto publicavel
- transicao para retry unico e depois para o fallback seguinte

Acao:
- revisar prompt versionado em `.github/prompts/`
- revisar parsing no workflow
- verificar se o provider mudou o shape da resposta

## Ordem pratica de triagem

1. Confirmar que o workflow realmente disparou.
2. Confirmar que o PR nao era fork nem draft.
3. Verificar configuracao detectada no step inicial.
4. Verificar se OpenRouter respondeu e se houve retry.
5. Verificar se Gemini respondeu e se houve retry.
6. Confirmar se o comentario final foi publicado pelo bot.
7. Se houve label manual, confirmar se `@codex review` foi publicado pelo usuario correto.

## Documentacao relacionada

- [Arquitetura do Codex Review](../architecture/codex-review.md)
- [Workflow do Codex Review](../workflows/codex-review.md)

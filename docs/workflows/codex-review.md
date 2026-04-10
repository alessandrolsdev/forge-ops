# Workflows de review automatizado

## Objetivo

Os workflows de review adicionam uma camada advisory de revisao automatizada sobre pull requests para `main`, combinando:
- review automatizado barato por API
- fallback entre providers
- comentario final transparente quando nenhum review util e produzido
- gatilho manual premium do Codex por label

## Quando dispara

Workflow automatico:
- `.github/workflows/codex-review.yml`
- trigger `pull_request`
- eventos `opened`, `synchronize`, `reopened`, `ready_for_review`

Workflow manual premium:
- `.github/workflows/manual-codex-review.yml`
- trigger `pull_request`
- evento `labeled`
- executa apenas quando `github.event.label.name == 'codex-review'`

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
  liga ou desliga o review automatico
- `OPENROUTER_MODEL`
  modelo preferencial da OpenRouter
- `GEMINI_MODEL`
  modelo preferencial da Gemini; sem definicao explicita o workflow usa `gemini-2.5-flash`

Compatibilidade:
- `CODEX_REVIEW_OPENROUTER_MODEL` ainda e aceito como alias legado

### Secrets

- `CODEX_REVIEW_PAT`
  opcional, para publicar `@codex review` como usuario real no fluxo manual
- `OPENROUTER_API_KEY`
  provider automatico primario
- `GEMINI_API_KEY`
  provider automatico secundario
- `GOOGLE_API_KEY`
  alias aceito para o fallback Gemini

## Cadeia de fallback

O fluxo automatico segue esta ordem:

1. OpenRouter
2. retry unico via OpenRouter
3. Gemini 2.5 Flash
4. retry unico via Gemini 2.5 Flash
5. comentario final advisory

Comentario final do fluxo automatico:
- sempre via `GITHUB_TOKEN`
- sempre como bot
- nunca chama `@codex review`

Fluxo manual premium:
- aplicar `label codex-review`
- o frontend do ForgeOps pode solicitar a mesma label pelo backend
- publicar `@codex review` como usuario real, se `CODEX_REVIEW_PAT` estiver disponivel

## Comportamento em fork PR

PRs de fork sao ignorados intencionalmente.

Motivo:
- nao expor automacao e secrets a contexto nao confiavel
- manter principio de menor privilegio

## Estrutura de alto nivel dos jobs

### Fluxo automatico

1. Checkout do repositorio
2. Skip de fork PR
3. Check de configuracao
4. Coleta do contexto do PR e diff
5. Tentativa via OpenRouter
6. Retry unico via OpenRouter, se necessario
7. Fallback via Gemini
8. Retry unico via Gemini, se necessario
9. Resolucao do resultado final
10. Publicacao do comentario final pelo bot

### Fluxo manual por label

1. Checkout do repositorio
2. Skip de fork PR
3. Check de `CODEX_REVIEW_PAT`
4. Resolucao do commenter autenticado
5. Publicacao de `@codex review` como usuario real

## O que o workflow publica

### Comentario final automatico

Pode publicar:
- review automatizado complementar
- comentario de readiness/advisory
- fallback explicando o motivo observado

### Comentario manual premium

Quando possivel, publica:
- `@codex review`
- contexto curto de solicitacao manual
- foco em arquitetura, riscos, testes e seguranca

## Falhas esperadas e degradacao

O workflow e desenhado para degradar sem quebrar o PR:

- OpenRouter indisponivel
  tenta retry unico e depois Gemini
- Gemini indisponivel
  tenta retry unico e depois cai em advisory
- parsing sem texto util
  tenta retry unico e depois passa para o proximo fallback
- `CODEX_REVIEW_PAT` ausente ou invalido
  o fluxo automatico continua; apenas o gatilho manual do Codex fica indisponivel

## Qualidade do review automatico

Idioma e tratado como criterio brando:
- portugues do Brasil continua preferencial
- ingles tecnico pontual nao invalida um review util

Falha dura acontece apenas quando houver:
- erro real de API
- resposta vazia
- parse invalido
- conteudo claramente nao publicavel

## Arquivos relacionados

- workflow automatico: `.github/workflows/codex-review.yml`
- workflow manual: `.github/workflows/manual-codex-review.yml`
- smoke coverage: `.github/workflows/codex-review-smoke.yml`
- smoke logic: `.github/scripts/codex-review-smoke.sh`
- prompt principal: `.github/prompts/codex-review.md`
- fallback message: `.github/prompts/codex-fallback.md`
- readiness message: `.github/prompts/codex-readiness.md`
- marker: `.github/prompts/codex-comment-marker.txt`

## Documentacao relacionada

- [Arquitetura do Codex Review](../architecture/codex-review.md)
- [Guia de debugging](../guides/debug-codex-review.md)

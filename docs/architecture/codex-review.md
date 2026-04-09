# Codex Review - Arquitetura

## Objetivo

O `codex-review` e um workflow advisory de revisao automatizada para pull requests do ForgeOps. Ele amplia a revisao humana com sinais tecnicos sobre risco, escopo, testes, seguranca e fronteiras arquiteturais, mas nao bloqueia merge nem modifica conteudo do repositorio.

## Fluxo completo

1. Um PR nao-draft e aberto, atualizado ou marcado como pronto para review contra `main`.
2. O workflow `codex-review` dispara no GitHub Actions.
3. PRs de fork sao ignorados para nao expor automacao a contexto nao confiavel.
4. O workflow resolve a configuracao automatica:
   - `CODEX_REVIEW_ENABLED`
   - `OPENROUTER_API_KEY`
   - `GEMINI_API_KEY` ou `GOOGLE_API_KEY`
   - `OPENROUTER_MODEL`
   - `GEMINI_MODEL`
5. O workflow coleta contexto do PR:
   - titulo
   - corpo
   - SHA
   - diff unificado
6. O review automatizado tenta OpenRouter como provider primario.
7. Se OpenRouter falhar ou nao gerar conteudo publicavel, o workflow faz um retry unico.
8. Se ainda assim nao houver saida utilizavel, o workflow tenta Gemini 2.5 Flash.
9. Se Gemini falhar ou nao gerar conteudo publicavel, o workflow faz um retry unico.
10. Se nenhum provider gerar texto publicavel, o workflow publica um comentario advisory explicando o motivo observado.
11. O comentario final do fluxo automatico sempre e publicado via `GITHUB_TOKEN`, preservando o bot como autor.
12. O Codex fica reservado para o fluxo manual premium:
    - o usuario aplica a label `codex-review`
    - o frontend do ForgeOps pode solicitar essa mesma label pelo backend
    - o workflow publica `@codex review` como usuario real quando `CODEX_REVIEW_PAT` estiver disponivel e valido

## Decisoes arquiteturais

### Codex fora do fluxo automatico

O Codex nao roda mais automaticamente no review padrao. Isso reduz custo e mantem o fluxo automatico com providers mais baratos antes do fallback advisory.

### PAT opcional para fluxo manual premium

`CODEX_REVIEW_PAT` nao e requisito para o fluxo automatico funcionar. Ele existe para permitir o gatilho manual premium do Codex por label, sempre como usuario real.

Sem PAT valido:
- o fluxo automatico continua publicando como bot via `GITHUB_TOKEN`
- o gatilho manual de `@codex review` por label fica indisponivel

### Fallback para `GITHUB_TOKEN`

O comentario final do fluxo automatico nao depende do PAT. Isso evita:
- falha silenciosa em caso de token invalido
- ausencia de comentario de status
- divergencia entre comportamento real e expectativa operacional

### Modo advisory

O `codex-review` e advisory por design:
- nao aprova merge automaticamente
- nao altera branch
- nao escreve no repositorio
- nao substitui revisao humana

### Prompts versionados fora do YAML

As instrucoes e mensagens do workflow ficam em `.github/prompts/` para manter:
- revisabilidade
- diff claro
- separacao entre orquestracao e conteudo textual

## Providers e fallback chain

Ordem de tentativa atual:

1. Review automatizado via OpenRouter
2. Retry unico da OpenRouter
3. Review automatizado via Gemini 2.5 Flash
4. Retry unico do Gemini
5. Comentario final advisory via bot
6. Codex apenas no fluxo manual por label `codex-review`

Isso permite combinar:
- review automatizado por API com custo mais baixo
- fallback resiliente entre providers
- transparencia quando nenhum caminho produz saida util
- Codex reservado para revisoes manuais de maior valor

## Criterios de utilidade do review automatizado

O workflow tenta validar se a resposta:
- contem texto publicavel
- aborda risco tecnico de forma utilizavel

Idioma passa a ser criterio brando:
- portugues do Brasil continua preferencial
- ingles tecnico pontual nao invalida um review util

Falha dura acontece apenas quando houver:
- erro real de API
- resposta vazia
- parse invalido
- conteudo claramente nao publicavel

## Riscos operacionais

### Quota ou indisponibilidade de LLM

Exemplos:
- `insufficient_quota`
- rate limit
- status HTTP 429
- timeout ou erro de rede

Impacto:
- o review automatizado pode nao ser publicado

Mitigacao:
- fallback entre providers
- retry unico por provider
- comentario final com motivo observado
- manutencao do modo advisory

### Falha de parsing

O shape da resposta da API pode variar. Se o parser nao extrair texto util:
- o workflow nao falha por isso
- o comentario final informa que nao houve conteudo publicavel

### Erro de autenticacao do PAT

Falhas em `CODEX_REVIEW_PAT` nao devem impedir o fluxo automatico. O sistema continua comentando como bot e so perde o gatilho manual premium.

## Fronteiras de seguranca

- o workflow usa `pull_request`, nao `pull_request_target`
- PRs de fork sao ignorados
- segredos nao devem ser expostos ao diff do PR
- o workflow deve operar com menor privilegio
- o review automatizado nao deve mutar conteudo do repositorio

## Documentacao relacionada

- [Workflow do Codex Review](../workflows/codex-review.md)
- [Guia de debugging](../guides/debug-codex-review.md)
- [Politica de protecao do repositorio](repo-protection.md)

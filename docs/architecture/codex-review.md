# Codex Review - Arquitetura

## Objetivo

O `codex-review` e um workflow advisory de revisao automatizada para pull requests do ForgeOps. Ele existe para ampliar a revisao humana com sinais tecnicos sobre risco, escopo, testes, seguranca e fronteiras arquiteturais.

O workflow nao bloqueia merge por si so e nao modifica conteudo do repositório.

## Fluxo completo

1. Um PR nao-draft e aberto, atualizado ou marcado como pronto para review contra `main`.
2. O workflow `codex-review` dispara no GitHub Actions.
3. PRs de fork sao ignorados para nao expor automacao a contexto nao confiavel.
4. O workflow resolve a configuracao de review:
   - `CODEX_REVIEW_ENABLED`
   - `CODEX_REVIEW_PAT`
   - `OPENROUTER_API_KEY`
   - `GEMINI_API_KEY` ou `GOOGLE_API_KEY`
   - `OPENROUTER_MODEL`
5. O workflow coleta contexto do PR:
   - titulo
   - corpo
   - SHA
   - diff unificado
6. O workflow tenta gerar um review automatizado via OpenRouter.
7. Se a resposta da OpenRouter nao for utilizavel, faz um retry unico antes de avancar.
8. Se a resposta continuar inutilizavel, entra o fallback automatico via Gemini 2.5 Flash.
9. Se o Gemini falhar ou nao produzir texto publicavel, faz um retry unico antes de desistir.
10. Se nenhum provider gerar texto publicavel, o workflow publica um comentario advisory explicando o motivo observado.
11. O comentario final do fluxo automatico e sempre publicado via bot com `GITHUB_TOKEN`.
12. O Codex so entra no fluxo manual, quando a PR recebe a label `codex-review`.
13. O frontend do ForgeOps reutiliza esse mesmo gatilho manual ao aplicar a label `codex-review` pelo backend.
14. Se `CODEX_REVIEW_PAT` estiver disponivel e valido, o job manual publica `@codex review` como usuario real.

## Decisoes arquiteturais

### PAT opcional para trigger manual como usuario

`CODEX_REVIEW_PAT` nao e requisito para o workflow automatico. Ele existe para o fluxo manual premium publicar `@codex review` como usuario real quando a PR recebe a label `codex-review`.

Sem PAT valido:
- o fluxo automatico continua sendo publicado pelo bot
- o trigger manual do Codex nao e publicado

### Fallback para `GITHUB_TOKEN`

O comentario final automatico nao depende do PAT. Isso evita:
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
- Codex reservado para uso manual de maior valor
- transparencia quando nenhum caminho produz saida util

## Criterios de utilidade do review automatizado

O workflow tenta validar se a resposta:
- contem texto publicavel
- mantem preferencia por portugues, mas aceita ingles tecnico pontual
- aborda risco tecnico de forma utilizavel

Quando a saida falha por erro real de API, parse invalido, resposta vazia ou texto claramente nao publicavel, o fluxo segue para o retry unico ou fallback seguinte.

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
- comentario final com motivo observado
- manutencao do modo advisory

### Falha de parsing

O shape da resposta da API pode variar. Se o parser nao extrair texto util:
- o workflow nao falha por isso
- o comentario final informa que nao houve conteudo publicavel

### Erro de autenticacao

Falhas em `CODEX_REVIEW_PAT` nao devem impedir a publicacao final. O sistema degrada para `GITHUB_TOKEN` quando necessario.

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

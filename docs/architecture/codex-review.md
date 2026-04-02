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
   - `OPENAI_API_KEY`
   - `OPENROUTER_API_KEY`
   - `OPENROUTER_MODEL`
5. Se `CODEX_REVIEW_PAT` estiver disponivel e valido, o comentario inicial `@codex review` e publicado como usuario real.
6. O workflow coleta contexto do PR:
   - titulo
   - corpo
   - SHA
   - diff unificado
7. O workflow tenta gerar um review automatizado via OpenAI.
8. Se a resposta da OpenAI nao for utilizavel, entra o fallback via OpenRouter.
9. Se nenhum provider gerar texto publicavel, o workflow publica um comentario advisory explicando o motivo observado.
10. O comentario final sempre e tentado em PRs nao-fork:
   - com `CODEX_REVIEW_PAT` quando o commenter autenticado estiver disponivel
   - com `GITHUB_TOKEN` quando o PAT estiver ausente ou invalido

## Decisoes arquiteturais

### PAT opcional para comentario como usuario

`CODEX_REVIEW_PAT` nao e requisito para o workflow funcionar. Ele existe para melhorar a experiencia operacional, permitindo que o comentario inicial e, quando possivel, o comentario final sejam publicados como usuario real.

Sem PAT valido:
- o trigger como usuario pode nao ocorrer
- o comentario final continua sendo publicado como bot via `GITHUB_TOKEN`

### Fallback para `GITHUB_TOKEN`

O comentario final nao depende do PAT. Isso evita:
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

1. Codex disparado por comentario `@codex review`
2. Review automatizado via OpenAI
3. Review automatizado via OpenRouter
4. Comentario final de fallback humano

Isso permite combinar:
- review nativo do Codex no GitHub
- review automatizado por API
- transparencia quando nenhum caminho produz saida util

## Criterios de utilidade do review automatizado

O workflow tenta validar se a resposta:
- contem texto publicavel
- parece estar em portugues do Brasil
- aborda risco tecnico de forma utilizavel

Quando a saida falha nesses criterios, ela e tratada como invalida e o fluxo segue para o fallback seguinte.

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

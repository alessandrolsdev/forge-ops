# Local Dev Proxy

## Objetivo

O ambiente local do ForgeOps usa Traefik como proxy reverso para expor:
- `forgeops.local` -> frontend
- `api.forgeops.local` -> backend

O objetivo principal e manter uma experiencia container-first com porta externa unica, sem depender de `localhost:3000` e `localhost:3333` no fluxo normal.

## Provider estavel

O provider estavel do ambiente local e o `file provider`.

Motivos:
- comportamento previsivel em Docker Desktop e WSL2
- menor acoplamento com particularidades da Docker API local
- roteamento explicito e simples de revisar

## Provider experimental

O `docker provider` continua relevante como caminho futuro de simplificacao e alinhamento com ambientes mais dinamicos. Por isso, ele nao foi removido; foi isolado atras de uma feature flag:

- `TRAEFIK_DOCKER_PROVIDER_ENABLED=false` -> apenas `file provider`
- `TRAEFIK_DOCKER_PROVIDER_ENABLED=true` -> `file provider` + tentativa controlada de `docker provider`

## Estrategia de fallback

Quando o modo experimental esta ligado, o entrypoint do proxy faz um preflight minimo:
- resolve a versao do Traefik
- verifica se `docker.sock` existe
- tenta ler versao do Docker e da Docker API

Se esse preflight falhar:
- o Traefik sobe apenas com `file provider`
- o proxy continua funcional
- um log estruturado explica o motivo da degradacao

Se o preflight passar:
- o `docker provider` e ativado em paralelo
- as rotas estaveis continuam servidas pelo `file provider`
- a descoberta do provider experimental e observada em segundo plano

## Observabilidade

O proxy registra logs estruturados com:
- versao do Traefik
- versao do Docker
- versao da Docker API
- endpoint Docker usado
- network efetiva esperada pelo provider
- estado do `docker.sock`
- status do provider experimental
- motivo do fallback, quando houver
- quantidade de containers elegiveis
- quantidade de containers com labels validas
- containers com override divergente de `traefik.docker.network`
- quantidade de routers `@docker`
- quantidade de services `@docker`

O observer do proxy classifica o estado como:
- `file_provider_only`
- `starting`
- `healthy`
- `degraded`

Os principais `degraded_reason` esperados sao:
- `no_eligible_containers`
- `containers_without_valid_labels`
- `containers_with_incomplete_labels`
- `network_mismatch`
- `provider_active_but_no_routes_materialized`

O bootstrap e o observer agora compartilham a mesma logica de status e a mesma estrutura de snapshot para reduzir risco de drift entre scripts.

Quando `jq` estiver ausente, falhar ao parsear ou receber payload inesperado:
- o proxy nao falha silenciosamente
- o status degrada de forma segura
- o motivo fica explicito em log como `jq_unavailable` ou `jq_parse_failed`
- o `file provider` permanece como caminho estavel

## Snapshot do diagnostico atual

No runtime local validado ate agora, o estado observado e:
- `docker.sock` acessivel
- `providers.docker.exposedByDefault=false`
- `providers.docker.network=forgeops`
- `traefik.docker.network=forgeops` nos containers experimentais
- `traefik.enable=true` nos containers experimentais
- labels de router e service presentes em `services.labels`
- `docker_routers_count=0`
- `docker_services_count=0`

Os sinais mais recentes do observer ficaram assim:
- `eligible_containers_count=4`
- `labeled_containers_count=2`
- `containers_with_valid_labels_count=2`
- `containers_outside_expected_network_count=0`
- `degraded_reason=provider_active_but_no_routes_materialized`

Isso isola o problema atual como:
- provider Docker ativo
- containers experimentais elegiveis
- labels minimas validas
- rede aparente correta
- nenhum router ou service `@docker` materializado no `/api/rawdata`

Enquanto esse estado persistir, o `docker provider` nao deve substituir o `file provider`.

## Rotas experimentais

Para evitar conflito com as rotas estaveis, o `docker provider` usa hosts experimentais:
- `docker-frontend.forgeops.local`
- `docker-api.forgeops.local`

Esses hosts existem para validacao controlada do provider experimental. O trafego normal do produto continua nos hosts principais.

## Seguranca

- `docker.sock` e montado apenas no container do proxy e em modo somente leitura
- logs nao incluem tokens, headers ou variaveis sensiveis
- a API interna do Traefik fica acessivel apenas dentro do container, sem publicacao externa

## Como validar

1. Subir a stack em modo estavel:
   - `TRAEFIK_DOCKER_PROVIDER_ENABLED=false`
   - `docker compose up --build`
2. Confirmar rotas principais:
   - `forgeops.local`
   - `api.forgeops.local`
3. Ativar o modo experimental:
   - `TRAEFIK_DOCKER_PROVIDER_ENABLED=true`
4. Inspecionar logs:
   - `docker compose logs proxy`
5. Verificar se o observer registra `healthy` ou `degraded`

## Evolucao futura

Se o provider experimental se mostrar consistente em multiplos ambientes:
- mover as rotas principais para labels Docker
- manter o `file provider` como fallback transitario
- depois simplificar a configuracao quando a migracao estiver comprovadamente estavel

Se o estado continuar como `provider_active_but_no_routes_materialized`, o proximo passo recomendado e validar o mesmo cenario em Linux nativo para diferenciar problema de runtime local de problema real de configuracao.

O plano reproduzivel dessa comparacao esta em:
- `docs/plans/traefik-docker-provider-runtime-compare.md`

Baseline atual do runtime Docker Desktop / WSL2:
- `eligible_containers_count=4`
- `labeled_containers_count=2`
- `docker_routers_count=0`
- `docker_services_count=0`
- `degraded_reason=provider_active_but_no_routes_materialized`
- hosts estaveis `200`
- hosts experimentais `404`

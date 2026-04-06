# Traefik Docker Provider Runtime Compare

## Issue

- `#116 — Validate Traefik Docker provider on Linux native and compare with Docker Desktop / WSL2`

## Objetivo

Produzir evidência comparável entre:

- Docker Desktop / WSL2
- Linux nativo

Sem alterar o caminho estável atual do `file provider` e sem promover o `docker provider`.

## Estado atual

No runtime local já validado com Docker Desktop / WSL2:

- `providers.docker=true`
- `docker.sock` acessível
- `docker version=29.3.1`
- `docker api version=1.54`
- labels experimentais presentes em `services.labels`
- `providers.docker.network=forgeops`
- `traefik.docker.network=forgeops` nos containers experimentais
- `eligible_containers_count=4`
- `labeled_containers_count=2`
- `containers_with_valid_labels_count=2`
- `docker_routers_count=0`
- `docker_services_count=0`
- `degraded_reason=provider_active_but_no_routes_materialized`
- rotas estaveis respondem `200`
- hosts experimentais respondem `404`
- `/ping` responde `200` internamente em `127.0.0.1:8080` e `404` pela entrypoint `web`

## Hipótese de trabalho

Há duas possibilidades a separar:

1. o comportamento é específico do runtime Docker Desktop / WSL2
2. ainda existe um detalhe de configuração do ForgeOps impedindo a materialização das rotas `@docker`

## Regras de execução

- Não remover o `file provider`
- Não migrar hosts principais para labels Docker
- Não promover o `docker provider`
- Não alterar rotas principais
- Não concluir causa raiz sem comparar com Linux nativo real

## Preparação comum

Executar a mesma stack, com os mesmos hosts e a mesma flag:

```powershell
$env:TRAEFIK_DOCKER_PROVIDER_ENABLED='true'
$env:FORGEOPS_PROXY_PORT='8082'
docker compose up -d --force-recreate proxy frontend backend
```

Garantir entradas de hosts:

```text
127.0.0.1 forgeops.local
127.0.0.1 api.forgeops.local
127.0.0.1 docker-frontend.forgeops.local
127.0.0.1 docker-api.forgeops.local
```

## Checklist por runtime

### 1. Configuração efetiva do provider

Registrar:

- `providers.docker=true`
- `providers.docker.endpoint=unix:///var/run/docker.sock`
- `providers.docker.exposedByDefault=false`
- `providers.docker.network`
- `traefik.docker.network`, quando existir
- labels em `services.labels`

Comandos sugeridos:

```bash
docker compose config
docker inspect forge-ops-proxy-1
docker inspect forge-ops-frontend-1
docker inspect forge-ops-backend-1
```

### 2. Estado operacional

Registrar:

- health interno do proxy via `/ping`
- rotas estáveis funcionando
- host experimental via provider Docker com ou sem resposta

Comandos sugeridos:

```bash
curl -s -o /dev/null -w "%{http_code}\n" -H "Host: forgeops.local" http://127.0.0.1:8082/
curl -s -o /dev/null -w "%{http_code}\n" -H "Host: api.forgeops.local" http://127.0.0.1:8082/api/v1/health
docker exec forge-ops-proxy-1 wget -qO- http://127.0.0.1:8080/ping
curl -s -o /dev/null -w "%{http_code}\n" -H "Host: docker-frontend.forgeops.local" http://127.0.0.1:8082/
curl -s -o /dev/null -w "%{http_code}\n" -H "Host: docker-api.forgeops.local" http://127.0.0.1:8082/api/v1/health
```

Observação:
- no runtime atual, o proxy esta publicado em `8082`
- `/ping` usa a entrypoint interna `traefik` na porta `8080`, nao a entrypoint publica `web`
- não expor a API interna do Traefik fora do contexto de diagnóstico

### 3. Rawdata e descoberta real

Registrar:

- `eligible_containers_count`
- `labeled_containers_count`
- `docker_routers_count`
- `docker_services_count`
- `degraded_reason`
- presença ou ausência de `@docker` no `/api/rawdata`

Comandos sugeridos:

```bash
docker compose logs proxy --tail=200
docker exec forge-ops-proxy-1 wget -qO- http://127.0.0.1:8080/api/rawdata
```

## Tabela de comparação

| Sinal | Docker Desktop / WSL2 | Linux nativo |
|---|---|---|
| Docker version | `29.3.1` | pendente |
| Docker API version | `1.54` | pendente |
| providers.docker.network | `forgeops` | pendente |
| traefik.docker.network | `forgeops` em `frontend` e `backend` | pendente |
| eligible_containers_count | `4` | pendente |
| labeled_containers_count | `2` | pendente |
| containers_with_valid_labels_count | `2` | pendente |
| docker_routers_count | `0` | pendente |
| docker_services_count | `0` | pendente |
| degraded_reason | `provider_active_but_no_routes_materialized` | pendente |
| `@docker` no rawdata | ausente | pendente |
| `/ping` saudável | `200` internamente em `127.0.0.1:8080/ping` | pendente |
| hosts estáveis | `200` em `forgeops.local` e `api.forgeops.local` | pendente |
| hosts experimentais | `404` em `docker-frontend.forgeops.local` e `docker-api.forgeops.local` | pendente |

## Critério de decisão

Considerar o `docker provider` apto para promoção futura apenas se:

- houver `routers @docker`
- houver `services @docker`
- o comportamento for consistente em mais de um runtime

Se isso não acontecer, a conclusão precisa deixar explícito:

- problema específico de runtime
ou
- problema ainda aberto de configuração do ForgeOps

## O que falta nesta execução

No momento, falta um host Linux nativo acessível para rodar a mesma checklist.

A baseline do runtime Docker Desktop / WSL2 ja foi consolidada; o delta pendente da issue agora e exclusivamente a comparacao no segundo runtime.

Sem isso, esta issue não deve ser encerrada como conclusiva.

## Saída esperada ao final da comparação

1. tabela comparativa preenchida
2. trecho de logs com os contadores instrumentados
3. confirmação da presença ou ausência de `@docker` no `rawdata`
4. conclusão objetiva: runtime problem ou config problem

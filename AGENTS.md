# ForgeOps — AGENTS.md

## Contexto do repositório

Este repositório é o monorepo do ForgeOps.

ForgeOps é uma plataforma de governança de automações de engenharia, com foco em:

- GitHub Actions
- Pull Requests
- reviews automatizados com Codex
- padrões mínimos de qualidade, testes e segurança
- visibilidade operacional sobre automações de CI/CD e workflow health

O repositório usa arquitetura de monorepo com:

- `frontend` para a aplicação web
- `backend` para a API e serviços
- `packages/*` para código compartilhado quando houver necessidade real
- `.github/*` para workflows, templates e automações do próprio projeto
- `docs/*` para documentação viva, ADRs e planos

Antes de qualquer tarefa, leia:

1. este `AGENTS.md`
2. `PROJECT.md`
3. arquivos locais relevantes da feature
4. qualquer plano aplicável em `docs/plans/`
5. documentação arquitetural relevante em `docs/architecture/`

---

## Como o agente deve operar

Você é um engenheiro de software e arquiteto sênior trabalhando em par com o time do ForgeOps.

Seu comportamento esperado:

- pensar antes de implementar
- reduzir ambiguidades
- evitar retrabalho
- respeitar escopo
- priorizar segurança, funcionalidade, testes e clareza
- agir como um par sênior, não como um gerador de código impulsivo
- justificar decisões técnicas quando houver trade-offs relevantes
- deixar o trabalho sempre rastreável e auditável

---

## Ordem obrigatória de trabalho

### Para qualquer tarefa

1. Entenda o problema
2. Leia o contexto relevante
3. Resuma o plano antes de editar
4. Liste arquivos que pretende alterar
5. Identifique riscos técnicos
6. Defina critérios de aceite verificáveis
7. Só então implemente

### Para tarefas complexas

Use `/plan` ou equivalente e planeje antes de escrever código.

### Para trabalho longo

Se a tarefa for multi-etapas, longa ou ambígua:

- consulte `PROJECT.md`
- proponha um plano estruturado
- crie ou atualize um documento em `docs/plans/`
- não implemente tudo de uma vez

---

## Skills obrigatórias por contexto

Antes de iniciar qualquer tarefa, verifique se existe uma skill adequada em `.agents/skills/`.

Use estas skills conforme o contexto:

| Contexto | Skill |
|---|---|
| Planejamento de feature, refactor ou integração | `architecture-planning` |
| Quebra em backlog, issues, labels, milestones e PR | `github-workflow` |
| Implementação de API, integração ou serviço backend | `backend-api` |
| Alteração de lógica com foco em TDD e segurança de refactor | `unit-test-first` |
| Revisão antes do merge | `secure-pr-checklist` |
| Avaliação de dependências e bibliotecas | `dependency-security-review` |
| Execução orientada por issue, branch, commit e próximos passos | `issue-driven-delivery` |

Se mais de uma skill for relevante, combine-as deliberadamente e explique brevemente por quê.

---

## Regras de monorepo

### Estrutura esperada

- `frontend`: aplicação web
- `backend`: API e serviços
- `packages/*`: compartilhado
- `docs/*`: documentação viva
- `.github/*`: automações, templates e qualidade

### Regras

- Não misture frontend e backend sem necessidade
- `frontend` não deve conter regra de negócio de backend
- `backend` não deve conter código de UI
- Shared code só vai para `packages/` quando houver necessidade real
- Preserve fronteiras claras entre interface, API e compartilhamento
- Não extraia packages por antecipação
- Não introduza abstrações compartilhadas sem critério explícito

### Regra de fronteira entre frontend e backend

- `frontend` não acessa banco diretamente
- `frontend` consome contratos do `backend`
- `backend` concentra regras de negócio e integrações
- contratos compartilhados só devem ir para `packages/` quando houver necessidade real e justificada
- drift de schema entre frontend e backend deve ser tratado como risco arquitetural importante

---

## Fluxo orientado por issue

Este repositório deve ser trabalhado principalmente por issue.

A lógica esperada é:

- um epic agrupa o objetivo maior
- cada issue representa uma unidade de execução
- cada issue deve ser resolvida em sua própria branch
- o commit só deve ser sugerido quando houver uma unidade coesa de entrega
- toda resposta deve terminar com próximos passos claros

### Ordem obrigatória por issue

1. identificar a issue atual
2. resumir objetivo e critérios de aceite
3. sugerir ou confirmar a branch antes de editar
4. explicar o plano e os arquivos afetados
5. implementar apenas o escopo da issue
6. criar ou atualizar testes
7. sugerir commit semântico quando fizer sentido
8. encerrar com próximos passos
9. indicar a próxima issue recomendada do epic

### Regra de branch

A branch deve vir antes da implementação.

### Regra de commit

O commit deve vir depois, e apenas quando houver uma entrega coerente.

### Regra de issue

- trabalho relevante deve estar vinculado a uma issue
- se não houver issue real ainda, entregue a issue pronta em markdown
- follow-ups devem virar issue sugerida ao final da resposta

---

## Branches e commits

### Padrão de branch

Use branch naming semântico:

- `feature/<descricao-curta>`
- `fix/<descricao-curta>`
- `refactor/<descricao-curta>`
- `test/<descricao-curta>`
- `chore/<descricao-curta>`
- `docs/<descricao-curta>`

A branch deve refletir o escopo da issue, não o detalhe incidental da implementação.

### Padrão de commit

Use conventional commits:

- `feat(scope): ...`
- `fix(scope): ...`
- `refactor(scope): ...`
- `test(scope): ...`
- `docs(scope): ...`
- `chore(scope): ...`

O commit só deve ser sugerido como pronto quando:

- o escopo estiver coeso
- os arquivos alterados fizerem sentido juntos
- a implementação estiver consistente
- os testes relevantes tiverem sido criados ou atualizados

Se ainda não fizer sentido commitar, diga explicitamente:

> Ainda não pronto para commit.

---

## Regras de implementação

### Sempre faça

- mudanças pequenas e reversíveis
- TypeScript strict
- nomes claros
- validação de entrada
- tratamento explícito de erro
- testes quando lógica mudar
- documentação mínima quando arquitetura ou fluxo mudar
- justificativa clara ao introduzir trade-offs
- follow-ups claros quando a issue não cobrir tudo

### Nunca faça

- não use `any`
- não hardcode segredos
- não refatore fora do escopo
- não remova testes para fazer build passar
- não adicione dependência sem justificar
- não implemente sem explicar o plano
- não invente comportamento que não foi definido
- não misture múltiplas issues em uma única entrega sem justificativa forte

---

## Backend

No backend:

- controllers/handlers recebem, validam, delegam e respondem
- services concentram regra de negócio
- repositories abstraem persistência
- integrações externas devem ficar isoladas em clients/providers
- erros esperados devem ser tratados explicitamente
- logs não podem expor dados sensíveis
- a borda HTTP deve ser fortemente tipada
- contratos de entrada e saída devem ser claros e verificáveis

### Regras adicionais de backend

- controllers não acessam banco diretamente
- services não formatam resposta HTTP
- validação deve ocorrer antes da lógica principal
- integrações externas devem ter timeout e tratamento de falha
- middleware de erro deve evitar vazamento de detalhes internos

---

## Frontend

No frontend:

- priorize clareza de estado e fluxo
- separe UI, dados e validação
- use componentes reutilizáveis quando houver repetição real
- evite acoplamento indevido entre telas
- preserve acessibilidade básica
- prefira UX clara a abstrações prematuras
- trate configuração pública de forma explícita e segura

### Regras adicionais de frontend

- evite duplicar contratos do backend sem critério claro
- prefira tipagem clara para payloads e respostas
- centralize chamadas HTTP em camada explícita
- não esconda falhas de configuração importantes com fallbacks silenciosos sem justificar

---

## Testes

- Toda alteração de lógica deve criar ou atualizar testes
- Cobrir caminho feliz, falhas esperadas e edge cases críticos
- Se não for possível testar algo agora, explicar por quê
- Não considerar entrega concluída sem validação mínima
- Testes de contrato devem ser considerados quando houver integração entre frontend e backend
- Testes devem validar comportamento, não apenas implementação interna

### Prioridades de teste

1. lógica de negócio
2. bordas HTTP / handlers / validação
3. contratos entre frontend e backend
4. scripts críticos de workspace e automação
5. fluxos principais do frontend

---

## Segurança

Trate como prioridade:

- validação de entrada
- autenticação e autorização
- segredos
- dados sensíveis
- logs e erros
- dependências novas
- integrações com GitHub e tokens

Qualquer risco relevante deve ser explicitado no final da tarefa.

### Regras adicionais de segurança

- falhas de autenticação/autorização são bloqueantes
- segredos hardcoded são bloqueantes
- input inseguro em query, comando ou integração é bloqueante
- supply chain risk de dependências deve ser explicitado quando houver pacote novo
- GitHub Actions devem seguir princípio de menor privilégio

---

## GitHub workflow

Para trabalho rastreável:

- issues antes de código, quando aplicável
- uma issue por escopo
- branch por issue
- PR vinculado
- labels e milestone quando fizer sentido
- checklist de PR antes de revisão

### Regra de backlog

- o epic representa o objetivo maior
- as issues representam unidades executáveis
- cada issue deve ter objetivo, escopo, critérios de aceite, riscos, labels e branch sugerida
- follow-ups identificados durante a execução devem ser sugeridos como novas issues

---

## Review

Antes de considerar a tarefa pronta:

- revise segurança
- revise funcionalidade
- revise testes
- revise escopo
- revise riscos remanescentes

Use `secure-pr-checklist` quando houver mudança material.

### Em reviews

- seja crítico e objetivo
- priorize problemas reais e acionáveis
- sempre que possível, cite arquivo, impacto e correção sugerida
- se não houver problema relevante, diga isso claramente

---

## Planejamento e prompts reutilizáveis

- Consulte `PROJECT.md` para visão do produto e arquitetura
- Consulte `docs/plans/` para planos ativos
- Se existir `docs/plans/codex-prompts.md`, use-o como biblioteca de prompts reutilizáveis
- Para tarefas grandes ou multi-etapas, proponha ou atualize um documento em `docs/plans/`

---

## Saída esperada do agente

Ao final de qualquer implementação, correção, refactor ou checkpoint técnico relevante, responda com:

```md
## Estado da issue
#<número> — <título>
ou
Issue ainda não criada — [título sugerido]

## Objetivo
[resumo curto]

## Branch
`<branch-name>`
ou
Ainda não definida.

## O que foi feito
[resumo]

## Arquivos alterados
- [arquivo] — [motivo]

## Testes criados ou atualizados
[resumo]
ou
Nenhum teste ainda.

## Commit sugerido
`<conventional-commit>`
ou
Ainda não pronto para commit.

## Riscos remanescentes
[item]

## Próximos passos
1. ...
2. ...
3. ...

## Próxima issue sugerida
#<número> — <título>
ou
[título sugerido]
```

---

## Regra de fechamento

Toda resposta de execução deve terminar com:

- estado atual da issue
- branch
- commit sugerido
- próximos passos
- próxima issue sugerida

---

## Definition of Done

Uma tarefa só está pronta quando:

- [ ] código funciona
- [ ] typecheck passa
- [ ] lint passa
- [ ] testes relevantes passam
- [ ] sem `any`
- [ ] sem segredos hardcoded
- [ ] sem alteração fora do escopo
- [ ] riscos documentados
- [ ] saída final estruturada entregue

Uma issue só está pronta para PR quando:

- [ ] o escopo da issue foi atendido
- [ ] os critérios de aceite foram validados
- [ ] a branch está coerente com a issue
- [ ] existe commit coerente ou conjunto pequeno de commits coerentes
- [ ] os próximos passos fora do escopo foram identificados
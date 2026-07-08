# Publicando @forgeops/core e @forgeops/cli no npm

Os pacotes `@forgeops/core` e `@forgeops/cli` sao publicados automaticamente pelo
workflow `.github/workflows/release.yml` quando uma tag `v*` e enviada.

## Pre-requisitos (uma vez)

1. Crie um token de automacao no npm com permissao de publicacao no escopo
   `@forgeops`.
2. No repositorio do GitHub, crie o environment `release` e adicione o secret
   `NPM_TOKEN` com esse token. O environment permite exigir aprovacao manual
   antes de cada publicacao, se desejado.
3. Garanta que o escopo `@forgeops` existe no npm e que a conta tem acesso.

## Fluxo de release

1. Atualize a versao dos dois pacotes para o mesmo valor (o workflow valida que
   a tag casa com ambos):

   ```bash
   npm --prefix packages/core version <nova-versao> --no-git-tag-version
   npm --prefix packages/cli version <nova-versao> --no-git-tag-version
   ```

2. Atualize o `CHANGELOG.md` movendo o conteudo de `[Unreleased]` para a nova
   versao.

3. Commit, tag e push:

   ```bash
   git commit -am "chore(release): vX.Y.Z"
   git tag vX.Y.Z
   git push origin main --tags
   ```

4. O workflow `Release` builda os pacotes na ordem correta (`core` antes de
   `cli`), roda os testes com o gate de cobertura e publica os dois pacotes com
   `pnpm publish` (que reescreve `workspace:^` para o range de versao real).

## Publicacao manual (fallback)

Se precisar publicar sem o workflow:

```bash
pnpm --filter @forgeops/core build
pnpm --filter @forgeops/cli build
pnpm --filter @forgeops/core publish --access public
pnpm --filter @forgeops/cli publish --access public
```

Publique sempre `@forgeops/core` antes de `@forgeops/cli`, ja que o CLI depende
da versao publicada do core.

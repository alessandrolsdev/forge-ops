export const FORGEOPS_WORKFLOW_PATH = '.github/workflows/forgeops.yml';

export const FORGEOPS_WORKFLOW_TEMPLATE = `name: ForgeOps

on:
  pull_request:
  issue_comment:
    types:
      - created

permissions:
  contents: read
  issues: write
  pull-requests: read

jobs:
  review:
    name: forgeops-review
    if: >-
      github.event_name == 'issue_comment' &&
      github.event.issue.pull_request &&
      contains(github.event.comment.body, '@forgeops review')
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          persist-credentials: false

      - name: Run ForgeOps review
        uses: alessandrolsdev/forge-ops/.github/actions/forgeops-review@main
        with:
          openrouter-api-key: \${{ secrets.OPENROUTER_API_KEY }}
          openrouter-model: \${{ vars.OPENROUTER_MODEL }}
          gemini-api-key: \${{ secrets.GEMINI_API_KEY }}

  health:
    name: forgeops-health
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          persist-credentials: false

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22

      - name: Compute automation health score
        run: npx --yes @forgeops/cli score --github
        env:
          GITHUB_TOKEN: \${{ github.token }}
`;

export const VITEST_CONFIG_PATH = 'vitest.config.ts';

export const VITEST_CONFIG_TEMPLATE = `import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**'],
      thresholds: {
        lines: 80,
        functions: 80,
        statements: 80,
      },
    },
  },
});
`;

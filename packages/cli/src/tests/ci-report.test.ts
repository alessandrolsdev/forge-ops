import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { publishCiReport } from '../ci-report.js';
import { HEALTH_COMMENT_MARKER } from '../render.js';

let workDir: string | null = null;

const createWorkDir = (): string => {
  workDir = mkdtempSync(join(tmpdir(), 'forgeops-ci-'));
  return workDir;
};

afterEach(() => {
  if (workDir) {
    rmSync(workDir, { recursive: true, force: true });
    workDir = null;
  }
});

const markdown = `${HEALTH_COMMENT_MARKER}\n## ForgeOps automation health`;

describe('publishCiReport', () => {
  it('writes the job summary and creates a new comment on the pull request', async () => {
    const dir = createWorkDir();
    const summaryPath = join(dir, 'summary.md');
    const eventPath = join(dir, 'event.json');
    writeFileSync(summaryPath, '', 'utf8');
    writeFileSync(eventPath, JSON.stringify({ pull_request: { number: 42 } }), 'utf8');

    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify([]), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: 1 }), {
          status: 201,
          headers: { 'content-type': 'application/json' },
        }),
      );

    const result = await publishCiReport({
      markdown,
      fetcher,
      env: {
        GITHUB_STEP_SUMMARY: summaryPath,
        GITHUB_TOKEN: 'token',
        GITHUB_REPOSITORY: 'forgeops/sample',
        GITHUB_EVENT_PATH: eventPath,
      } as NodeJS.ProcessEnv,
    });

    expect(result.wroteSummary).toBe(true);
    expect(result.commentAction).toBe('created');
    expect(readFileSync(summaryPath, 'utf8')).toContain('ForgeOps automation health');
    expect(fetcher).toHaveBeenNthCalledWith(
      2,
      'https://api.github.com/repos/forgeops/sample/issues/42/comments',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('updates the existing marked comment in place', async () => {
    const dir = createWorkDir();
    const eventPath = join(dir, 'event.json');
    writeFileSync(eventPath, JSON.stringify({ pull_request: { number: 42 } }), 'utf8');

    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            { id: 7, body: 'unrelated' },
            { id: 9, body: `${HEALTH_COMMENT_MARKER}\nold` },
          ]),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: 9 }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      );

    const result = await publishCiReport({
      markdown,
      fetcher,
      env: {
        GITHUB_TOKEN: 'token',
        GITHUB_REPOSITORY: 'forgeops/sample',
        GITHUB_EVENT_PATH: eventPath,
      } as NodeJS.ProcessEnv,
    });

    expect(result.commentAction).toBe('updated');
    expect(fetcher).toHaveBeenNthCalledWith(
      2,
      'https://api.github.com/repos/forgeops/sample/issues/comments/9',
      expect.objectContaining({ method: 'PATCH' }),
    );
  });

  it('skips the comment gracefully outside of a pull request context', async () => {
    const result = await publishCiReport({
      markdown,
      fetcher: vi.fn<typeof fetch>(),
      env: {} as NodeJS.ProcessEnv,
    });

    expect(result.wroteSummary).toBe(false);
    expect(result.commentAction).toBe('skipped');
    expect(result.note).toContain('Skipped the pull request comment');
  });
});

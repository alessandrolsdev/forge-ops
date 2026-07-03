import { describe, expect, it, vi } from 'vitest';
import { fetchRecentRunConclusions, parseRepositorySlug } from '../github.js';

describe('parseRepositorySlug', () => {
  it('parses https remotes with and without .git suffix', () => {
    expect(parseRepositorySlug('https://github.com/forgeops/sample.git')).toEqual({
      owner: 'forgeops',
      name: 'sample',
    });
    expect(parseRepositorySlug('https://github.com/forgeops/sample')).toEqual({
      owner: 'forgeops',
      name: 'sample',
    });
  });

  it('parses ssh remotes', () => {
    expect(parseRepositorySlug('git@github.com:forgeops/sample.git')).toEqual({
      owner: 'forgeops',
      name: 'sample',
    });
  });

  it('returns null for non-github remotes', () => {
    expect(parseRepositorySlug('https://gitlab.com/forgeops/sample.git')).toBeNull();
  });
});

describe('fetchRecentRunConclusions', () => {
  it('maps workflow run conclusions from the GitHub API payload', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          workflow_runs: [
            { conclusion: 'success' },
            { conclusion: 'failure' },
            { conclusion: null },
          ],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );

    await expect(
      fetchRecentRunConclusions({ owner: 'forgeops', name: 'sample' }, 'token', fetcher),
    ).resolves.toEqual(['success', 'failure', null]);

    expect(fetcher).toHaveBeenCalledWith(
      'https://api.github.com/repos/forgeops/sample/actions/runs?status=completed&per_page=20',
      expect.objectContaining({
        headers: expect.objectContaining({
          authorization: 'Bearer token',
        }),
      }),
    );
  });

  it('throws a descriptive error on non-success responses', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(null, { status: 403 }));

    await expect(
      fetchRecentRunConclusions({ owner: 'forgeops', name: 'sample' }, 'token', fetcher),
    ).rejects.toThrowError('GitHub API request for workflow runs failed with status 403.');
  });
});

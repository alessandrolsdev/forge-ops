import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Providers } from '@/app/providers';
import type { ForgeOpsApiClient } from '@/lib/api/client';
import { ApiClientError } from '@/lib/api/client';
import { RepositoriesView } from '@/features/repositories/repositories-view';

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

const renderRepositoriesView = (client: ForgeOpsApiClient) => {
  render(
    <Providers>
      <RepositoriesView client={client} />
    </Providers>,
  );
};

describe('RepositoriesView', () => {
  it('should wait for an operator token before querying protected repository APIs', () => {
    const client: ForgeOpsApiClient = {
      getHealth: vi.fn(),
      getRepositories: vi.fn(),
      getRepositoryDiscovery: vi.fn(),
      createRepository: vi.fn(),
    };

    renderRepositoriesView(client);

    expect(
      screen.getByText(
        'Add an operator token to load the repositories already monitored by ForgeOps.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Add an operator token to query repository discovery through the backend.',
      ),
    ).toBeInTheDocument();
    expect(client.getRepositories).not.toHaveBeenCalled();
    expect(client.getRepositoryDiscovery).not.toHaveBeenCalled();
  });

  it('should load discovery and connect a repository through the backend client', async () => {
    const getRepositories = vi
      .fn<ForgeOpsApiClient['getRepositories']>()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: 'repo_123',
          githubRepoId: '123456789',
          owner: 'forgeops',
          name: 'backend',
          fullName: 'forgeops/backend',
          defaultBranch: 'main',
          isActive: true,
          createdAt: '2026-03-28T00:00:00.000Z',
          updatedAt: '2026-03-28T00:00:00.000Z',
        },
      ]);
    const getRepositoryDiscovery = vi
      .fn<ForgeOpsApiClient['getRepositoryDiscovery']>()
      .mockResolvedValue([
        {
          githubRepoId: '123456789',
          owner: 'forgeops',
          name: 'backend',
          fullName: 'forgeops/backend',
          defaultBranch: 'main',
          isPrivate: true,
        },
      ]);
    const createRepository = vi
      .fn<ForgeOpsApiClient['createRepository']>()
      .mockResolvedValue({
        id: 'repo_123',
        githubRepoId: '123456789',
        owner: 'forgeops',
        name: 'backend',
        fullName: 'forgeops/backend',
        defaultBranch: 'main',
        isActive: true,
        createdAt: '2026-03-28T00:00:00.000Z',
        updatedAt: '2026-03-28T00:00:00.000Z',
      });
    const client: ForgeOpsApiClient = {
      getHealth: vi.fn(),
      getRepositories,
      getRepositoryDiscovery,
      createRepository,
    };

    renderRepositoriesView(client);

    fireEvent.change(screen.getByLabelText('Operator bearer token'), {
      target: { value: 'trusted-token' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Use access token' }));

    await waitFor(() => {
      expect(screen.getByText('forgeops/backend')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Connect repository' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Connect repository' }));

    await waitFor(() => {
      expect(createRepository).toHaveBeenCalledWith('trusted-token', {
        githubRepoId: '123456789',
        owner: 'forgeops',
        name: 'backend',
        fullName: 'forgeops/backend',
        defaultBranch: 'main',
      });
      expect(
        screen.getByText('Repository forgeops/backend is now monitored.'),
      ).toBeInTheDocument();
      expect(screen.getByText('Already monitored')).toBeInTheDocument();
    });
  });

  it('should surface backend discovery errors clearly', async () => {
    const client: ForgeOpsApiClient = {
      getHealth: vi.fn(),
      getRepositories: vi.fn().mockResolvedValue([]),
      getRepositoryDiscovery: vi
        .fn()
        .mockRejectedValue(
          new ApiClientError('GitHub repository discovery is currently unavailable.', 503),
        ),
      createRepository: vi.fn(),
    };

    renderRepositoriesView(client);

    fireEvent.change(screen.getByLabelText('Operator bearer token'), {
      target: { value: 'trusted-token' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Use access token' }));

    await waitFor(() => {
      expect(
        screen.getByText('GitHub repository discovery is currently unavailable.'),
      ).toBeInTheDocument();
    });
  });

  it('should surface repository conflicts clearly and refresh monitored repositories', async () => {
    const getRepositories = vi
      .fn<ForgeOpsApiClient['getRepositories']>()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: 'repo_123',
          githubRepoId: '123456789',
          owner: 'forgeops',
          name: 'backend',
          fullName: 'forgeops/backend',
          defaultBranch: 'main',
          isActive: true,
          createdAt: '2026-03-28T00:00:00.000Z',
          updatedAt: '2026-03-28T00:00:00.000Z',
        },
      ]);
    const client: ForgeOpsApiClient = {
      getHealth: vi.fn(),
      getRepositories,
      getRepositoryDiscovery: vi.fn().mockResolvedValue([
        {
          githubRepoId: '123456789',
          owner: 'forgeops',
          name: 'backend',
          fullName: 'forgeops/backend',
          defaultBranch: 'main',
          isPrivate: true,
        },
      ]),
      createRepository: vi
        .fn()
        .mockRejectedValue(
          new ApiClientError('Repository is already monitored.', 409, 'repository_already_exists'),
        ),
    };

    renderRepositoriesView(client);

    fireEvent.change(screen.getByLabelText('Operator bearer token'), {
      target: { value: 'trusted-token' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Use access token' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Connect repository' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Connect repository' }));

    await waitFor(() => {
      expect(screen.getByText('Repository is already monitored.')).toBeInTheDocument();
      expect(screen.getByText('Already monitored')).toBeInTheDocument();
      expect(getRepositories).toHaveBeenCalledTimes(2);
    });
  });
});

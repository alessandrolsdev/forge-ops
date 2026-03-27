import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RepositoryConnectionForm } from '@/features/repositories/forms/repository-connection-form';

afterEach(() => {
  cleanup();
});

describe('RepositoryConnectionForm', () => {
  it('should show validation errors for invalid values', async () => {
    const onSubmit = vi.fn();

    render(<RepositoryConnectionForm onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText('Repository owner'), {
      target: { value: 'A' },
    });
    fireEvent.change(screen.getByLabelText('Repository name'), {
      target: { value: 'invalid repo' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Validate connection payload' }));

    await waitFor(() => {
      expect(screen.getByText('Owner must have at least 2 characters.')).toBeInTheDocument();
      expect(
        screen.getByText('Repository name must use lowercase letters, numbers, dots, underscores, or dashes.'),
      ).toBeInTheDocument();
    });

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('should submit normalized values when the payload is valid', async () => {
    const onSubmit = vi.fn();

    render(<RepositoryConnectionForm onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText('Repository owner'), {
      target: { value: 'ForgeOps ' },
    });
    fireEvent.change(screen.getByLabelText('Repository name'), {
      target: { value: 'frontend-app' },
    });
    fireEvent.change(screen.getByLabelText('Installation ID'), {
      target: { value: '123456' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Validate connection payload' }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        installationId: '123456',
        owner: 'ForgeOps',
        repository: 'frontend-app',
      });
    });
  });
});

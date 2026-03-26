'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { RepositoryConnectionForm } from './forms/repository-connection-form';
import type { RepositoryConnectionValues } from './forms/repository-connection.schema';

export function RepositoriesView() {
  const [preview, setPreview] = useState<RepositoryConnectionValues | null>(null);

  return (
    <div className="page-stack">
      <section className="page-header">
        <span className="page-header__eyebrow">Repositories</span>
        <h2 className="page-header__title">Prepare the onboarding surface before domain flows.</h2>
        <p className="page-header__description">
          This page keeps the repository registry feature isolated and introduces the first form
          boundary for future GitHub connection flows.
        </p>
      </section>

      <div className="grid grid--two">
        <Card eyebrow="Onboarding" title="Connection payload validation">
          <RepositoryConnectionForm onSubmit={setPreview} />
        </Card>
        <Card eyebrow="Preview" title="Normalized payload snapshot">
          {preview ? (
            <pre className="code-block">{JSON.stringify(preview, null, 2)}</pre>
          ) : (
            <p>
              Submit a valid payload to preview the normalized data that a future repository
              onboarding mutation will send to the backend.
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}

'use client';

import { useForm } from 'react-hook-form';
import { ZodError } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  repositoryConnectionSchema,
  type RepositoryConnectionValues,
} from './repository-connection.schema';

interface RepositoryConnectionFormProps {
  onSubmit: (values: RepositoryConnectionValues) => void;
}

interface RepositoryConnectionFormFields {
  owner: string;
  repository: string;
  installationId: string;
}

export function RepositoryConnectionForm({ onSubmit }: RepositoryConnectionFormProps) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<RepositoryConnectionFormFields>({
    defaultValues: {
      owner: '',
      repository: '',
      installationId: '',
    },
  });

  const submit = handleSubmit((values) => {
    try {
      const parsed = repositoryConnectionSchema.parse(values);
      onSubmit(parsed);
    } catch (error) {
      if (!(error instanceof ZodError)) {
        throw error;
      }

      error.issues.forEach((issue) => {
        const [field] = issue.path;

        if (field === 'owner' || field === 'repository' || field === 'installationId') {
          setError(field, {
            type: 'manual',
            message: issue.message,
          });
        }
      });
    }
  });

  return (
    <form className="form-stack" onSubmit={submit} noValidate>
      <Input
        id="owner"
        label="Repository owner"
        placeholder="forgeops"
        autoComplete="off"
        error={errors.owner?.message}
        {...register('owner')}
      />
      <Input
        id="repository"
        label="Repository name"
        placeholder="frontend-app"
        autoComplete="off"
        error={errors.repository?.message}
        {...register('repository')}
      />
      <Input
        id="installationId"
        label="Installation ID"
        placeholder="123456"
        inputMode="numeric"
        autoComplete="off"
        error={errors.installationId?.message}
        {...register('installationId')}
      />
      <Button type="submit">Validate connection payload</Button>
    </form>
  );
}

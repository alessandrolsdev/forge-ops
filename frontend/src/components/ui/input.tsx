import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string | undefined;
}

export function Input({ label, error, id, className, ...props }: InputProps) {
  const classes = className ? `input ${className}` : 'input';

  return (
    <label className="field" htmlFor={id}>
      <span className="field__label">{label}</span>
      <input id={id} className={classes} aria-invalid={error ? 'true' : 'false'} {...props} />
      {error ? <span className="field__error">{error}</span> : null}
    </label>
  );
}

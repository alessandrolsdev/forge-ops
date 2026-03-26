import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  children: ReactNode;
}

export function Button({
  variant = 'primary',
  children,
  className,
  type = 'button',
  ...props
}: ButtonProps) {
  const variantClass = variant === 'primary' ? 'button button--primary' : 'button button--secondary';
  const classes = className ? `${variantClass} ${className}` : variantClass;

  return (
    <button type={type} className={classes} {...props}>
      {children}
    </button>
  );
}

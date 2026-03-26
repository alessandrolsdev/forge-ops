import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  title?: string;
  eyebrow?: string;
}

export function Card({ children, title, eyebrow }: CardProps) {
  return (
    <section className="panel">
      {eyebrow ? <p className="panel__eyebrow">{eyebrow}</p> : null}
      {title ? <h2 className="panel__title">{title}</h2> : null}
      <div className="panel__content">{children}</div>
    </section>
  );
}

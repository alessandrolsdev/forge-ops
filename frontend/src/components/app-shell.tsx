import type { ReactNode } from 'react';
import { PrimaryNav } from './navigation/primary-nav';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="app-shell">
      <aside className="app-shell__sidebar">
        <div className="brand-block">
          <span className="brand-block__eyebrow">ForgeOps</span>
          <h1 className="brand-block__title">Engineering automation, governed.</h1>
          <p className="brand-block__description">
            A frontend foundation prepared for repository visibility, workflow intelligence, and
            policy-driven engineering operations.
          </p>
        </div>
        <PrimaryNav />
      </aside>
      <div className="app-shell__content">
        <header className="app-shell__header">
          <span className="signal">Frontend foundation active</span>
        </header>
        <main className="app-shell__main">{children}</main>
      </div>
    </div>
  );
}

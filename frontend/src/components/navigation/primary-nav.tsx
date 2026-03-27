'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navigationItems = [
  {
    href: '/',
    label: 'Overview',
    description: 'Foundation status and architecture overview.',
  },
  {
    href: '/repositories',
    label: 'Repositories',
    description: 'Future repository registry and onboarding flows.',
  },
  {
    href: '/settings',
    label: 'Settings',
    description: 'Platform defaults, tokens, and policy controls.',
  },
] as const;

export function PrimaryNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Primary navigation" className="nav">
      {navigationItems.map((item) => {
        const isActive = pathname === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={isActive ? 'nav__item nav__item--active' : 'nav__item'}
          >
            <span className="nav__label">{item.label}</span>
            <span className="nav__description">{item.description}</span>
          </Link>
        );
      })}
    </nav>
  );
}

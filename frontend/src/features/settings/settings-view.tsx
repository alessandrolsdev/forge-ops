import { Card } from '@/components/ui/card';

const settingsAreas = [
  'Public frontend configuration and environment visibility.',
  'Integration guidance for GitHub App setup and token ownership.',
  'Policy defaults that will later map to backend-managed settings.',
];

export function SettingsView() {
  return (
    <div className="page-stack">
      <section className="page-header">
        <span className="page-header__eyebrow">Settings</span>
        <h2 className="page-header__title">Keep platform defaults explicit from day one.</h2>
        <p className="page-header__description">
          The settings area is still a placeholder, but the route already marks where integration,
          policy, and environment surfaces will live.
        </p>
      </section>

      <Card eyebrow="Future surface" title="Reserved platform sections">
        <ul className="list">
          {settingsAreas.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

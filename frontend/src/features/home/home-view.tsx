import { Card } from '@/components/ui/card';
import { getApiBaseUrl } from '@/lib/config/public-env';

const architectureSignals = [
  'App Router with shared shell and route placeholders.',
  'Feature folders isolate future views, forms, and data hooks.',
  'Typed API boundary remains in lib/api until sharing is justified.',
];

export function HomeView() {
  return (
    <div className="page-stack">
      <section className="hero">
        <span className="hero__eyebrow">Frontend foundation</span>
        <h2 className="hero__title">A clear base for visibility, workflows, and policy UX.</h2>
        <p className="hero__description">
          The web app starts with a stable shell, route structure, reusable UI primitives, and a
          typed path to the backend API. Product modules can now grow without collapsing frontend
          boundaries.
        </p>
      </section>

      <div className="grid grid--three">
        <Card eyebrow="Navigation" title="Route groups ready">
          <p>
            Overview, repository onboarding, and settings already exist as dedicated pages so the
            first verticals can land without reshaping the app tree.
          </p>
        </Card>
        <Card eyebrow="API" title="Backend boundary preserved">
          <p>
            The frontend keeps consuming the backend through a typed client rooted at{' '}
            <code>{getApiBaseUrl()}</code>.
          </p>
        </Card>
        <Card eyebrow="Forms" title="Validation is local and explicit">
          <p>
            Form validation uses Zod plus React Hook Form in feature scope, without pulling shared
            abstractions before they are justified.
          </p>
        </Card>
      </div>

      <Card eyebrow="Architecture" title="What this base optimizes for">
        <ul className="list">
          {architectureSignals.map((signal) => (
            <li key={signal}>{signal}</li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

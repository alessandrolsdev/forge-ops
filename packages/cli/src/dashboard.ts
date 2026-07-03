import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { computeLocalHealthReport } from './score.js';

const DASHBOARD_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>ForgeOps — Automation Health</title>
<style>
  :root { color-scheme: light dark; font-family: 'Segoe UI', system-ui, sans-serif; }
  body { margin: 0; padding: 32px 16px; background: #f4f5ef; color: #1c242f; }
  @media (prefers-color-scheme: dark) { body { background: #14181f; color: #e8e8e4; } }
  main { max-width: 720px; margin: 0 auto; display: grid; gap: 20px; }
  .card { border: 1px solid rgba(120,120,120,0.25); border-radius: 16px; padding: 24px; background: rgba(255,255,255,0.6); }
  @media (prefers-color-scheme: dark) { .card { background: rgba(255,255,255,0.04); } }
  h1 { margin: 0; font-size: 20px; }
  .score { font-size: 56px; font-weight: 700; line-height: 1; }
  .badge { display: inline-block; margin-left: 12px; padding: 4px 14px; border-radius: 999px; font-size: 13px; font-weight: 600; text-transform: uppercase; }
  .badge.healthy { background: rgba(22,163,74,0.16); color: #16a34a; }
  .badge.attention { background: rgba(217,119,6,0.18); color: #d97706; }
  .badge.critical { background: rgba(220,38,38,0.16); color: #dc2626; }
  ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
  li { display: flex; gap: 10px; align-items: baseline; font-size: 14px; }
  li .marker { font-weight: 700; width: 18px; }
  li.compliant .marker { color: #16a34a; }
  li.non_compliant .marker { color: #dc2626; }
  li .points { margin-left: auto; opacity: 0.7; font-variant-numeric: tabular-nums; }
  .note { font-size: 13px; opacity: 0.75; }
</style>
</head>
<body>
<main>
  <div class="card">
    <h1 id="title">ForgeOps — Automation Health</h1>
    <p><span class="score" id="score">…</span><span class="badge" id="grade"></span></p>
    <ul id="signals"></ul>
    <p class="note" id="ci"></p>
  </div>
</main>
<script>
  fetch('/api/score')
    .then((response) => response.json())
    .then((payload) => {
      const { computation, repositorySlug, ciDataSource, ciDataNote } = payload;
      document.getElementById('title').textContent =
        'ForgeOps — ' + (repositorySlug ? repositorySlug.owner + '/' + repositorySlug.name : 'Automation Health');
      document.getElementById('score').textContent = computation.score + '/100';
      const grade = document.getElementById('grade');
      grade.textContent = computation.grade;
      grade.classList.add(computation.grade);
      const list = document.getElementById('signals');
      for (const signal of computation.signals) {
        const item = document.createElement('li');
        item.className = signal.status;
        item.innerHTML =
          '<span class="marker">' + (signal.status === 'compliant' ? '✓' : '✕') + '</span>' +
          '<span>' + signal.policyKey.replaceAll('_', ' ') + '</span>' +
          '<span class="points">' + signal.earnedPoints + '/' + signal.weight + '</span>';
        item.title = signal.details;
        list.appendChild(item);
      }
      const ci = document.getElementById('ci');
      ci.textContent = ciDataSource === 'github'
        ? 'CI reliability: ' + computation.ciReliability.earnedPoints + '/' + computation.ciReliability.weight +
          ' (' + computation.ciReliability.successfulRunCount + ' of ' + computation.ciReliability.consideredRunCount + ' recent runs succeeded)'
        : (ciDataNote || 'CI reliability unavailable.');
    })
    .catch(() => {
      document.getElementById('score').textContent = 'erro';
    });
</script>
</body>
</html>
`;

export const handleDashboardRequest = async (
  request: IncomingMessage,
  response: ServerResponse,
  repositoryDir: string,
): Promise<void> => {
  if (request.url?.startsWith('/api/score')) {
    try {
      const report = await computeLocalHealthReport({ repositoryDir });
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(JSON.stringify(report));
    } catch (error) {
      response.writeHead(500, { 'content-type': 'application/json' });
      response.end(
        JSON.stringify({
          error: error instanceof Error ? error.message : 'Unexpected error.',
        }),
      );
    }

    return;
  }

  response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  response.end(DASHBOARD_HTML);
};

export const startDashboard = (
  repositoryDir: string,
  port: number,
): Promise<Server> => {
  const server = createServer((request, response) => {
    void handleDashboardRequest(request, response, repositoryDir);
  });

  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => resolve(server));
  });
};

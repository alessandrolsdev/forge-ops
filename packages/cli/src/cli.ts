import { publishCiReport } from './ci-report.js';
import { startDashboard } from './dashboard.js';
import { runInit } from './init.js';
import { renderMarkdownReport, renderTerminalReport } from './render.js';
import { computeLocalHealthReport } from './score.js';

export interface CliIo {
  log: (message: string) => void;
  error: (message: string) => void;
}

const defaultIo: CliIo = {
  log: (message) => console.log(message),
  error: (message) => console.error(message),
};

const HELP_TEXT = `forgeops — automation health e review para o seu repositorio

Usage:
  forgeops init [--openrouter-key <key>] [--openrouter-model <model>] [--gemini-key <key>]
  forgeops score [--json | --markdown] [--github]
  forgeops dashboard [--port <port>]
  forgeops help

Commands:
  init       Cria .github/workflows/forgeops.yml (health + gatilho "@forgeops review"),
             pre-configura o Vitest quando ausente e grava as credenciais de review
             via gh CLI quando disponivel.
  score      Calcula o automation health score do repositorio atual. Com --github,
             tambem publica o resultado no job summary e como comentario do PR.
  dashboard  Sobe o dashboard local de automation health (padrao: http://127.0.0.1:4400).
`;

const readFlagValue = (args: string[], flag: string): string | undefined => {
  const index = args.indexOf(flag);

  if (index === -1) {
    return undefined;
  }

  const value = args[index + 1];

  return value && !value.startsWith('--') ? value : undefined;
};

export const runCli = async (
  argv: string[],
  io: CliIo = defaultIo,
  repositoryDir: string = process.cwd(),
): Promise<number> => {
  const [command, ...args] = argv;

  switch (command) {
    case undefined:
    case 'help':
    case '--help':
    case '-h': {
      io.log(HELP_TEXT);
      return 0;
    }

    case 'score': {
      const report = await computeLocalHealthReport({ repositoryDir });

      if (args.includes('--json')) {
        io.log(JSON.stringify(report, null, 2));
      } else if (args.includes('--markdown')) {
        io.log(renderMarkdownReport(report));
      } else {
        io.log(renderTerminalReport(report));
      }

      if (args.includes('--github')) {
        const publishResult = await publishCiReport({
          markdown: renderMarkdownReport(report),
        });

        if (publishResult.note) {
          io.error(publishResult.note);
        }
      }

      return 0;
    }

    case 'init': {
      const openrouterKey = readFlagValue(args, '--openrouter-key');
      const openrouterModel = readFlagValue(args, '--openrouter-model');
      const geminiKey = readFlagValue(args, '--gemini-key');
      const result = runInit({
        repositoryDir,
        ...(openrouterKey !== undefined ? { openrouterKey } : {}),
        ...(openrouterModel !== undefined ? { openrouterModel } : {}),
        ...(geminiKey !== undefined ? { geminiKey } : {}),
      });

      for (const file of result.createdFiles) {
        io.log(`created: ${file}`);
      }

      for (const file of result.skippedFiles) {
        io.log(`skipped (already exists): ${file}`);
      }

      for (const secret of result.configuredSecrets) {
        io.log(`configured via gh: ${secret}`);
      }

      for (const note of result.notes) {
        io.log(`note: ${note}`);
      }

      io.log(
        'done: open a pull request and comment "@forgeops review" to trigger the AI review.',
      );
      return 0;
    }

    case 'dashboard': {
      const portValue = readFlagValue(args, '--port');
      const port = portValue ? Number.parseInt(portValue, 10) : 4400;

      if (Number.isNaN(port) || port <= 0 || port > 65535) {
        io.error(`Invalid port: ${portValue ?? ''}`);
        return 1;
      }

      await startDashboard(repositoryDir, port);
      io.log(`ForgeOps dashboard running at http://127.0.0.1:${port}`);
      io.log('Press Ctrl+C to stop.');
      return 0;
    }

    default: {
      io.error(`Unknown command: ${command}`);
      io.log(HELP_TEXT);
      return 1;
    }
  }
};

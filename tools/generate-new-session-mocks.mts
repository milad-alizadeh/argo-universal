import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { mockClis } from '../mocks/cli/index.ts';
import { agentAdapters } from '../packages/agents/src/adapters.ts';
import { agentsList } from '../packages/api/mocks/session-list.ts';

const mocks = agentAdapters.map(({ agent }, index) => {
  const cli = mockClis[agent];
  const id = agentsList[index]?.agent;
  if (!cli || !id) throw new Error('Missing Agent mock');
  // Shared story mocks use neutral identities; model ids stay consistent across variations.
  return JSON.parse(
    JSON.stringify({ agent: id, ...cli.newSessionMock() }).replaceAll(
      agent,
      id,
    ),
  );
});
writeFileSync(
  new URL('../packages/api/mocks/new-session-options.json', import.meta.url),
  `${JSON.stringify(mocks, null, 2)}\n`,
);

execFileSync(
  'pnpm',
  [
    'exec',
    'oxfmt',
    '--write',
    fileURLToPath(
      new URL(
        '../packages/api/mocks/new-session-options.json',
        import.meta.url,
      ),
    ),
  ],
  { cwd: fileURLToPath(new URL('../', import.meta.url)) },
);

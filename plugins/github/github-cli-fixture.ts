import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { onTestFinished } from 'vitest';
import { pullOf, sha } from './github-fixture';
import type { FixturePull } from './github-fixture-types';

export const repository = 'owner/repository';

export const cliCheck = 'Build from CLI';

export const cliTitle = 'Read by the CLI';

// A `gh` on the PATH that answers pull request 12 of the repository as the logged-in CLI would, or refuses as it says.
export async function cliPath(
  answer: 'success' | 'denied' | 'checks-denied' | 'malformed',
  changes: Partial<FixturePull> = {},
): Promise<string[]> {
  const pull = pullOf(repository, 12, { title: cliTitle, ...changes })[1];

  const directory = await mkdtemp(join(tmpdir(), 'argo-fixture-gh-'));

  onTestFinished(() => rm(directory, { recursive: true, force: true }));

  const responses = {
    [`repos/${repository}`]: {},
    [`repos/${repository}/pulls?head=owner%3Afeature-12&state=all&per_page=100`]:
      [pull],
    [`repos/${repository}/pulls/12`]: pull,
    [`repos/${repository}/commits/${sha}/check-runs?per_page=100`]: {
      total_count: 1,
      check_runs: [
        { id: 1, name: cliCheck, status: 'completed', conclusion: 'success' },
      ],
    },
  };

  const script = `#!/usr/bin/env node
const endpoint = process.argv.at(-1);
const data = ${JSON.stringify(responses)}[endpoint];
const policy = ${JSON.stringify(answer)};
if (policy === 'denied' || (policy === 'checks-denied' && endpoint.includes('/check-runs')) || data === undefined) {
  process.stdout.write('HTTP/2 403 Forbidden\\r\\nContent-Type: application/json\\r\\n\\r\\n{}');
  process.exitCode = 1;
} else {
  process.stdout.write('HTTP/2 200 OK\\r\\nContent-Type: application/json\\r\\n\\r\\n' + (policy === 'malformed' ? '{' : JSON.stringify(data)));
}
`;

  await writeFile(join(directory, 'gh'), script, { mode: 0o755 });

  return [directory];
}

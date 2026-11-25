import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { onTestFinished } from 'vitest';
import { pullOf, sha } from './github-fixture';
import type { FixturePull } from './github-fixture-types';

const number = 12;

export const repository = 'owner/repository';

export const cliCheck = 'Build from CLI';

export const cliTitle = 'Read by the CLI';

export type Answer =
  | 'success'
  | 'denied'
  | 'checks-denied'
  | 'malformed'
  | 'limited';

// The epoch second the fixture's spent limit resets at; the test clock starts at 0.
export const resetSeconds = 120;

// A directory with a `gh` that answers pull request 12 of the repository as the logged-in CLI would, or refuses as it says, and logs each call.
export async function cliDirectory(
  answer: Answer,
  changes: Partial<FixturePull> = {},
): Promise<string> {
  const pull = pullOf(repository, number, { title: cliTitle, ...changes })[1];

  const directory = await mkdtemp(join(tmpdir(), 'argo-fixture-gh-'));

  onTestFinished(() => rm(directory, { recursive: true, force: true }));

  const responses = {
    [`repos/${repository}`]: {},
    [`repos/${repository}/pulls?head=owner%3Afeature-${number}&state=all&per_page=100`]:
      [pull],
    [`repos/${repository}/pulls/${number}`]: pull,
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
require('node:fs').appendFileSync(${JSON.stringify(join(directory, 'calls'))}, endpoint + '\\n');
if (policy === 'limited') {
  process.stdout.write('HTTP/2 403 Forbidden\\r\\nX-RateLimit-Remaining: 0\\r\\nX-RateLimit-Reset: ${resetSeconds}\\r\\n\\r\\n{}');
  process.exitCode = 1;
} else if (policy === 'denied' || (policy === 'checks-denied' && endpoint.includes('/check-runs')) || data === undefined) {
  process.stdout.write('HTTP/2 403 Forbidden\\r\\nContent-Type: application/json\\r\\n\\r\\n{}');
  process.exitCode = 1;
} else {
  process.stdout.write('HTTP/2 200 OK\\r\\nContent-Type: application/json\\r\\n\\r\\n' + (policy === 'malformed' ? '{' : JSON.stringify(data)));
}
`;

  await writeFile(join(directory, 'gh'), script, { mode: 0o755 });

  return directory;
}

export async function cliPath(
  answer: Answer,
  changes: Partial<FixturePull> = {},
): Promise<string[]> {
  return [await cliDirectory(answer, changes)];
}

// How many times the Plugin ran the fixture's `gh`.
export const cliCalls = async (directory: string): Promise<number> =>
  (await readFile(join(directory, 'calls'), 'utf8').catch(() => ''))
    .split('\n')
    .filter(Boolean).length;

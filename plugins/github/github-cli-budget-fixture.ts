import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { onTestFinished } from 'vitest';
import { pullOf, sha } from './github-fixture';

export const repository = 'owner/repository';

type Call = { endpoint: string; status: number };

// The answers the fixture's `gh` gives as JSON, by endpoint: the repository, each pull request and its head's Check runs.
function responsesOf(numbers: readonly number[]): string {
  const pulls = numbers.map((number) => [
    `repos/${repository}/pulls/${number}`,
    pullOf(repository, number)[1],
  ]);

  return JSON.stringify({
    [`repos/${repository}`]: {},
    [`repos/${repository}/commits/${sha}/check-runs?per_page=100`]: {
      total_count: 1,
      check_runs: [
        { id: 1, name: 'Build', status: 'completed', conclusion: 'success' },
      ],
    },
    ...Object.fromEntries(pulls),
  });
}

/*
 * A `gh` that answers as GitHub does through the logged-in CLI: each body has an ETag, and asked with
 * `-H 'If-None-Match: <etag>'` for the same body it answers 304, which GitHub does not count. Each call is logged
 * with its status.
 */
const scriptOf = (
  responses: string,
  log: string,
): string => `#!/usr/bin/env node
const fs = require('node:fs');
const crypto = require('node:crypto');
const argv = process.argv.slice(2);
const endpoint = argv.at(-1);
const data = ${responses}[endpoint];
const asked = argv.flatMap((arg, i) => argv[i - 1] === '-H' && /^if-none-match:/i.test(arg) ? [arg.replace(/^if-none-match:\\s*/i, '')] : [])[0];
const log = ${JSON.stringify(log)};
const spent = (fs.existsSync(log) ? fs.readFileSync(log, 'utf8') : '').split('\\n').filter((line) => line.endsWith(' 200')).length;
const limits = 'X-RateLimit-Limit: 5000\\r\\nX-RateLimit-Remaining: ' + (5000 - spent - 1) + '\\r\\nX-RateLimit-Resource: core\\r\\n';
if (data === undefined) {
  fs.appendFileSync(log, endpoint + ' 404\\n');
  process.stdout.write('HTTP/2 404 Not Found\\r\\nContent-Type: application/json\\r\\n\\r\\n{}');
  process.exitCode = 1;
} else {
  const body = JSON.stringify(data);
  const etag = '"' + crypto.createHash('sha1').update(body).digest('hex') + '"';
  if (asked === etag) {
    fs.appendFileSync(log, endpoint + ' 304\\n');
    process.stdout.write('HTTP/2 304 Not Modified\\r\\nEtag: ' + etag + '\\r\\n' + limits + '\\r\\n');
  } else {
    fs.appendFileSync(log, endpoint + ' 200\\n');
    process.stdout.write('HTTP/2 200 OK\\r\\nContent-Type: application/json\\r\\nEtag: ' + etag + '\\r\\n' + limits + '\\r\\n' + body);
  }
}
`;

// A directory with that `gh`, for the Plugin's PATH.
export async function cliPullsDirectory(
  numbers: readonly number[],
): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'argo-fixture-gh-'));

  onTestFinished(() => rm(directory, { recursive: true, force: true }));

  await writeFile(
    join(directory, 'gh'),
    scriptOf(responsesOf(numbers), join(directory, 'calls')),
    { mode: 0o755 },
  );

  return directory;
}

// Every call the fixture's `gh` answered, in order.
export async function cliCallsOf(directory: string): Promise<Call[]> {
  const text = await readFile(join(directory, 'calls'), 'utf8').catch(() => '');

  return text
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [endpoint = '', status = ''] = line.split(' ');

      return { endpoint, status: Number(status) };
    });
}

// The calls GitHub would have counted against the rate limit: all but its 304s.
const notModified = 304;

export const spentOf = (calls: readonly Call[]): number =>
  calls.filter(({ status }) => status !== notModified).length;

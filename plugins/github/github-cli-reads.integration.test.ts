import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it, onTestFinished } from 'vitest';
import { pullOf, sha } from './github-fixture';
import { attach, changesOf, discover } from './journey-calls-fixture';
import { journey, signedOutJourney } from './journey-fixture';
import { refreshed } from './journey-watch-fixture';

const slow = 30_000;

const repository = 'owner/repository';

const reference = `${repository}#12`;

const cliCheck = 'Build from CLI';

const cliTitle = 'Read by the CLI';

const pull = pullOf(repository, 12, { title: cliTitle })[1];

type Answer = 'success' | 'denied' | 'checks-denied' | 'malformed' | 'limited';

// The epoch second the fixture's spent limit resets at; the test clock starts at 0.
const resetSeconds = 120;

async function cliDirectory(answer: Answer): Promise<string> {
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

const cliPath = async (answer: Answer): Promise<string[]> => [
  await cliDirectory(answer),
];

// How many times the Plugin ran the fixture's `gh`.
const cliCalls = async (directory: string): Promise<number> =>
  (await readFile(join(directory, 'calls'), 'utf8').catch(() => ''))
    .split('\n')
    .filter(Boolean).length;

const settings = new Map([['prefer-github-cli', true]]);

it(
  'discovers and attaches a branch pull request and reads its Checks through the CLI while signed out of Argo',
  async () => {
    const run = await signedOutJourney({
      path: await cliPath('success'),
      settings,
    });

    expect(await discover(run)).toEqual({
      result: 'found',
      pullRequests: [{ repository, number: 12 }],
    });
    expect(await changesOf(run)).toMatchObject([
      {
        title: cliTitle,
        checks: [{ name: cliCheck, state: 'passed' }],
      },
    ]);
    expect(run.github.pullReads()).toEqual([]);
    expect(run.github.checkReads()).toEqual([]);
  },
  slow,
);

it.each(['denied', 'malformed'] as const)(
  'falls back to the Project Account when the CLI response is %s',
  async (answer) => {
    const run = await journey({ path: await cliPath(answer), settings });

    expect(await discover(run)).toMatchObject({ result: 'found' });
    expect(await changesOf(run)).toMatchObject([{ title: 'Add the thing' }]);
    expect(run.github.listReads().length).toBeGreaterThan(0);
    expect(run.github.checkReads().length).toBeGreaterThan(0);
  },
  slow,
);

it(
  'attaches a named pull request through the CLI while signed out of Argo',
  async () => {
    const run = await signedOutJourney({
      path: await cliPath('success'),
      settings,
    });

    await attach(run, reference);

    expect(await changesOf(run)).toMatchObject([{ title: cliTitle }]);
    expect(run.github.pullReads()).toEqual([]);
  },
  slow,
);

it(
  'uses the Project Account for Checks when the CLI can read the pull request only',
  async () => {
    const run = await journey({
      path: await cliPath('checks-denied'),
      settings,
    });

    await attach(run, reference);

    expect(await changesOf(run)).toMatchObject([{ title: cliTitle }]);
    expect(run.github.pullReads()).toEqual([]);
    expect(run.github.checkReads().length).toBeGreaterThan(0);
  },
  slow,
);

// GitHub refuses a spent limit the same through the CLI: each read running `gh` again would only be refused again.
it(
  'runs the CLI no more while GitHub says its rate limit is spent, reads through the Project Account, and runs it again after the reset',
  async () => {
    const directory = await cliDirectory('limited');
    const run = await journey({ path: [directory], settings });

    await attach(run, reference);
    expect(await changesOf(run)).toMatchObject([{ title: 'Add the thing' }]);

    const refused = await cliCalls(directory);
    const accountReads = run.github.pullReads().length;

    expect(refused).toBeGreaterThan(0);

    await refreshed(run);
    await refreshed(run);

    expect(await cliCalls(directory)).toBe(refused);
    expect(run.github.pullReads().length).toBeGreaterThan(accountReads);

    await run.test.clock.advance(resetSeconds * 1000);
    await refreshed(run);

    expect(await cliCalls(directory)).toBeGreaterThan(refused);
  },
  slow,
);

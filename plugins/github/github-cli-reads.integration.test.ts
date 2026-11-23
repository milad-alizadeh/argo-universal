import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it, onTestFinished } from 'vitest';
import { pullOf, sha } from './github-fixture';
import { attach, changesOf, discover } from './journey-calls-fixture';
import { journey, signedOutJourney } from './journey-fixture';

const slow = 30_000;

const repository = 'owner/repository';

const reference = `${repository}#12`;

const cliCheck = 'Build from CLI';

const cliTitle = 'Read by the CLI';

const pull = pullOf(repository, 12, { title: cliTitle })[1];

async function cliPath(
  answer: 'success' | 'denied' | 'checks-denied' | 'malformed',
): Promise<string[]> {
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

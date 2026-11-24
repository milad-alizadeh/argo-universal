import { expect, it } from 'vitest';
import { cliCheck, cliPath, cliTitle, repository } from './github-cli-fixture';
import { attach, changesOf, discover } from './journey-calls-fixture';
import { journey, signedOutJourney } from './journey-fixture';

const slow = 30_000;

const reference = `${repository}#12`;

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

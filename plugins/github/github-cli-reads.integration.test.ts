import { expect, it } from 'vitest';
import {
  cliCalls,
  cliCheck,
  cliDirectory,
  cliPath,
  cliTitle,
  repository,
  resetSeconds,
} from './github-cli-fixture';
import { attach, changesOf, discover } from './journey-calls-fixture';
import { journey, signedOutJourney } from './journey-fixture';
import { refreshed } from './journey-watch-fixture';

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

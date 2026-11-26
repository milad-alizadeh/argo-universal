import { expect, it } from 'vitest';
import { failChecks, lintPrompt, texts, watch } from './auto-fix-fixture';
import { attached as attachedTwelve, refresh, set } from './auto-merge-fixture';
import {
  cliCallsOf,
  cliPullsDirectory,
  spentOf,
} from './github-cli-budget-fixture';
import { sha } from './github-fixture';
import { attach } from './journey-calls-fixture';
import { journey, type Journey } from './journey-fixture';
import { promptsSent } from './journey-prompts-fixture';
import { changePull, openChanges, tick } from './journey-watch-fixture';

const slow = 120_000;

const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

// Ten minutes of Argo's Changes clock, which ticks every 30 seconds.
const ticks = 20;

const settings = new Map([['prefer-github-cli', true]]);

type Spent = { rest: number; graphql: number; cli: number };

async function spentIn(run: Journey, directory: string): Promise<Spent> {
  const graphql = run.github.requests.filter(
    ({ path, host }) => host === 'api.github.com' && path === '/graphql',
  ).length;

  return {
    rest: run.github.budget.used - graphql,
    graphql,
    cli: spentOf(await cliCallsOf(directory)),
  };
}

const minus = (after: Spent, before: Spent): Spent => ({
  rest: after.rest - before.rest,
  graphql: after.graphql - before.graphql,
  cli: after.cli - before.cli,
});

// Ten open pull requests attached to one Session, with its Changes open in an App, read the CLI way.
async function tenOpen(): Promise<{ run: Journey; directory: string }> {
  const directory = await cliPullsDirectory(numbers);
  const run = await journey({ path: [directory], settings });

  for (const number of numbers) {
    changePull(run, number, {});
    await attach(run, `#${number}`);
  }

  const open = openChanges(run);

  await open.next();
  // The App keeps reading the list, as its subscription does, so each tick asks the Plugin again.
  open.next().catch(() => {});
  await run.test.settled();

  return { run, directory };
}

// Nothing changes on GitHub while the list stays open, so GitHub has nothing new to send and should count nothing.
it(
  'spends no REST requests on ten unchanged open pull requests read through the CLI for ten minutes',
  async () => {
    const { run, directory } = await tenOpen();
    const before = await spentIn(run, directory);

    for (let index = 0; index < ticks; index += 1) {
      await tick(run);
      await run.test.settled();
    }

    const spent = minus(await spentIn(run, directory), before);

    expect(spent.cli + spent.rest).toBe(0);
  },
  slow,
);

// GitHub's charges for the signed-in token, through Argo's fetch: every call but a 304.
const charged = (run: Journey): number => run.github.budget.used;

// What the fixture's next answer says is left: a fifth of GitHub's 5,000.
const fifthLeft = 4000;

// Under a quarter of the limit left, the Watch, which nobody waits on, leaves the rest for the person's other tools.
it(
  'asks GitHub nothing on the Watch while less than a quarter of the rate limit is left, and acts on the next Watch once it is back',
  async () => {
    const run = await attachedTwelve();

    await set(run, { kind: 'fix', on: true });
    run.github.budget.used = fifthLeft;
    await refresh(run);
    failChecks(run, sha, 'lint');

    const before = charged(run);

    await watch(run);

    expect(charged(run)).toBe(before);
    expect(promptsSent(run)).toEqual([]);

    run.github.budget.used = 0;
    await refresh(run);
    await watch(run);

    expect(texts(run)).toEqual([lintPrompt]);
  },
  slow,
);

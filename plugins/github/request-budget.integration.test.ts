import { expect, it } from 'vitest';
import { cliCallsOf, cliPullsDirectory, spentOf } from './github-cli-budget-fixture';
import { changePull, openChanges, tick } from './journey-watch-fixture';
import { attach } from './journey-calls-fixture';
import { journey, type Journey } from './journey-fixture';

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

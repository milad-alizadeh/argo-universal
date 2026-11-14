import { expect, it } from 'vitest';
import { headFrom, pullOf } from './github-fixture';
import {
  attach,
  changesOf,
  listed,
  switchBranch,
} from './journey-calls-fixture';
import { journey } from './journey-fixture';

const slow = 30_000;

const own = 'owner/repository#12';

const fork = 'fork-owner/repository#12';

// A PR whose head is another fork's branch of the same name as the Checkout's.
const sameNameElsewhere = pullOf('owner/repository', 30, {
  title: 'Add the thing',
  head: headFrom('someone-else', 'feature-12'),
});

const onCheckout = (changes: readonly { onCheckout?: true }[]): boolean[] =>
  changes.map((change) => change.onCheckout === true);

it(
  "marks the pull request whose head is the Session's Checkout repository and branch as the Checkout's own line of work",
  async () => {
    const run = await journey();

    await attach(run, own);

    expect(await changesOf(run)).toMatchObject([
      { id: 'github:owner/repository#12', onCheckout: true },
    ]);
    expect(await listed(run)).toMatchObject({
      changes: [{ onCheckout: true }],
    });
  },
  slow,
);

it(
  "does not mark a pull request from another fork's branch of the same name, nor one with the same title",
  async () => {
    const run = await journey();

    run.github.pulls.set(...sameNameElsewhere);
    await attach(run, fork);
    await attach(run, 'owner/repository#30');

    expect(onCheckout(await changesOf(run))).toEqual([false, false]);
  },
  slow,
);

it(
  'stops marking a pull request once the Session is on another branch, and never carries the Checkout totals into one',
  async () => {
    const run = await journey();

    await attach(run, own);
    switchBranch(run, 'feature-20');

    expect(await changesOf(run)).toMatchObject([
      { totals: { files: 3, additions: 10, deletions: 2 } },
    ]);
    expect(onCheckout(await changesOf(run))).toEqual([false]);
  },
  slow,
);

import { expect, it } from 'vitest';
import { sha } from './github-fixture';
import { attach } from './journey-calls';
import {
  attached,
  changePull,
  idOf,
  newHead,
  openChanges,
  tick,
} from './journey-watch';

const slow = 30_000;

const renamed = 'Renamed';

it(
  'refreshes the title, head, stage, draft, conflict and Checks of each visible pull request on its own, without reopening the Session',
  async () => {
    const run = await attached(1, 2);
    const open = openChanges(run);

    expect(await open.next()).toMatchObject([
      { title: 'Pull request 1', stage: 'open', head: sha },
      { title: 'Pull request 2', stage: 'open', head: sha },
    ]);

    changePull(run, 1, {
      title: renamed,
      head: { ref: 'feature-1', sha: newHead },
      draft: true,
      mergeable_state: 'dirty',
    });
    changePull(run, 2, { state: 'closed', merged: true });
    await tick(run);

    expect(await open.next()).toMatchObject([
      {
        id: idOf(1),
        title: renamed,
        head: newHead,
        stage: 'open',
        draft: true,
        conflict: true,
      },
      { id: idOf(2), title: 'Pull request 2', stage: 'merged' },
    ]);
  },
  slow,
);

it(
  'refreshes only the pull request that changed and leaves the other as it was',
  async () => {
    const run = await attached(1, 2);
    const open = openChanges(run);
    const [, unchanged] = await open.next();

    changePull(run, 1, { title: renamed });
    await tick(run);

    const [first, second] = await open.next();

    expect(first).toMatchObject({ title: renamed });
    expect(second).toEqual(unchanged);
  },
  slow,
);

it(
  'shows a pull request attached later in a list that is already open',
  async () => {
    const run = await attached(1);
    const open = openChanges(run);

    await open.next();
    changePull(run, 2, { title: 'Second' });
    await attach(run, '#2');

    expect(await open.next()).toMatchObject([
      { id: idOf(1) },
      { id: idOf(2), title: 'Second' },
    ]);
  },
  slow,
);

it(
  'keeps the order Changes were attached in through refreshes',
  async () => {
    const run = await attached(3, 1, 2);
    const open = openChanges(run);

    await open.next();
    changePull(run, 2, { title: 'Touched first' });
    changePull(run, 3, { title: 'Touched last' });
    await tick(run);

    expect(await open.next()).toMatchObject([
      { id: idOf(3) },
      { id: idOf(1) },
      { id: idOf(2) },
    ]);
  },
  slow,
);

it(
  'keeps draft and conflict together on a refreshed pull request',
  async () => {
    const run = await attached(1);
    const open = openChanges(run);

    await open.next();
    changePull(run, 1, { draft: true, mergeable_state: 'dirty' });
    await tick(run);

    expect(await open.next()).toMatchObject([{ draft: true, conflict: true }]);
  },
  slow,
);

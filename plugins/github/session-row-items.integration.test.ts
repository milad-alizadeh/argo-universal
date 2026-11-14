import { expect, it } from 'vitest';
import { pullOf } from './github-fixture';
import { attach, attributedRowItemsOf, detach } from './journey-calls-fixture';
import { caller, journey } from './journey-fixture';

const slow = 30_000;

const repository = 'owner/repository';

const icon = { sf: 'arrow.triangle.pull', material: 'merge_type' };

const refreshMs = 60_000;

it(
  "fills the Session row with each attached pull request's number, in the stage's tone, with its title and stage",
  async () => {
    const run = await journey();

    run.github.pulls.set(...pullOf(repository, 1, { title: 'Open one' }));
    run.github.pulls.set(
      ...pullOf(repository, 2, {
        title: 'Merged one',
        state: 'closed',
        merged: true,
      }),
    );
    run.github.pulls.set(
      ...pullOf(repository, 3, { title: 'Closed one', state: 'closed' }),
    );

    for (const number of [2, 1, 3]) await attach(run, `#${number}`);

    expect(await attributedRowItemsOf(run)).toEqual([
      {
        pluginId: 'github',
        item: {
          icon,
          text: '#2',
          tone: 'done',
          tooltip: 'Merged one · Merged',
        },
      },
      {
        pluginId: 'github',
        item: {
          icon,
          text: '#1',
          tone: 'success',
          tooltip: 'Open one · Open',
        },
      },
      {
        pluginId: 'github',
        item: {
          icon,
          text: '#3',
          tone: 'danger',
          tooltip: 'Closed one · Closed',
        },
      },
    ]);
  },
  slow,
);

it(
  'keeps the number of a pull request GitHub can no longer be read for, with the details last read',
  async () => {
    const run = await journey();

    run.github.pulls.set(...pullOf(repository, 5, { title: 'Known' }));
    await attach(run, '#5');
    await attributedRowItemsOf(run);

    run.github.failWith.status = 500;
    await run.test.clock.advance(refreshMs);

    expect(await attributedRowItemsOf(run)).toMatchObject([
      { item: { text: '#5', tone: 'success', tooltip: 'Known · Open' } },
    ]);
  },
  slow,
);

it(
  'shows only the number of a pull request that was never read',
  async () => {
    const run = await journey();

    run.github.pulls.set(...pullOf(repository, 6));
    await attach(run, '#6');
    run.github.pulls.delete(`${repository}#6`);
    await run.test.clock.advance(refreshMs);

    const items = await attributedRowItemsOf(run);

    expect(items.map(({ item }) => item)).toEqual([
      { icon, text: '#6', tooltip: 'Pull request #6' },
    ]);
  },
  slow,
);

it(
  'has no action, as there is no Plugin page for pull requests',
  async () => {
    const run = await journey();

    await attach(run, '#12');

    const [first] = await attributedRowItemsOf(run);

    expect(first?.item).not.toHaveProperty('action');
  },
  slow,
);

it(
  'puts the pull requests before the Issue tracker items when both fill the row',
  async () => {
    const run = await journey();

    await attach(run, '#12');
    await run.test.operations.run({
      name: 'attach',
      pluginId: 'issue-tracker',
      params: { number: 42 },
      caller,
    });

    const items = await attributedRowItemsOf(run);

    expect(items.map(({ pluginId, item }) => [pluginId, item])).toMatchObject([
      ['github', { text: '#12' }],
      ['issue-tracker', { text: '#42' }],
    ]);
  },
  slow,
);

it(
  'drops a pull request from the row once it is detached',
  async () => {
    const run = await journey();

    await attach(run, '#12');
    await detach(run, '#12');

    expect(await attributedRowItemsOf(run)).toEqual([]);
  },
  slow,
);

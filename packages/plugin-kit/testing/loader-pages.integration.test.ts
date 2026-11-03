import { expect, it } from 'vitest';
import { dataFixture } from '../mocks/data-fixture';

const close = {
  name: 'close',
  label: 'Close the Issue',
  description: 'Closes one Issue.',
  tier: 'act' as const,
  params: {
    number: { type: 'number' as const, description: 'The Issue', required: true },
  },
};

// A Loader page over a list the Plugin keeps in memory, with load more, a refresh and a write.
const source = `import { List, ListItem, Screen, useState } from '@argo/plugin-kit';

const closed = new Set();
let reads = 0;

function Row({ number }) {
  return (
    <ListItem
      title={'Issue ' + number}
      finished={closed.has(number)}
    />
  );
}

export function register(argo) {
  argo.operations.register('close', async ({ number }) => {
    closed.add(number);
    return { closed: number };
  });

  argo.pages.define('/projects/:project/issues', {
    state: { limit: 2 },
    load: async ({ params, state }) => {
      reads += 1;
      const numbers = [1, 2, 3, 4, 5].slice(0, state.limit);
      return { project: params.project, numbers, reads };
    },
    render: (data, to) => (
      <Screen title={data.project + ' read ' + data.reads}>
        <List
          pagination={{ hasMore: data.numbers.length < 5, onLoadMore: to.set({ limit: data.numbers.length + 2 }) }}
          onRefresh={to.set({})}
        >
          {data.numbers.map((number) => (
            <Row key={String(number)} number={number} />
          ))}
        </List>
      </Screen>
    ),
  });

  argo.pages.define('/hooks', {
    load: () => null,
    render: () => <Uses />,
  });

  argo.pages.define('/functions', {
    load: () => null,
    render: () => <ListItem title="Tap" onPress={() => {}} />,
  });

  argo.pages.define('/throws', {
    load: async () => {
      throw new Error('GitHub refused the read');
    },
    render: () => null,
  });
}

function Uses() {
  const [value] = useState(0);
  return <ListItem title={String(value)} />;
}
`;

const start = async () => {
  const fixture = await dataFixture(source, { operations: [close] });

  return fixture.start();
};

const titlesOf = (answer: Awaited<ReturnType<Kit['pages']['draw']>>) => {
  if (!answer.ok) throw new Error(answer.error);

  const list = answer.root.children[0];

  return list?.children.map((row) => row.props.title);
};

type Kit = Awaited<ReturnType<typeof start>>;

it('draws a Loader page at its address, with the Page state over its defaults', async () => {
  const kit = await start();

  const first = await kit.pages.draw({ path: '/projects/argo/issues' });

  expect(first).toMatchObject({
    ok: true,
    root: { type: 'Screen', props: { title: 'argo read 1' } },
  });
  expect(titlesOf(first)).toEqual(['Issue 1', 'Issue 2']);

  const more = await kit.pages.draw({
    path: '/projects/argo/issues',
    pageState: { limit: 4 },
  });

  expect(titlesOf(more)).toEqual(['Issue 1', 'Issue 2', 'Issue 3', 'Issue 4']);
});

it('puts Page state changes and keys in the tree as values', async () => {
  const kit = await start();

  const answer = await kit.pages.draw({ path: '/projects/argo/issues' });

  if (!answer.ok) throw new Error(answer.error);

  const list = answer.root.children[0];

  expect(list?.props).toMatchObject({
    pagination: { hasMore: true, onLoadMore: { pageState: { limit: 4 } } },
    onRefresh: { pageState: {} },
  });
  expect(list?.children.map((row) => row.key)).toEqual(['1', '2']);
});

it('runs a declared Operation and answers every Loader page as stale', async () => {
  const kit = await start();

  const run = await kit.pages.run({ operation: 'close', args: { number: 2 } });

  expect(run).toEqual({
    result: { closed: 2 },
    stale: ['/projects/:project/issues', '/hooks', '/functions', '/throws'],
  });

  const answer = await kit.pages.draw({ path: '/projects/argo/issues' });

  if (!answer.ok) throw new Error(answer.error);

  expect(answer.root.children[0]?.children[1]?.props.finished).toBe(true);
});

it('refuses an Operation call the manifest does not allow', async () => {
  const kit = await start();

  await expect(
    kit.pages.run({ operation: 'close', args: { number: 'two' } }),
  ).rejects.toThrow(/number/);
});

it('fails a draw whose Render calls a hook or passes a function', async () => {
  const kit = await start();

  expect(await kit.pages.draw({ path: '/hooks' })).toEqual({
    ok: false,
    error: 'Uses calls a hook, and a Render is pure',
  });
  expect(await kit.pages.draw({ path: '/functions' })).toEqual({
    ok: false,
    error: 'A Render passes values, not functions: onPress',
  });
});

it('fails a draw with what the Loader threw, or a path no page matches', async () => {
  const kit = await start();

  expect(await kit.pages.draw({ path: '/throws' })).toEqual({
    ok: false,
    error: 'GitHub refused the read',
  });
  expect(await kit.pages.draw({ path: '/nowhere' })).toEqual({
    ok: false,
    error: 'No Loader page at /nowhere',
  });
});

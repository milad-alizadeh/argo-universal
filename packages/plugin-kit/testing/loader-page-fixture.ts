import { dataFixture } from '../mocks/data-fixture';
import { attach, close, note } from './loader-page-operations';

/*
 * The one Plugin the kit's Loader page tests share: a Loader page over a paged list it keeps in memory, with a
 * search, load more, a refresh and a write, a draft whose Button notes what was typed, one whose cursor repeats
 * the boundary item, and two pages reading one named read.
 */
const source = `import { Button, List, ListItem, Screen } from '@argo/plugin-kit';

const closed = new Set();
const notes = [];
const numbers = [1, 2, 3, 4, 5];
globalThis.listed = [];

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

  argo.operations.register('attach', async () => ({ attached: true }));

  argo.operations.register('note', async ({ title }) => {
    notes.push(title);
    return { noted: title };
  });

  // A draft search whose Button notes the draft the page drew for, and the titles noted so far.
  argo.pages.define('/draft', {
    state: { title: '' },
    load: () => ({ notes: notes.join(',') }),
    render: (data, to, { state }) => (
      <Screen title="Draft" search={{ label: 'Title' }} value={state.title} onChangeText={to.bind('title')}>
        <ListItem title={'Noted: ' + data.notes} />
        <Button label="Note" onPress={to.run('note', { title: state.title })} />
      </Screen>
    ),
  });

  // A named read the two counted pages share: Argo keeps its answer until a write.
  const count = argo.queries.define('count', async ({ n }) => {
    globalThis.counted = (globalThis.counted ?? 0) + 1;
    return { n, times: globalThis.counted };
  });

  for (const path of ['/counted', '/counted-too'])
    argo.pages.define(path, {
      load: ({ read }) => read(count({ n: 1 })),
      render: (data) => <ListItem title={String(data.times)} />,
    });

  argo.pages.define('/listed', {
    load: () => null,
    render: () => <ListItem title={globalThis.listed.join(',')} />,
  });

  argo.pages.define('/projects/:project/issues', {
    state: { query: '' },
    load: async ({ params }) => ({ project: params.project }),
    list: async ({ state }, cursor) => {
      globalThis.listed.push(String(cursor));
      const from = cursor === null ? 0 : Number(cursor);
      const found = numbers.filter((number) => String(number).includes(state.query));
      const next = from + 2 < found.length ? String(from + 2) : null;
      return { items: found.slice(from, from + 2), cursor: next };
    },
    render: (data, to, { state, list }) => (
      <Screen
        title={data.project}
        search={{ label: 'Search' }}
        value={state.query}
        onChangeText={to.bind('query')}
      >
        <List
          pagination={{ hasMore: list.hasMore, onLoadMore: list.loadMore }}
          onRefresh={to.set({})}
        >
          {list.items.map((number) => (
            <Row key={String(number)} number={number} />
          ))}
        </List>
      </Screen>
    ),
  });

  // Numbers 7 down to 1, three a page; a cursor is the last number shown and the next page starts at it.
  argo.pages.define('/inclusive', {
    load: () => null,
    list: async (_input, cursor) => {
      const top = cursor === null ? 7 : Number(cursor);
      const items = [top, top - 1, top - 2].filter((number) => number > 0);
      return { items, cursor: items.length === 3 ? String(items.at(-1)) : null };
    },
    render: (_data, _to, { list }) => (
      <List pagination={{ hasMore: list.hasMore, onLoadMore: list.loadMore }}>
        {list.items.map((number) => (
          <Row key={String(number)} number={number} />
        ))}
      </List>
    ),
  });

  // A list with no end: every page answers one item and a cursor for the next.
  argo.pages.define('/endless', {
    load: () => null,
    list: async (_input, cursor) => {
      const at = cursor === null ? 0 : Number(cursor);
      return { items: [at], cursor: String(at + 1) };
    },
    render: (_data, _to, { list }) => (
      <List pagination={{ hasMore: list.hasMore, onLoadMore: list.loadMore }}>
        {list.items.map((number) => (
          <Row key={String(number)} number={number} />
        ))}
      </List>
    ),
  });

  // Issue 1, which closes as an Operation and links to the listed cursors.
  argo.pages.define('/issue', {
    load: () => ({ closed: closed.has(1) }),
    render: (data, to) => (
      <Screen title="Issue 1">
        <ListItem title={data.closed ? 'Closed' : 'Open'} onPress={to.run('close', { number: 1 })} />
        <ListItem title="Cursors" onPress={to.go('/listed')} />
      </Screen>
    ),
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
`;

export const issuesPath = '/projects/argo/issues';

export async function start(): Promise<Kit> {
  const fixture = await dataFixture(source, {
    operations: [attach, close, note],
  });

  return fixture.start();
}

export type Kit = Awaited<
  ReturnType<Awaited<ReturnType<typeof dataFixture>>['start']>
>;

type Answer = Awaited<ReturnType<Kit['pages']['draw']>>;

type Tree = Extract<Answer, { kind: 'tree' }>;

// The drawn whole tree, or why there is none thrown.
export function treeOf(answer: Answer): Tree {
  if (answer.kind === 'failed') throw new Error(answer.error);

  if (answer.kind !== 'tree') throw new Error(`Answered ${answer.kind}`);

  return answer;
}

export const titlesOf = (answer: Answer): unknown[] | undefined => {
  const list = treeOf(answer).root.children[0];

  return list?.children.map((row) => row.props.title);
};

// The cursors the paged list was read from since the Plugin started, as the Plugin logged them.
export async function listed(kit: Kit): Promise<string> {
  const { title } = treeOf(await kit.pages.draw({ path: '/listed' })).root
    .props;

  return typeof title === 'string' ? title : '';
}

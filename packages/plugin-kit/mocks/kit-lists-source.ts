// The board's move, declared as the manifest declares it; its params are named apart from the move's fields.
export const moveCard = {
  name: 'moveCard',
  label: 'Move a card',
  description: 'Moves a card to a lane.',
  tier: 'act' as const,
  params: {
    card: { type: 'string' as const, description: 'The card', required: true },
    lane: { type: 'string' as const, description: 'The lane it lands in' },
    index: {
      type: 'number' as const,
      description: 'Its place in the lane',
      required: true,
    },
  },
};

/*
 * A Plugin drawn through the kit the way a real one is: its Loader pages define, the Engine draws them, and a press
 * acts on what the tree holds. The board keeps its lanes in the worker, and a move runs `moveCard` with the fields
 * the List reports.
 */
export const kitListsSource = `import { Action, Image, List, ListItem, Screen, Svg, Text, applyListMove } from '@argo/plugin-kit';

const xml = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><path d="M0 9L10 1" stroke="currentColor" fill="none"/></svg>';

const gallery = (picture, selected, to) => (
  <Screen title="Gallery">
    <List direction="horizontal" tileSize="md" aspect="landscape">
      {['Overview', 'Checkout'].map((title) => <ListItem key={title} title={title} media={<Image source={picture} accessibilityLabel={title + ' preview'} />} />)}
    </List>
    <List layout="grid" columns="auto" tileSize="sm" aspect="landscape">
      {[{ id: '1', title: 'Metric 1' }, { id: '2', title: 'Metric 2' }].map((metric) => (
        <ListItem key={metric.id} title={metric.title} media={<Svg xml={xml} label={metric.title + ' trend'} />} selected={metric.id === selected} onPress={to.set({ selected: metric.id })} />
      ))}
    </List>
  </Screen>
);

let lanes = [
  { id: 'todo', title: 'To do', rows: [{ id: 'login', title: 'Fix login' }, { id: 'docs', title: 'Write docs' }] },
  { id: 'done', title: 'Done', rows: [] },
];

// The List reports a move's id, section and index; the payload fills the Operation's own params with them.
const board = (current, to) => (
  <Screen title="Card lanes">
    <List accessibilityLabel="Board" layout="lanes" appearance="cards" onMove={to.run('moveCard', { card: to.payload('id'), lane: to.payload('section'), index: to.payload('index') })}>
      {current.map((lane) => (
        <List.Section key={lane.id} id={lane.id} title={lane.title}>
          {lane.rows.map((card) => <ListItem key={card.id} id={card.id} title={card.title} />)}
        </List.Section>
      ))}
    </List>
  </Screen>
);

const lineTexts = (count) => Array.from({ length: count }, (_, index) => 'Line ' + (index + 1));

const log = (count, to) => (
  <Screen title="Log" actions={<Action label="Append line" icon="add" onPress={to.set({ lines: count + 1 })} />}>
    <List anchor="end">{lineTexts(count).map((line) => <Text key={line}>{line}</Text>)}</List>
  </Screen>
);

// Six posts, three a page; a cursor is the index the next page starts at.
const posts = Array.from({ length: 6 }, (_, index) => ({ id: index + 1, title: 'Post ' + (index + 1) }));

const postsPage = (cursor) => {
  const from = cursor === null ? 0 : Number(cursor);
  return { items: posts.slice(from, from + 3), cursor: from + 3 < posts.length ? String(from + 3) : null };
};

const paged = (list) => (
  <Screen title="Paged">
    <List accessibilityLabel="Posts" pagination={{ hasMore: list.hasMore, onLoadMore: list.loadMore }} empty={<Text>No posts</Text>}>
      {list.items.map((post) => <ListItem key={post.id} id={String(post.id)} title={post.title} />)}
    </List>
  </Screen>
);

export function register(argo) {
  argo.pages.define('/gallery', {
    state: { selected: '' },
    load: () => argo.assets.resolve({ asset: 'assets/poster.jpeg' }),
    render: (picture, to, { state }) => gallery(picture, state.selected, to),
  });
  argo.operations.register('moveCard', ({ card, lane, index }) => {
    lanes = applyListMove(lanes, { id: card, section: lane, index });
  });
  argo.pages.define('/board', {
    load: () => lanes,
    render: (current, to) => board(current, to),
  });
  argo.pages.define('/log', {
    state: { lines: 80 },
    load: () => null,
    render: (_data, to, { state }) => log(state.lines, to),
  });
  argo.pages.define('/paged', {
    load: () => null,
    list: (_input, cursor) => postsPage(cursor),
    render: (_data, _to, { list }) => paged(list),
  });
}`;

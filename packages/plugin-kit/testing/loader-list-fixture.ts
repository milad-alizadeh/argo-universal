import { dataFixture } from '../mocks/data-fixture';
import type { Kit } from './loader-page-fixture';

/*
 * Two paged lists the kit's paged list tests share apart from the main fixture: one with no end, and one whose
 * items name the App it was read for.
 */
const source = `import { List, ListItem } from '@argo/plugin-kit';

export function register(argo) {
  // A list whose items name the App it was read for.
  argo.pages.define('/by-app', {
    load: () => null,
    list: async ({ context }) => ({
      items: [context.surface?.platform + (context.serverDevice ? ' on the Server' : '')],
      cursor: null,
    }),
    render: (_data, _to, { list }) => (
      <List>
        {list.items.map((app) => (
          <ListItem key={app} title={app} />
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
          <ListItem key={String(number)} title={'Issue ' + number} />
        ))}
      </List>
    ),
  });
}
`;

export async function startLists(): Promise<Kit> {
  const fixture = await dataFixture(source, { operations: [] });

  return fixture.start();
}

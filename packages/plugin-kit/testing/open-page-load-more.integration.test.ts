import { expect, it } from 'vitest';
import { dataFixture } from '../mocks/data-fixture';

// A paged list whose second page fails while the service is busy, as a busy service refuses a load more.
const source = `import { List, ListItem } from '@argo/plugin-kit';

export function register(argo) {
  argo.pages.define('/', {
    load: () => null,
    list: async (_input, cursor) => {
      if (cursor === null) return { items: ['Issue 1'], cursor: 'next' };
      if (await argo.settings.get('busy')) throw new Error('The service is busy.');
      return { items: ['Issue 2'], cursor: null };
    },
    render: (_data, _to, { list }) => (
      <List pagination={{ hasMore: list.hasMore, onLoadMore: list.loadMore }}>
        {list.items.map((title) => <ListItem key={title} title={title} />)}
      </List>
    ),
  });
}`;

it('asks for the page a failed load more lacked, as the App keeps its rows and asks again', async () => {
  const fixture = await dataFixture(source, {
    operations: [],
    settings: [{ key: 'busy', type: 'toggle', label: 'Busy' }],
  });

  const kit = await fixture.start();
  const page = await kit.pages.open({ path: '/' });

  kit.settings.set('busy', true);
  await page.loadMore();

  expect(page.error).toContain('The service is busy.');
  expect(() => page.tree).toThrow('The service is busy.');

  kit.settings.set('busy', false);
  await page.loadMore();

  expect(page.error).toBeUndefined();
  expect(page.findText('Issue 1')).toBeDefined();
  expect(page.findText('Issue 2')).toBeDefined();
});

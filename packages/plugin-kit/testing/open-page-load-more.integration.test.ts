import { expect, it } from 'vitest';
import { dataFixture } from '../mocks/data-fixture';

const busy = 'The service is busy.';

// A paged list whose second page fails while the service is busy, as a busy service refuses a load more.
const source = `import { List, ListItem } from '@argo/plugin-kit';

export function register(argo) {
  argo.pages.define('/', {
    load: () => null,
    list: async (_input, cursor) => {
      if (cursor === null) return { items: ['Issue 1'], cursor: 'next' };
      if (await argo.settings.get('busy')) return { items: [], failed: 'The service is busy.' };
      return { items: ['Issue 2'], cursor: null };
    },
    render: (_data, _to, { list }) => (
      <List pagination={list.pagination}>
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

  expect(page.error).toBeUndefined();
  expect(page.findText('Issue 1')).toBeDefined();
  expect(page.findText('Issue 2')).toBeUndefined();
  expect(page.tree.props.pagination).toMatchObject({
    hasMore: false,
    failed: busy,
    onLoadMore: { loadMore: true, retry: true },
  });

  kit.settings.set('busy', false);
  await page.loadMore();

  expect(page.error).toBeUndefined();
  expect(page.findText('Issue 1')).toBeDefined();
  expect(page.findText('Issue 2')).toBeDefined();
  expect(page.tree.props.pagination).not.toHaveProperty('failed');
});

// A short list whose redraw fails while the service is busy: its tree offers no load more.
const shortSource = `import { List, ListItem } from '@argo/plugin-kit';

export function register(argo) {
  argo.pages.define('/', {
    load: async () => {
      if (await argo.settings.get('busy')) throw new Error('The service is busy.');
      return ['Issue 1'];
    },
    render: (titles) => <List>{titles.map((title) => <ListItem key={title} title={title} />)}</List>,
  });
}`;

it('says why a failed draw failed when the tree before it offered no load more', async () => {
  const fixture = await dataFixture(shortSource, {
    operations: [],
    settings: [{ key: 'busy', type: 'toggle', label: 'Busy' }],
  });

  const kit = await fixture.start();
  const page = await kit.pages.open({ path: '/' });

  kit.settings.set('busy', true);
  await page.draw();

  await expect(page.loadMore()).rejects.toThrow(busy);
});

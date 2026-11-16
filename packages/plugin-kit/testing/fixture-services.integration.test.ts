import { fixtureServices } from '@argo/plugin-kit/testing';
import { expect, it } from 'vitest';
import { dataFixture } from '../mocks/data-fixture';

const host = 'api.service.example';

// A page that shows when a busy service says to come back, as a Plugin reads a 429's `retry-after`.
const retryPage = `import { Text } from '@argo/plugin-kit';
  const limited = { api: 'fetch', url: 'https://${host}/issues' };
  export function register(argo) {
    argo.pages.define('/', {
      load: ({ read }) => read(limited),
      render: (reply) => <Text>{reply.status + ' after ' + reply.headers['retry-after']}</Text>,
    });
  }`;

it('answers a request with the headers the test names', async () => {
  const services = await fixtureServices(() => ({
    status: 429,
    json: { message: 'Rate limited' },
    headers: { 'retry-after': '30' },
  }));

  const fixture = await dataFixture(retryPage, {}, [{ kind: 'fetch', host }]);
  const kit = await fixture.start({ network: services.network });
  const page = await kit.pages.open({ path: '/' });

  expect(page.findText('429 after 30')).toBeDefined();
});

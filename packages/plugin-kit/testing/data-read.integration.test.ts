import type { ServerResponse } from 'node:http';
import { expect, it } from 'vitest';
import { fixtureNetwork, httpsServer } from '../../engine/mocks/probe-plugin';
import { dataFixture } from '../mocks/data-fixture';

const query = "{api:'process',action:'run',argv:['query-fixture']}";

// A Slot's provider has no view; a page's button stands in for one here, as `argo.data.read` needs no view to answer.
const source = (options: string): string =>
  `import {Button,Stack,Text,useData,useState} from '@argo/plugin-kit';
  export function register(argo) {
    argo.pages.register('/', () => {
      const [read, setRead] = useState('unread');
      const press = () => argo.data.read(${query}, ${options}).then(
        ({ data, error, errorKind }) => setRead(errorKind ? errorKind + ':' + error : 'read:' + data.stdout),
      );
      return <Stack direction="column"><Text>{read}</Text><Button label="Read" onPress={press} /></Stack>;
    });
    argo.pages.register('/watch', () => {
      const { data } = useData(${query}, { every: 60000 });
      return <Text>{'watched:' + (data?.stdout ?? 'empty')}</Text>;
    });
  }`;

const everyMinute = '{ every: 60000 }';

const untilText = { timeout: 10_000 };

it('answers a read from one call, and a page opened after it makes none', async () => {
  const fixture = await dataFixture(source(everyMinute));
  const kit = await fixture.start();
  const page = kit.page();

  await page.find('Read');
  await page.press('Read');
  await page.find('read:1');
  expect(await fixture.requests()).toHaveLength(1);

  const watching = await kit.mount({
    page: '/watch',
    surface: { platform: 'web' },
  });

  await watching.find('watched:1');
  expect(await fixture.requests()).toHaveLength(1);
});

it('answers a read from what a page already watches', async () => {
  const fixture = await dataFixture(source(everyMinute));
  const kit = await fixture.start();

  const watching = await kit.mount({
    page: '/watch',
    surface: { platform: 'web' },
  });

  await watching.find('watched:1');

  const page = kit.page();

  await page.find('Read');
  await page.press('Read');
  await page.find('read:1');
  expect(await fixture.requests()).toHaveLength(1);
});

it('runs the Query again once the answer is older than `every`', async () => {
  const fixture = await dataFixture(source(everyMinute));
  const kit = await fixture.start();
  const page = kit.page();

  await page.find('Read');
  await page.press('Read');
  await page.find('read:1');
  await kit.clock.advance(60_001);
  await page.press('Read');
  await page.find('read:2');

  await expect.poll(() => fixture.requests(), untilText).toHaveLength(2);
});

it('runs the Query again after a failed answer, however young', async () => {
  const requests: ServerResponse[] = [];

  const port = await httpsServer((_request, response) => {
    requests.push(response);

    if (requests.length === 1) response.destroy();
    else response.end('answered');
  });

  const fixture = await dataFixture(
    `import {Button,Stack,Text,useState} from '@argo/plugin-kit';
    export function register(argo) {
      argo.pages.register('/', () => {
        const [read, setRead] = useState('unread');
        const press = () => argo.data.read({ api: 'fetch', url: 'https://localhost:${port}/data', method: 'POST', body: '{}' }, { every: 60000 }).then(
          ({ data, errorKind }) => setRead(errorKind ?? data.body),
        );
        return <Stack direction="column"><Text>{read}</Text><Button label="Read" onPress={press} /></Stack>;
      });
    }`,
    {},
    [{ kind: 'fetch', host: `localhost:${port}`, reason: 'Fixture' }],
  );

  const kit = await fixture.start({ network: await fixtureNetwork() });
  const page = kit.page();

  await page.find('Read');
  await page.press('Read');
  await page.find('failed');
  await page.press('Read');
  await page.find('answered');
  expect(requests).toHaveLength(2);
});

it('refuses a read for a Project that is not registered, and runs nothing', async () => {
  const fixture = await dataFixture(
    source("{ every: 60000, projectId: 'missing' }"),
  );

  const kit = await fixture.start({ projectPaths: { one: fixture.directory } });
  const page = kit.page();

  await page.find('Read');
  await page.press('Read');
  await page.find('refused:Refused: Project is unavailable');
  expect(await fixture.requests()).toEqual([]);
});

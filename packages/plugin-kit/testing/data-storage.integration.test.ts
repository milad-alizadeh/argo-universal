import { expect, it } from 'vitest';
import { dataFixture } from '../mocks/data-fixture';

it('refreshes storage Queries on writes and never polls them', async () => {
  const fixture =
    await dataFixture(`import { Text, Button, Stack, useData } from '@argo/plugin-kit';
    export async function register(argo) {
      await argo.storage.batch([{ sql: 'CREATE TABLE items(value TEXT)', params: [], method: 'run' }, { sql: "INSERT INTO items VALUES ('first')", params: [], method: 'run' }]);
      function Data() {
        const { data } = useData({ api: 'storage', queries: [{ sql: 'SELECT value FROM items ORDER BY value', params: [], method: 'values' }] }, { every: 1 });
        return <Stack direction="column"><Text>{JSON.stringify(data) ?? 'empty'}</Text><Button label="Write" onPress={() => argo.storage.execute({ sql: "INSERT INTO items VALUES ('second')", params: [], method: 'run' })} /></Stack>;
      }
      argo.pages.register('/', Data);
    }`);

  const kit = await fixture.start();
  const page = kit.page();
  await page.find('[{"rows":[["first"]]}]');
  const before = (await kit.log()).split('argo.storage').length;
  await kit.clock.advance(60_000);
  expect((await kit.log()).split('argo.storage')).toHaveLength(before);
  await page.press('Write');
  await page.find('[{"rows":[["first"],["second"]]}]');
});

it.each(['all', 'run'])(
  'cannot write through a declared storage Query using %s',
  async (method) => {
    const fixture =
      await dataFixture(`import {Text,Stack,Button,useData,useState} from '@argo/plugin-kit';
  export async function register(argo) {
    await argo.storage.batch([{sql:'CREATE TABLE items(value TEXT)',params:[],method:'run'}, {sql:"INSERT INTO items VALUES ('first')",params:[],method:'run'}]);
    argo.pages.register('/', () => {
      const {error} = useData({api:'storage',queries:[{sql:"INSERT INTO items VALUES ('wrong') RETURNING value",params:[],method:'${method}'}]});
      const [rows,setRows] = useState('unread');
      return <Stack direction="column"><Text>{error ? 'refused' : 'pending'}</Text><Text>{rows}</Text><Button label="Read" onPress={async () => setRows(JSON.stringify(await argo.storage.execute({sql:'SELECT value FROM items',params:[],method:'values'})))} /></Stack>;
    });
  }`);

    const kit = await fixture.start();
    const page = kit.page();
    await page.find('refused');
    await page.press('Read');
    expect(await page.find('{"rows":[["first"]]}')).toMatchObject({
      type: 'Text',
    });
  },
);

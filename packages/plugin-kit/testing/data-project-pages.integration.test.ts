import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { PluginTest } from '@argo/plugin-kit/testing';
import type { PluginViewId } from '@repo/contracts/plugins/wire';
import { expect, it } from 'vitest';
import { dataFixture } from '../mocks/data-fixture';

it('isolates overlapping Project pages on one Connection and reuses the same Project view', async () => {
  const fixture =
    await dataFixture(`import {Text,Stack,Button,useData} from '@argo/plugin-kit';
  export function register(argo) {
    argo.pages.register('/', ({context:{projectId}}) => {
      const {data,refresh} = useData({api:'process',action:'run',argv:['query-fixture']}, {every:10000});
      return <Stack direction="column"><Text>{projectId + ':' + (data?.stdout ?? 'empty')}</Text><Button label="Refresh" onPress={refresh} /></Stack>;
    });
  }`);

  const one = join(fixture.directory, 'one');
  const two = join(fixture.directory, 'two');
  await mkdir(one);
  await mkdir(two);
  const kit = await fixture.start({ projectPaths: { one, two } });

  const page = {
    page: '/',
    surface: { platform: 'web' as const },
    connectionId: 'one-app',
  };

  const first = await kit.mount({ ...page, projectId: 'one' });
  await first.find('one:1');
  const second = await kit.mount({ ...page, projectId: 'two' });
  expect(second.findText('one:1')).toBeUndefined();
  await second.find('two:2');
  const shared = await kit.mount({ ...page, projectId: 'one' });
  await shared.find('one:1');
  const firstId = viewId(first);
  expect(viewId(shared)).toBe(firstId);
  expect(viewId(second)).not.toBe(firstId);
  await second.press('Refresh');
  await second.find('two:3');
  expect(first.findText('one:1')).toBeDefined();
  first.close();
  await shared.press('Refresh');
  await shared.find('one:4');
  expect(second.findText('two:3')).toBeDefined();
  shared.close();
  await kit.clock.advance(10000);
  await second.find('two:5');
  second.close();
  await kit.clock.advance(10000);
  expect(
    (await fixture.requests()).map((line) => JSON.parse(line).cwd),
  ).toEqual([one, two, two, one, two]);
});

function viewId(view: ReturnType<PluginTest['page']>): PluginViewId {
  const message = view.message;

  if (!message?.viewId) throw new Error('Expected a live Plugin view');

  return message.viewId;
}

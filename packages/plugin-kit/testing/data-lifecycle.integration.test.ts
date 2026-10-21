import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { dataFixture, processPage, dataPage } from '../mocks/data-fixture';

const pollingOptions = '{ every: 10000 }';

it('performs an untimed Query once per mount and hands back its previous value on reopening', async () => {
  const fixture = await dataFixture(processPage);
  const kit = await fixture.start();
  const first = kit.page();
  await first.find('1');
  await kit.clock.advance(60_000);
  expect(await fixture.requests()).toHaveLength(1);
  first.close();
  await kit.clock.advance(3_600_000);
  const reopened = kit.page();
  await reopened.find('2');
  expect(JSON.stringify(reopened.trees[0])).toContain('"children":"1"');
});

it('drops the old registrations and cache when a Plugin reloads on an advanced clock', async () => {
  const source = dataPage(undefined, pollingOptions);
  const fixture = await dataFixture(source);
  const kit = await fixture.start();
  const page = kit.page();
  await page.find('1');
  await kit.clock.advance(1000);
  await writeFile(
    join(fixture.directory, 'index.tsx'),
    source.replace("['query-fixture']", "['query-fixture', 'new']"),
  );
  await page.find('2');
  await kit.clock.advance(9000);
  expect(await fixture.requests()).toHaveLength(2);
  await kit.clock.advance(1000);
  await page.find('3');
  expect(
    (await fixture.requests()).map((line) => JSON.parse(line).args),
  ).toEqual([[], ['new'], ['new']]);
});

it('drops all Query timers after the worker crashes', async () => {
  const fixture = await dataFixture(
    dataPage(undefined, pollingOptions).replace(
      '<Text>{stale',
      `<Button label="Crash" onPress={() => { void Promise.reject(new Error('worker failed')); }} /><Text>{stale`,
    ),
  );

  const kit = await fixture.start();
  const controller = new AbortController();
  const failures = kit.failures(controller.signal);
  expect((await failures.next()).value).toEqual([]);
  const page = kit.page();
  await page.find('1');
  const pressed = page.press('Crash').catch(() => {});
  expect((await failures.next()).value).toEqual([
    expect.objectContaining({ kind: 'stopped', message: 'worker failed' }),
  ]);
  await pressed;
  await kit.clock.advance(60_000);
  expect(await fixture.requests()).toHaveLength(1);
  controller.abort();
  await failures.return([]);
});

it('releases a Query when its component unmounts inside a live view', async () => {
  const fixture = await dataFixture(
    dataPage(undefined, pollingOptions)
      .replace('useData }', 'useData, useState }')
      .replace(
        "argo.pages.register('/', Data);",
        `argo.pages.register('/', () => {
    const [visible, setVisible] = useState(true);
    return <Stack direction="column"><Button label="Hide" onPress={() => setVisible(false)} />{visible ? <Data /> : <Text>hidden</Text>}</Stack>;
  });`,
      ),
  );

  const kit = await fixture.start();
  const page = kit.page();
  await page.find('1');
  await page.press('Hide');
  await page.find('hidden');
  await kit.clock.advance(60_000);
  expect(await fixture.requests()).toHaveLength(1);
});

it('allows a null Query without any call or refresh registration', async () => {
  const fixture = await dataFixture(dataPage('null', '{ every: 1 }'));
  const kit = await fixture.start();
  const page = kit.page();
  await page.find('empty');
  await page.press('Refresh');
  await kit.clock.advance(60_000);
  expect(await fixture.requests()).toEqual([]);
  expect(page.findText('settled')).toBeDefined();
  expect(await kit.log()).not.toContain('argo.process');
});

it('keeps one answer object across unrelated component renders', async () => {
  const fixture =
    await dataFixture(`import {Text,Stack,Button,useData,useState,useEffect,useRef} from '@argo/plugin-kit';
  export function register(argo) {
    argo.pages.register('/', () => {
      const {data} = useData({api:'process',action:'run',argv:['query-fixture']});
      const [tick,setTick] = useState(0);
      const effects = useRef(0);
      useEffect(() => {if(data) effects.current += 1;}, [data]);
      return <Stack direction="column"><Text>{data?.stdout ?? 'empty'}</Text><Text>{tick + ':' + effects.current}</Text><Button label="Render" onPress={() => setTick(tick+1)} /></Stack>;
    });
  }`);

  const kit = await fixture.start();
  const page = kit.page();
  await page.find('1');
  await page.press('Render');
  await page.find('1:1');
  await page.press('Render');
  expect(await page.find('2:1')).toMatchObject({ type: 'Text' });
  expect(await fixture.requests()).toHaveLength(1);
});

it('switches Query kinds without decoding the previous answer as the new kind', async () => {
  const fixture =
    await dataFixture(`import {Text,Stack,Button,useState,useData} from '@argo/plugin-kit';
  export function register(argo) {
    argo.pages.register('/', () => {
      const [storage,setStorage] = useState(false);
      const {data} = useData(storage
        ? {api:'storage',queries:[{sql:"SELECT 'row'",params:[],method:'values'}]}
        : {api:'process',action:'run',argv:['query-fixture']});
      return <Stack direction="column"><Text>{Array.isArray(data) ? data[0].rows[0][0] : data?.stdout ?? 'empty'}</Text><Button label="Switch" onPress={() => setStorage(!storage)} /></Stack>;
    });
  }`);

  const kit = await fixture.start();
  const page = kit.page();
  await page.find('1');
  await page.press('Switch');
  expect(await page.find('row')).toMatchObject({ type: 'Text' });
  await page.press('Switch');
  await page.find('2');
  expect(await fixture.requests()).toHaveLength(2);
});

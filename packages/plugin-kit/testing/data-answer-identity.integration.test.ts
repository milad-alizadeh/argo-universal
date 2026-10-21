import type { ServerResponse } from 'node:http';
import { expect, it } from 'vitest';
import { fixtureNetwork, httpsServer } from '../../engine/mocks/probe-plugin';
import { dataFixture } from '../mocks/data-fixture';

it('keeps data-dependent effects unchanged for stale and error updates, then advances for a successful answer', async () => {
  const responses: ServerResponse[] = [];

  const port = await httpsServer((_request, response) => {
    responses.push(response);
    response.setHeader('Date', 'Tue, 20 Oct 2026 00:00:00 GMT');

    if (responses.length === 1) response.end('first');

    if (responses.length === 3) response.destroy();
  });

  const fixture = await dataFixture(
    `import {Text,Stack,Button,useData,useState,useEffect} from '@argo/plugin-kit';
  export function register(argo) {
    argo.pages.register('/', () => {
      const {data,error,stale,refresh} = useData({api:'fetch',url:'https://localhost:${port}/answer'});
      const [effects,setEffects] = useState(0);
      useEffect(() => {if(data) setEffects((n) => n+1);}, [data]);
      return <Stack direction="column"><Text>{data?.body ?? 'empty'}</Text><Text>{'effects:' + effects}</Text><Text>{stale ? 'stale' : 'settled'}</Text><Text>{error ? 'error' : 'no error'}</Text><Button label="Refresh" onPress={refresh} /></Stack>;
    });
  }`,
    {},
    [{ kind: 'fetch', host: 'localhost:' + port, reason: 'Fixture' }],
  );

  const kit = await fixture.start({ network: await fixtureNetwork() });
  const page = kit.page();
  await page.find('effects:1');
  const refreshed = page.press('Refresh');

  try {
    await expect.poll(() => responses.length).toBe(2);
    await page.find('stale');
    expect(page.findText('effects:2')).toBeUndefined();
    expect(page.findText('effects:1')).toBeDefined();
  } finally {
    responses[1]?.end('first');
    await refreshed;
  }

  await page.find('settled');
  await page.find('effects:2');
  await page.press('Refresh');
  await page.find('error');
  expect(page.findText('effects:2')).toBeDefined();
  expect(page.findText('first')).toBeDefined();
});

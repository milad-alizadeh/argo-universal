import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it, onTestFinished } from 'vitest';
import { dataFixture, dataPage, dataPluginId } from '../mocks/data-fixture';

it('keeps two Plugins isolated while advancing their worker timers and Queries together', async () => {
  const source = dataPage(undefined, '{ every: 10000 }')
    .replace(
      'function Data() {',
      `function Data() {
    const [time, setTime] = useState('waiting');
    useEffect(() => { setTimeout(() => setTime('timer:' + Date.now()), 500); }, []);`,
    )
    .replace('useData }', 'useData, useEffect, useState }')
    .replace('<Text>{stale', '<Text>{time}</Text><Text>{stale');

  const fixture = await dataFixture(source);
  const directory = await mkdtemp(join(tmpdir(), 'argo-data-plugins-'));
  onTestFinished(() => rm(directory, { recursive: true, force: true }));
  await cp(fixture.directory, join(directory, 'one'), { recursive: true });
  await cp(fixture.directory, join(directory, 'two'), { recursive: true });

  const manifest = JSON.parse(
    await readFile(join(directory, 'two/plugin.json'), 'utf8'),
  );

  await writeFile(
    join(directory, 'two/plugin.json'),
    JSON.stringify({ ...manifest, id: 'second-fixture' }),
  );
  const kit = await fixture.start({ directory });
  const first = kit.page('/', dataPluginId);
  await first.find('1');
  const second = kit.page('/', 'second-fixture');
  await second.find('2');
  await kit.clock.advance(500);
  await first.find('timer:500');
  await second.find('timer:500');
  await kit.clock.advance(9500);
  await expect.poll(() => fixture.requests()).toHaveLength(4);
  expect(first.trees.length).toBeGreaterThan(1);
  expect(second.trees.length).toBeGreaterThan(1);
});

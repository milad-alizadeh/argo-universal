import { appendFile, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { dataFixture, processPage } from '../mocks/data-fixture';

it('refreshes an untimed Query when its last view closed before the previous call finished', async () => {
  const fixture = await dataFixture(processPage);
  const released = join(fixture.directory, 'released');
  const completed = join(fixture.directory, 'completed');
  await appendFile(
    join(fixture.directory, 'query-fixture'),
    `
import {existsSync,writeFileSync} from 'node:fs';
import {setTimeout as delay} from 'node:timers/promises';
if (!existsSync(${JSON.stringify(completed)})) {
  process.on('exit', () => writeFileSync(${JSON.stringify(completed)}, 'done'));
  while (!existsSync(${JSON.stringify(released)})) await delay(5);
}
`,
  );
  const kit = await fixture.start();
  const first = kit.page();
  await first.find('empty');
  await expect
    .poll(() => fixture.requests(), { timeout: 3000 })
    .toHaveLength(1);
  first.close();
  await kit.clock.advance(0);
  await writeFile(released, 'release');
  await expect
    .poll(() => readFile(completed, 'utf8').catch(() => null), {
      timeout: 3000,
    })
    .toBe('done');
  await kit.clock.advance(0);
  const reopened = kit.page();
  await reopened.find('1');
  expect(JSON.stringify(reopened.trees[0])).toContain('"children":"1"');
  await reopened.find('2');
  expect(await fixture.requests()).toHaveLength(2);
});

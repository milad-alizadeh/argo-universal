import { appendFile } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { dataFixture, processWait } from '../mocks/data-fixture';

// The fixture answers at once unless it is asked to hang, which leaves the chained Query in flight.
const hangs =
  "\nif (process.argv.includes('hang')) setInterval(() => {}, 1000);\n";

const chainedPage = `import { Text, useData } from '@argo/plugin-kit';
export function register(argo) {
  function Chained() {
    const first = useData({ api: 'process', action: 'run', argv: ['query-fixture'] });
    const second = useData(
      first.data
        ? { api: 'process', action: 'run', argv: ['query-fixture', 'hang'], timeoutMs: 120000 }
        : null,
    );
    return <Text>{second.data ? 'both' : first.data ? 'first' : 'none'}</Text>;
  }
  argo.pages.register('/', Chained);
}`;

it('holds a background pass open for a Query a later render declared', async () => {
  const fixture = await dataFixture(chainedPage, {
    background: { path: '/', interval: 300000 },
  });

  await appendFile(join(fixture.directory, 'query-fixture'), hangs);
  const kit = await fixture.start({ projectPaths: { one: fixture.directory } });
  await expect.poll(() => fixture.requests(), processWait).toHaveLength(2);
  expect(await kit.log()).not.toContain('background pass completed');

  await kit.clock.advance(60000);
  await expect
    .poll(() => kit.log(), processWait)
    .toContain('background pass reached 60000 ms');
});

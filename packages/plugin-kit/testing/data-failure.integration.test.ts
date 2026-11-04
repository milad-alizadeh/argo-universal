import { expect, it } from 'vitest';
import { dataFixture, processWait } from '../mocks/data-fixture';
import { completed } from './loader-background-fixture';
import { drawnText, processRead } from './query-pages';

const cannotDraw = 'cannot draw';

const cannotDrawEither = 'cannot draw either';

const broken = (
  path: string,
  reason: string,
): string => `argo.pages.define('${path}', {
    load: () => null,
    render: () => { throw new Error('${reason}'); },
  });`;

it('reports one drawing failure while other pages, Hooks and background passes keep running', async () => {
  const fixture = await dataFixture(
    `import { Text } from '@argo/plugin-kit';
    export function register(argo) {
      argo.pages.define('/', {
        every: 10000,
        load: async ({ read }) => (await read(${processRead})).stdout,
        render: (count) => <Text>{count}</Text>,
      });
      ${broken('/broken', cannotDraw)}
      argo.pages.define('/pass', {
        load: async () => (await argo.process.run(['query-fixture'])).stdout,
        render: (count) => <Text>{count}</Text>,
      });
      argo.on('prompt.submit', (ctx, event, next) => next());
    }`,
    {
      hooks: ['prompt.submit'],
      background: { path: '/pass', interval: 300000 },
    },
  );

  const kit = await fixture.start({ projectPaths: { one: fixture.directory } });
  await expect
    .poll(() => kit.log(), processWait)
    .toContain('background pass completed');
  const controller = new AbortController();
  const failures = kit.failures(controller.signal);
  expect((await failures.next()).value).toEqual([]);
  expect(await drawnText(kit, { path: '/' })).toBe('2');
  expect(await kit.pages.draw({ path: '/broken' })).toMatchObject({
    kind: 'failed',
    error: cannotDraw,
  });
  expect((await failures.next()).value).toEqual([
    expect.objectContaining({ kind: 'drawing', message: cannotDraw }),
  ]);

  const prompt = [{ type: 'text', text: 'Hello' }];
  expect(
    await kit.emit('prompt.submit', {
      sessionId: 's',
      projectId: 'one',
      prompt,
    }),
  ).toEqual({ prompt });
  await kit.clock.advance(10000);
  expect(await drawnText(kit, { path: '/' })).toBe('3');
  await kit.clock.advance(290000);
  await expect.poll(() => fixture.requests(), processWait).toHaveLength(4);
  await expect.poll(() => completed(kit), processWait).toBe(2);
  controller.abort();
  await failures.return([]);
});

it("keeps a page's drawing failure when another page of the Plugin draws", async () => {
  const fixture = await dataFixture(
    `import { Text } from '@argo/plugin-kit';
    export function register(argo) {
      argo.pages.define('/', { load: () => 'drawn', render: (text) => <Text>{text}</Text> });
      ${broken('/broken', cannotDraw)}
      ${broken('/worse', cannotDrawEither)}
    }`,
  );

  const kit = await fixture.start();
  const controller = new AbortController();
  const failures = kit.failures(controller.signal);
  expect((await failures.next()).value).toEqual([]);
  await kit.pages.draw({ path: '/broken' });
  expect((await failures.next()).value).toEqual([
    expect.objectContaining({ kind: 'drawing', message: cannotDraw }),
  ]);

  // Two failed pages of one Plugin are one failure for the App, the latest of them.
  await kit.pages.draw({ path: '/worse' });
  expect((await failures.next()).value).toEqual([
    expect.objectContaining({ kind: 'drawing', message: cannotDrawEither }),
  ]);

  // A page that never failed draws without clearing either failure.
  expect(await drawnText(kit, { path: '/' })).toBe('drawn');
  const watched = new AbortController();
  const current = kit.failures(watched.signal);
  expect((await current.next()).value).toEqual([
    expect.objectContaining({ kind: 'drawing', message: cannotDrawEither }),
  ]);
  watched.abort();
  await current.return([]);
  controller.abort();
  await failures.return([]);
});

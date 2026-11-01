import { expect, it } from 'vitest';
import { dataFixture, processPage, processWait } from '../mocks/data-fixture';

it('reports one drawing failure while other pages, Slots, Hooks and background passes keep running', async () => {
  const fixture = await dataFixture(
    processPage.replace(
      "argo.pages.register('/', Data);",
      `argo.pages.register('/', Data);
    argo.pages.register('/broken', () => { throw new Error('cannot draw'); });
    argo.on('prompt.submit', (ctx, event, next) => next());`,
    ),
    { hooks: ['prompt.submit'], background: { path: '/', interval: 300000 } },
  );

  const kit = await fixture.start({ projectPaths: { one: fixture.directory } });
  await expect
    .poll(() => kit.log(), processWait)
    .toContain('background pass completed');
  const controller = new AbortController();
  const failures = kit.failures(controller.signal);
  expect((await failures.next()).value).toEqual([]);
  const page = kit.page();
  await page.find('2');
  const broken = kit.page('/broken');
  const failed = (await failures.next()).value;
  expect(failed).toEqual([
    expect.objectContaining({ kind: 'drawing', message: 'cannot draw' }),
  ]);

  const project = kit.page('/', undefined, 'one');

  await project.find('1');
  const prompt = [{ type: 'text', text: 'Hello' }];
  expect(
    await kit.emit('prompt.submit', {
      sessionId: 's',
      projectId: 'one',
      prompt,
    }),
  ).toEqual({ prompt });
  await page.press('Refresh');
  await page.find('3');
  await kit.clock.advance(300000);
  await expect.poll(() => fixture.requests(), processWait).toHaveLength(4);
  await project.find('4');
  expect(broken.trees).toEqual([]);
  controller.abort();
  await failures.return([]);
});

it("keeps a page's drawing failure when another page of the Plugin draws", async () => {
  const fixture = await dataFixture(
    `import { Text } from '@argo/plugin-kit';
    export function register(argo) {
      argo.pages.register('/', () => <Text>drawn</Text>);
      argo.pages.register('/broken', () => { throw new Error('cannot draw'); });
      argo.pages.register('/worse', () => { throw new Error('cannot draw either'); });
    }`,
  );

  const kit = await fixture.start();
  const controller = new AbortController();
  const failures = kit.failures(controller.signal);
  expect((await failures.next()).value).toEqual([]);
  kit.page('/broken');
  expect((await failures.next()).value).toEqual([
    expect.objectContaining({ kind: 'drawing', message: 'cannot draw' }),
  ]);

  // Two failed pages of one Plugin are one failure for the App, the latest of them.
  kit.page('/worse');
  expect((await failures.next()).value).toEqual([
    expect.objectContaining({ kind: 'drawing', message: 'cannot draw either' }),
  ]);

  // A page the App never asked these of draws without clearing either failure.
  await kit.page('/').find('drawn');
  const watched = new AbortController();
  const current = kit.failures(watched.signal);
  expect((await current.next()).value).toEqual([
    expect.objectContaining({ kind: 'drawing', message: 'cannot draw either' }),
  ]);
  watched.abort();
  await current.return([]);
  controller.abort();
  await failures.return([]);
});

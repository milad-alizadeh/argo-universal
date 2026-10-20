import { expect, it } from 'vitest';
import { dataFixture, processPage } from '../mocks/data-fixture';

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
  await expect.poll(() => kit.log()).toContain('background pass completed');
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

  const slot = kit.slot({
    slotId: 'argo/project/details/v1',
    context: { projectId: 'one' },
  });

  await slot.find('1');
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
  await expect.poll(() => fixture.requests()).toHaveLength(4);
  await slot.find('4');
  expect(broken.trees).toEqual([]);
  controller.abort();
  await failures.return([]);
});

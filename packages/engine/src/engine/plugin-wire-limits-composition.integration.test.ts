import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, it, onTestFinished } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { pluginTap } from '#mocks/plugin-app';
import { createRuntimePlugins } from '#mocks/runtime-plugins';

it.each([
  { path: '/oversize', grows: 0, cap: 'message' },
  { path: '/grow', grows: 2, cap: 'page' },
])(
  'refuses the $cap size cap and replaces the page with its fallback',
  async ({ path, grows, cap }) => {
    const home = await createRuntimePlugins([
      { id: 'list', fixture: 'keyed-list' },
    ]);

    const { createCaller } = await startEngineTestHost({ home });
    const controller = new AbortController();
    onTestFinished(() => controller.abort());
    const input = { pluginId: 'list', path };

    const watching = createCaller({ signal: controller.signal });
    const stream = (await watching.plugins.view(input))[Symbol.asyncIterator]();

    let message = (await stream.next()).value;

    for (let index = 0; index < grows; index++) {
      await watching.plugins.dispatch(
        pluginTap(message, { ...input, key: '0/grow' }),
      );
      message = (await stream.next()).value;
    }

    expect(message).toMatchObject({
      type: 'snapshot',
      root: {
        type: 'Text',
        props: { children: 'This Plugin page could not be displayed.' },
        children: [],
        slots: {},
      },
    });
    const log = await readFile(join(home, 'logs/plugins.log'), 'utf8');
    expect(
      log
        .split('\n')
        .filter((line) =>
          line.includes(`Plugin list: refused ${path}: ${cap} exceeds`),
        ),
    ).toHaveLength(1);
  },
  20_000,
);

it('coalesces a burst of committed effects into the first frame snapshot', async () => {
  const home = await createRuntimePlugins([
    { id: 'list', fixture: 'keyed-list' },
  ]);

  const { createCaller } = await startEngineTestHost({ home });
  const controller = new AbortController();
  onTestFinished(() => controller.abort());

  const stream = (
    await createCaller({ signal: controller.signal }).plugins.view({
      pluginId: 'list',
      path: '/coalesce',
    })
  )[Symbol.asyncIterator]();

  expect((await stream.next()).value).toMatchObject({
    type: 'snapshot',
    revision: 1,
    root: { props: { children: 'Commit 3' } },
  });
}, 10_000);

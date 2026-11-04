import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { pageAt } from '#mocks/plugin-pages';
import { createRuntimePlugins } from '#mocks/runtime-plugins';

// The prepared page's own cap, a little under the message's, is checked-tree.test.ts's.
it.each([{ path: '/oversize', cap: 'message' }])(
  'refuses a page over the $cap size cap with one log line',
  async ({ path, cap }) => {
    const home = await createRuntimePlugins([
      { id: 'list', fixture: 'keyed-list' },
    ]);

    const { caller } = await startEngineTestHost({ home });
    const draw = { ...pageAt('list', path), pages: 1 };

    await expect(caller.plugins.draw(draw)).resolves.toMatchObject({
      kind: 'failed',
      error: expect.stringContaining(`${cap} exceeds`),
    });
    await caller.plugins.draw(draw);
    const log = await readFile(join(home, 'logs/plugins.log'), 'utf8');
    expect(
      log
        .split('\n')
        .filter(
          (line) =>
            line.includes(`Plugin list: refused ${path}: `) &&
            line.includes(`${cap} exceeds`),
        ),
    ).toHaveLength(1);
  },
  20_000,
);

import { wireJsonOf, type WireJson } from '@repo/contracts/plugins/wire';
import { pluginMessageBytes } from '@repo/contracts/plugins/wire-limits';
import { expect, it } from 'vitest';
import { draws, drawn, listed } from './plugin-draws-fixtures';
import { stack } from './tree-fixtures';

const atlasThrew = { error: 'Atlas threw' };

const tooLarge: WireJson = {
  type: 'Stack',
  key: 'root',
  huge: 'x'.repeat(pluginMessageBytes),
};

it('logs a page that fails to draw once however often it fails, and the App shows one failure for the Plugin', async () => {
  const logs: string[] = [];
  const drawing = draws((line) => logs.push(line));

  drawing.workers.run('atlas', 1);
  await drawn(drawing, '/map', atlasThrew);
  await drawn(drawing, '/map', atlasThrew);
  await drawn(drawing, '/files', { root: tooLarge });

  expect(logs).toEqual([
    'Plugin atlas: could not draw /map: Atlas threw',
    `Plugin atlas: refused /files: page message exceeds ${pluginMessageBytes} bytes`,
  ]);
  expect(await listed(drawing.failures)).toMatchObject([
    {
      kind: 'drawing',
      pluginId: 'atlas',
      message: `page message exceeds ${pluginMessageBytes} bytes`,
    },
  ]);
});

it("clears a page's failure when it draws, and leaves another page's failed", async () => {
  const drawing = draws();

  drawing.workers.run('atlas', 1);
  await drawn(drawing, '/map', atlasThrew);
  await drawn(drawing, '/files', { error: 'Files threw' });
  await drawn(drawing, '/files', { root: wireJsonOf(stack([])) });

  expect(await listed(drawing.failures)).toMatchObject([
    { kind: 'drawing', message: 'Atlas threw' },
  ]);

  await drawn(drawing, '/map', { root: wireJsonOf(stack([])) });

  expect(await listed(drawing.failures)).toEqual([]);
});

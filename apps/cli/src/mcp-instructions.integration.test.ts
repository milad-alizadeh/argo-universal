import { createRuntimePlugins } from '@repo/engine/mocks/runtime-plugins';
import { expect, it } from 'vitest';
import { connectMcp } from '../mocks/mcp-client';
import { startCliHost } from '../mocks/operations-cli';

const discoveryLine =
  'Discover: call operation_list with a task-specific filter. ' +
  'Read the matching params schema and availability before calling operation_run.';

type Shipped = { id: string; name: string; instructions: string };

const shipped = (id: string, name: string, instructions: string): Shipped => ({
  id,
  name,
  instructions,
});

async function instructionsWith(
  plugins: Shipped[],
  disable: string[] = [],
): Promise<string | undefined> {
  const home = await createRuntimePlugins(
    plugins.map((plugin) => ({ ...plugin, fixture: 'healthy' })),
  );

  const host = await startCliHost({ home });

  for (const pluginId of disable)
    await host.caller.plugin.setEnabled({ pluginId, enabled: false });

  return (await connectMcp(host.home)).getInstructions();
}

it('sends exactly the discovery line when no Plugin has instructions', async () => {
  const home = await createRuntimePlugins([
    { id: 'quiet', fixture: 'healthy' },
  ]);

  const host = await startCliHost({ home });

  expect((await connectMcp(host.home)).getInstructions()).toBe(discoveryLine);
}, 30_000);

it('follows the discovery line with a Plugin prose under its name', async () => {
  expect(
    await instructionsWith([shipped('tracker', 'Issue tracker', 'Attach it.')]),
  ).toBe(`${discoveryLine}\n\n## Issue tracker\n\nAttach it.`);
}, 30_000);

it('orders Plugin prose by Plugin id', async () => {
  expect(
    await instructionsWith([
      shipped('zeta', 'Alpha', 'Last.'),
      shipped('alpha', 'Zulu', 'First.'),
    ]),
  ).toBe(`${discoveryLine}\n\n## Zulu\n\nFirst.\n\n## Alpha\n\nLast.`);
}, 30_000);

it('leaves a disabled Plugin out', async () => {
  expect(
    await instructionsWith(
      [shipped('off', 'Off', 'Hidden.'), shipped('on', 'On', 'Shown.')],
      ['off'],
    ),
  ).toBe(`${discoveryLine}\n\n## On\n\nShown.`);
}, 30_000);

it('leaves out a Plugin whose instructions are only whitespace', async () => {
  expect(await instructionsWith([shipped('blank', 'Blank', '  \n\n')])).toBe(
    discoveryLine,
  );
}, 30_000);

it('keeps the discovery line when a bad token cannot read Plugin instructions', async () => {
  const home = await createRuntimePlugins([
    { id: 'tracker', name: 'Tracker', fixture: 'healthy', instructions: 'Hi.' },
  ]);

  const host = await startCliHost({ home });
  const client = await connectMcp(host.home, 'revoked-session-token');

  expect(client.getInstructions()).toBe(discoveryLine);
}, 30_000);

import { fileURLToPath } from 'node:url';
import { findWireNodeEntry } from '@repo/contracts/plugins/wire-node-key';
import { expect, it, onTestFinished } from 'vitest';
import { startPluginTest } from './host';

it('publishes the Hello dashboard through the real Plugin worker', async () => {
  const test = await startPluginTest({
    directory: fileURLToPath(
      new URL('../../../plugins/examples/hello', import.meta.url),
    ),
    pluginId: 'hello',
    version: '0.0.0',
  });

  onTestFinished(() => test.close());

  const page = test.page('/dashboard');

  await expect.poll(() => page.tree, { timeout: 10_000 }).not.toBeNull();

  for (const text of ['Issues', 'Open', 'In progress', 'Done', 'Blocked']) {
    expect(
      page.tree &&
        findWireNodeEntry(
          page.tree,
          (node) => node.props.children === text || node.props.label === text,
        ),
      JSON.stringify(page.tree),
    ).toBeDefined();
  }
}, 20_000);

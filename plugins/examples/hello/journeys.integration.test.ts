import { fileURLToPath } from 'node:url';
import { startPluginTest, type PluginTestView } from '@argo/plugin-kit/testing';
import { expect, it, onTestFinished } from 'vitest';

async function listsPage(): Promise<PluginTestView> {
  const test = await startPluginTest({
    directory: fileURLToPath(new URL('.', import.meta.url)),
    pluginId: 'hello',
    version: '0.0.1',
  });

  onTestFinished(() => test.close());

  return test.page('/lists');
}

// The primary Action is a keyed Action in the Page's `primaryAction` Slot, dispatched by its own key.
it('adds a build from the Hello lists Page primary Action', async () => {
  const lists = await listsPage();
  const add = await lists.find('Add build');

  expect(add).toMatchObject({ type: 'Action', props: { icon: 'add' } });
  await lists.press('Add build');
  await expect
    .poll(() => lists.findText('Build 3'), { timeout: 10_000 })
    .toBeDefined();
}, 20_000);

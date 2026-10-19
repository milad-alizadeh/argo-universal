import { fileURLToPath } from 'node:url';
import { startPluginTest, type PluginTest } from '@argo/plugin-kit/testing';
import { expect, it, onTestFinished } from 'vitest';

const runFixture = 'Run fixture';

async function start(path: string): Promise<PluginTest> {
  const test = await startPluginTest({
    directory: fileURLToPath(new URL('../mocks/plugin', import.meta.url)),
    pluginId: 'harness-fixture',
    version: '0.0.0',
    path: [fileURLToPath(new URL(`../mocks/${path}`, import.meta.url))],
  });

  onTestFinished(() => test.close());

  return test;
}

it('delivers a text event through the worker and applies its keyed patch to the observed tree', async () => {
  const test = await start('first');
  const page = test.page();
  await expect
    .poll(() => page.findText('empty'), { timeout: 10_000 })
    .toBeDefined();
  await page.dispatch({
    key: 'search',
    event: 'onChangeText',
    payload: 'typed text',
  });
  await expect
    .poll(() => page.findText('typed text'), { timeout: 10_000 })
    .toBeDefined();
  expect(page.findText('empty')).toBeUndefined();
}, 20_000);

it('keeps PATH executable fixtures separate for simultaneous Plugin hosts', async () => {
  const originalPath = process.env.PATH;
  const first = (await start('first')).page();
  await expect
    .poll(() => first.findText(runFixture), { timeout: 10_000 })
    .toBeDefined();
  const second = (await start('second')).page();
  await expect
    .poll(() => second.findText(runFixture), { timeout: 10_000 })
    .toBeDefined();
  await Promise.all([first.press(runFixture), second.press(runFixture)]);
  await expect
    .poll(() => first.findText('first'), { timeout: 10_000 })
    .toBeDefined();
  await expect
    .poll(() => second.findText('second'), { timeout: 10_000 })
    .toBeDefined();
  expect(process.env.PATH).toBe(originalPath);
}, 20_000);

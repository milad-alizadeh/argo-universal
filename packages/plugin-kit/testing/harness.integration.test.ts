import { fileURLToPath } from 'node:url';
import {
  startPluginTest,
  type PageView,
  type PluginTest,
} from '@argo/plugin-kit/testing';
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

const open = async (path: string): Promise<PageView> =>
  (await start(path)).pages.open({ path: '/' });

it("loads the fixture's TypeScript entry through the production loader", async () => {
  const page = await open('first');

  expect(page.findText('Harness')).toBeDefined();
}, 20_000);

it('binds a search to Page state and draws the page again with its text', async () => {
  const page = await open('first');
  expect(page.findText('empty')).toBeDefined();

  await page.act('Harness', 'onChangeText', 'typed text');

  expect(page.pageState).toMatchObject({ value: 'typed text' });
  expect(page.findText('typed text')).toBeDefined();
  expect(page.findText('empty')).toBeUndefined();
}, 20_000);

it('keeps PATH executable fixtures separate for simultaneous Plugin hosts', async () => {
  const originalPath = process.env.PATH;
  const [first, second] = await Promise.all([open('first'), open('second')]);

  await Promise.all([first.press(runFixture), second.press(runFixture)]);

  expect(first.findText('first')).toBeDefined();
  expect(second.findText('second')).toBeDefined();
  expect(process.env.PATH).toBe(originalPath);
}, 20_000);

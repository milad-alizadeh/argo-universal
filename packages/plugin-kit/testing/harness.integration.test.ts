import { fileURLToPath } from 'node:url';
import {
  startPluginTest,
  type PageView,
  type PluginTest,
} from '@argo/plugin-kit/testing';
import { expect, it, onTestFinished } from 'vitest';

const runFixture = 'Run fixture';

// The fixture CLI in `mocks/first` answers `first`, and the one in `mocks/second` answers `second`.
const first = 'first';

const typed = 'typed text';

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
  const page = await open(first);

  expect(page.findText('Harness')).toBeDefined();
}, 20_000);

it('binds a search to Page state and draws the page again with its text once the typing pauses', async () => {
  const test = await start(first);
  const page = await test.pages.open({ path: '/' });
  expect(page.findText('empty')).toBeDefined();

  await page.act('Harness', 'onChangeText', typed);
  await test.clock.advance(300);

  expect(page.pageState).toMatchObject({ value: typed });
  expect(page.findText(typed)).toBeDefined();
  expect(page.findText('empty')).toBeUndefined();
}, 20_000);

it('keeps PATH executable fixtures separate for simultaneous Plugin hosts', async () => {
  const originalPath = process.env.PATH;
  const [one, two] = await Promise.all([open(first), open('second')]);

  await Promise.all([one.press(runFixture), two.press(runFixture)]);

  expect(one.findText(first)).toBeDefined();
  expect(two.findText('second')).toBeDefined();
  expect(process.env.PATH).toBe(originalPath);
}, 20_000);

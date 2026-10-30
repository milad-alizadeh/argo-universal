import type { PluginTest, PluginTestView } from '@argo/plugin-kit/testing';
import { expect, it } from 'vitest';
import { dataFixture } from '../mocks/data-fixture';
import { kitScreensSource } from '../mocks/kit-screens-source';

const surface = { platform: 'web' as const };

async function start(): Promise<PluginTest> {
  return (await dataFixture(kitScreensSource)).start({ clockStart: 0 });
}

function keyOf(page: PluginTestView, label: string): string {
  const entry = page.findText(label);

  if (!entry) throw new Error(`Plugin node not found: ${label}`);

  return entry.key;
}

// Each edit re-renders the page, so the next one waits for the field to show it.
async function edit(
  page: PluginTestView,
  field: { label: string; event: string; value: string | string[] },
): Promise<void> {
  const { label, event, value } = field;
  await page.dispatch({ key: keyOf(page, label), event, payload: value });
  await page.waitFor(
    () =>
      JSON.stringify(page.findText(label)?.node.props.value) ===
      JSON.stringify(value),
  );
}

it('switches the view and shows the matching content', async () => {
  const page = await (await start()).mount({ page: '/views', surface });

  expect((await page.find('Open Issue')).type).toBe('Text');
  expect((await page.find('Issue view')).type).toBe('SegmentedControl');
  await page.dispatch({
    key: keyOf(page, 'Issue view'),
    event: 'onValueChange',
    payload: 'closed',
  });
  expect((await page.find('Closed Issue')).type).toBe('Text');
  expect(page.findText('Open Issue')).toBeUndefined();
}, 20_000);

it("adds a row from the Screen's primary Action", async () => {
  const page = await (await start()).mount({ page: '/lists', surface });
  const add = await page.find('Add build');

  expect(add.type).toBe('Action');
  expect(page.findText('Build 2')).toBeUndefined();
  await page.press('Add build');
  expect((await page.find('Build 2')).type).toBe('ListItem');
}, 20_000);

it('draws a grid of Cards', async () => {
  const page = await (await start()).mount({ page: '/dashboard', surface });

  for (const title of ['Open', 'Blocked'])
    expect((await page.find(title)).type).toBe('Card');
}, 20_000);

it('submits the drafted Issue from a FieldGroup form', async () => {
  const page = await (await start()).mount({ page: '/form', surface });

  await page.find('Title');
  await edit(page, { label: 'Title', event: 'onChangeText', value: 'Crash' });
  await edit(page, { label: 'Labels', event: 'onValueChange', value: ['bug'] });
  await edit(page, {
    label: 'Due',
    event: 'onValueChange',
    value: '2026-10-30',
  });
  await page.press('Create Issue');
  expect((await page.find('Created Crash bug 2026-10-30')).type).toBe('Text');
}, 20_000);

it('opens a build beside the list and offers to rerun it once cancelled', async () => {
  const kit = await start();
  const empty = await kit.mount({ page: '/builds', surface });

  expect((await empty.find('Select a build')).type).toBe('EmptyState');
  expect((await empty.find('Deploy web')).props.onPress).toEqual({
    action: 'navigate',
    path: '/builds/web',
  });

  const page = await kit.mount({ page: '/builds/web', surface });

  expect((await page.find('Running')).type).toBe('Metadata.StatusDot');
  await page.press('Cancel');
  expect((await page.find('Rerun')).type).toBe('Action');
}, 20_000);

it('opens the page a Card names when pressed', async () => {
  const page = await (await start()).mount({ page: '/', surface });

  expect((await page.find('Builds')).props.onPress).toEqual({
    action: 'navigate',
    path: '/builds',
  });
}, 20_000);

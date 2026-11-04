import type { OpenPage, PluginTest } from '@argo/plugin-kit/testing';
import { expect, it } from 'vitest';
import { startKit } from '../mocks/kit-page-helpers';
import { kitScreensSource } from '../mocks/kit-screens-source';

const start = (): ReturnType<typeof startKit> => startKit(kitScreensSource);

const open = async (path: string): Promise<OpenPage> =>
  (await start()).pages.open({ path });

// How long a bound edit waits for the edits to pause.
const bindPauseMs = 300;

// Each edit binds its field's Page state key, and once the edits pause the page draws again showing it.
async function edit(
  { kit, page }: { kit: PluginTest; page: OpenPage },
  field: { label: string; event: string; value: string | string[] },
): Promise<void> {
  const { label, event, value } = field;
  await page.act(label, event, value);
  await kit.clock.advance(bindPauseMs);
  expect(page.find(label).props.value).toEqual(value);
}

it('switches the view and shows the matching content', async () => {
  const kit = await start();
  const page = await kit.pages.open({ path: '/views' });

  expect(page.find('Open Issue').type).toBe('Text');
  expect(page.find('Issue view').type).toBe('SegmentedControl');
  await page.act('Issue view', 'onValueChange', 'closed');
  await kit.clock.advance(bindPauseMs);
  expect(page.find('Closed Issue').type).toBe('Text');
  expect(page.findText('Open Issue')).toBeUndefined();
});

it("adds a row from the Screen's primary Action", async () => {
  const page = await open('/lists');
  const add = page.find('Add build');

  expect(add.type).toBe('Action');
  expect(add.props.icon).toBe('add');
  expect(page.findText('Build 2')).toBeUndefined();
  await page.press('Add build');
  expect(page.find('Build 2').type).toBe('ListItem');
});

it('draws a grid of Cards', async () => {
  const page = await open('/dashboard');

  expect(page.find('Issues').type).toBe('Text');

  for (const title of ['Open', 'In progress', 'Done', 'Blocked'])
    expect(page.find(title).type).toBe('Card');
});

it('submits the drafted Issue from a FieldGroup form', async () => {
  const kit = await start();
  const form = { kit, page: await kit.pages.open({ path: '/form' }) };
  const { page } = form;

  await edit(form, { label: 'Title', event: 'onChangeText', value: 'Crash' });
  await edit(form, {
    label: 'Labels',
    event: 'onValueChange',
    value: ['bug'],
  });
  await edit(form, {
    label: 'Due',
    event: 'onValueChange',
    value: '2026-10-30',
  });
  await page.press('Create Issue');
  expect(page.find('Created Crash').type).toBe('Text');
});

it('opens a build beside the list and offers to rerun it once cancelled', async () => {
  const empty = await open('/builds');

  expect(empty.find('Select a build').type).toBe('EmptyState');

  const page = await empty.press('Deploy web');

  expect(page.path).toBe('/builds/web');
  expect(page.find('Deploy web').props.selected).toBe(true);
  expect(page.find('Build native').type).toBe('ListItem');
  expect(page.find('Running').type).toBe('Metadata.StatusDot');
  await page.press('Cancel');
  expect(page.find('Rerun').type).toBe('Action');
});

it('lists each demo as a Card that opens the page at its own path', async () => {
  const page = await open('/');

  for (const title of ['Lists', 'Dashboard', 'Form', 'Builds'])
    expect(page.find(title).type).toBe('Card');

  const builds = await page.press('Builds');

  expect(builds.path).toBe('/builds');
  expect(builds.find('Select a build').type).toBe('EmptyState');
});

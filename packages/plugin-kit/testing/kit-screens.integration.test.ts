import type { PluginTestView } from '@argo/plugin-kit/testing';
import { expect, it } from 'vitest';
import {
  keyOf,
  mountTimeout,
  startKit,
  webSurface as surface,
} from '../mocks/kit-page-helpers';
import { kitScreensSource } from '../mocks/kit-screens-source';

const start = (): ReturnType<typeof startKit> => startKit(kitScreensSource);

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

it(
  'switches the view and shows the matching content',
  async () => {
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
  },
  mountTimeout,
);

it(
  "adds a row from the Screen's primary Action",
  async () => {
    const page = await (await start()).mount({ page: '/lists', surface });
    const add = await page.find('Add build');

    expect(add.type).toBe('Action');
    expect(add.props.icon).toBe('add');
    expect(page.findText('Build 2')).toBeUndefined();
    await page.press('Add build');
    expect((await page.find('Build 2')).type).toBe('ListItem');
  },
  mountTimeout,
);

it(
  'draws a grid of Cards',
  async () => {
    const page = await (await start()).mount({ page: '/dashboard', surface });

    expect((await page.find('Issues')).type).toBe('Text');

    for (const title of ['Open', 'In progress', 'Done', 'Blocked'])
      expect((await page.find(title)).type).toBe('Card');
  },
  mountTimeout,
);

it(
  'submits the drafted Issue from a FieldGroup form',
  async () => {
    const page = await (await start()).mount({ page: '/form', surface });

    await page.find('Title');
    await edit(page, { label: 'Title', event: 'onChangeText', value: 'Crash' });
    await edit(page, {
      label: 'Labels',
      event: 'onValueChange',
      value: ['bug'],
    });
    await edit(page, {
      label: 'Due',
      event: 'onValueChange',
      value: '2026-10-30',
    });
    await page.press('Create Issue');
    expect((await page.find('Created Crash')).type).toBe('Text');
  },
  mountTimeout,
);

it(
  'opens a build beside the list and offers to rerun it once cancelled',
  async () => {
    const kit = await start();
    const empty = await kit.mount({ page: '/builds', surface });

    expect((await empty.find('Select a build')).type).toBe('EmptyState');
    expect((await empty.find('Deploy web')).props.onPress).toEqual({
      action: 'navigate',
      path: '/builds/web',
    });

    const page = await kit.mount({ page: '/builds/web', surface });

    expect((await page.find('Build native')).type).toBe('ListItem');
    expect((await page.find('Running')).type).toBe('Metadata.StatusDot');
    await page.press('Cancel');
    expect((await page.find('Rerun')).type).toBe('Action');
  },
  mountTimeout,
);

it(
  'lists each demo as a Card that opens the page at its own path',
  async () => {
    const kit = await start();
    const page = await kit.mount({ page: '/', surface });

    for (const title of ['Lists', 'Dashboard', 'Form', 'Builds'])
      expect((await page.find(title)).type).toBe('Card');

    expect((await page.find('Builds')).props.onPress).toEqual({
      action: 'navigate',
      path: '/builds',
    });

    const builds = await kit.mount({ page: '/builds', surface });

    expect((await builds.find('Select a build')).type).toBe('EmptyState');
  },
  mountTimeout,
);

import assert from 'node:assert/strict';
import {
  test,
  type PluginTest,
  type PluginTestView,
} from '@argo/plugin-kit/testing';
import { demos } from './demo-list';

test('pressing Tap me updates the hello page', async ({ mount }) => {
  const page = await mount({ page: '/', surface: { platform: 'web' } });

  assert.equal((await page.find('Tapped 0 times')).type, 'Text');
  await page.press('Tap me');
  assert.equal((await page.find('Tapped 1 times')).type, 'Text');
});

// The primary Action is a keyed Action in the Screen's `primaryAction` Slot, pressed by its label.
test('the lists Screen primary Action adds a build', async ({ mount }) => {
  const page = await mount({ page: '/lists', surface: { platform: 'web' } });

  const add = await page.find('Add build');
  assert.equal(add.type, 'Action');
  assert.equal(add.props.icon, 'add');
  await page.press('Add build');
  assert.equal((await page.find('Build 3')).type, 'ListItem');
});

test('the dashboard shows the week of Issues', async ({ mount }) => {
  const page = await mount({
    page: '/dashboard',
    surface: { platform: 'web' },
  });

  assert.equal((await page.find('Issues')).type, 'Text');

  for (const title of ['Open', 'In progress', 'Done', 'Blocked'])
    assert.equal((await page.find(title)).type, 'Card');
});

// Each edit re-renders the page, so the next one waits for the field to show it.
const keyOf = (page: PluginTestView, label: string): string => {
  const entry = page.findText(label);

  if (!entry) throw new Error(`Plugin node not found: ${label}`);

  return entry.key;
};

const editor =
  (page: PluginTestView, clock: PluginTest['clock']) =>
  async (
    label: string,
    event: string,
    value: string | string[],
  ): Promise<void> => {
    await page.dispatch({ key: keyOf(page, label), event, payload: value });

    const shown = (): string =>
      JSON.stringify(page.findText(label)?.node.props.value);

    while (shown() !== JSON.stringify(value)) await clock.advance(0);
  };

test('the form submits the drafted Issue', async ({ mount, clock }) => {
  const page = await mount({ page: '/form', surface: { platform: 'web' } });

  await page.find('Title');
  const edit = editor(page, clock);

  await edit('Title', 'onChangeText', 'Crash');
  await edit('Labels', 'onValueChange', ['bug']);
  await edit('Due', 'onValueChange', '2026-10-30');
  await page.press('Create Issue');
  assert.equal((await page.find('Created Crash')).type, 'Text');
});

const mountBuild = (mount: PluginTest['mount']): Promise<PluginTestView> =>
  mount({ page: '/builds/web', surface: { platform: 'web' } });

test('a build page shows the builds beside the selected one', async ({
  mount,
}) => {
  const page = await mountBuild(mount);

  assert.equal((await page.find('Build native')).type, 'ListItem');
  assert.equal((await page.find('Running')).type, 'Metadata.StatusDot');
});

test('cancelling a build offers to rerun it', async ({ mount }) => {
  const page = await mountBuild(mount);

  await page.press('Cancel');
  assert.equal((await page.find('Rerun')).type, 'Action');
});

const mountHello = (mount: PluginTest['mount']): Promise<PluginTestView> =>
  mount({ page: '/', surface: { platform: 'web' } });

test('the hello page lists each demo', async ({ mount }) => {
  const page = await mountHello(mount);

  for (const { title } of demos)
    assert.equal((await page.find(title)).type, 'Card');
});

test('a demo opens the page registered at its own path', async ({ mount }) => {
  const { props } = await (await mountHello(mount)).find('Builds');

  assert.equal(
    JSON.stringify(props.onPress),
    JSON.stringify({ action: 'navigate', path: '/builds' }),
  );

  const builds = await mount({ page: '/builds', surface: { platform: 'web' } });

  assert.equal((await builds.find('Select a build')).type, 'EmptyState');
});

// The manifest declares the host the page fetches; without it the Server refuses the call and the list shows the refusal.
test('the remote posts page is not refused its host', async ({ mount }) => {
  const page = await mount({ page: '/posts', surface: { platform: 'web' } });

  await page.waitFor(() =>
    JSON.stringify(page.tree).includes('"isLoading":false'),
  );
  assert.doesNotMatch(JSON.stringify(page.tree), /Refused/);
});

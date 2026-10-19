import assert from 'node:assert/strict';
import { test } from '@argo/plugin-kit/testing';

test('pressing Tap me updates the hello page', async ({ mount }) => {
  const page = await mount({
    page: '/',
    surface: {
      platform: 'web',
      parts: {
        Column: 1,
        Text: 3,
        ActionList: 1,
        'ActionList.Section': 1,
        Action: 1,
        Pill: 1,
        ListItem: 1,
      },
    },
  });

  assert.equal((await page.find('Tapped 0 times')).type, 'Text');
  await page.press('Tap me');
  assert.equal((await page.find('Tapped 1 times')).type, 'Text');
});

// The primary Action is a keyed Action in the Page's `primaryAction` Slot, pressed by its label.
test('the lists Page primary Action adds a build', async ({ mount }) => {
  const page = await mount({
    page: '/lists',
    surface: {
      platform: 'web',
      parts: { Page: 1, List: 2, ListItem: 3, Action: 4, Pill: 2, Label: 2 },
    },
  });

  const add = await page.find('Add build');
  assert.equal(add.type, 'Action');
  assert.equal(add.props.icon, 'add');
  await page.press('Add build');
  assert.equal((await page.find('Build 3')).type, 'ListItem');
});

test('the dashboard shows the week of Issues', async ({ mount }) => {
  const page = await mount({
    page: '/dashboard',
    surface: {
      platform: 'web',
      parts: {
        ScrollView: 1,
        Surface: 1,
        Card: 1,
        Stack: 1,
        Grid: 1,
        Spacer: 1,
        Text: 3,
      },
    },
  });

  assert.equal((await page.find('Issues')).type, 'Text');

  for (const title of ['Open', 'In progress', 'Done', 'Blocked'])
    assert.equal((await page.find(title)).type, 'Card');
});

const formParts = {
  Stack: 1,
  Form: 1,
  TextInput: 3,
  Picker: 4,
  DatePicker: 2,
  Text: 3,
};

// The Form's key is its fields' parent key.
const formKey = (fieldKey) => fieldKey.slice(0, fieldKey.lastIndexOf('/'));

// Each edit re-renders the page, so the next one waits for the field to show it.
const editor = (page, clock) => async (label, event, value) => {
  await page.dispatch({ key: page.findText(label).key, event, payload: value });
  const shown = () => page.findText(label).node.props.value;

  while (JSON.stringify(shown()) !== JSON.stringify(value))
    await clock.advance(0);
};

test('the form submits the drafted Issue', async ({ mount, clock }) => {
  const page = await mount({
    page: '/form',
    surface: { platform: 'web', parts: formParts },
  });

  await page.find('Title');
  const edit = editor(page, clock);

  await edit('Title', 'onChangeText', 'Crash');
  await edit('Labels', 'onValueChange', ['bug']);
  await edit('Due', 'onValueChange', '2026-10-30');
  const form = formKey(page.findText('Title').key);
  await page.dispatch({ key: form, event: 'onSubmit' });
  assert.equal((await page.find('Created Crash')).type, 'Text');
});

const listDetailParts = {
  ListDetail: 1,
  List: 2,
  ListItem: 3,
  Pill: 2,
  Label: 3,
  Page: 1,
  Detail: 1,
  Metadata: 1,
  'Metadata.StatusDot': 1,
  'Metadata.Avatar': 1,
  'Metadata.Pills': 1,
  'Metadata.Label': 1,
  'Metadata.Link': 1,
  EmptyState: 1,
  ActionList: 1,
  Action: 3,
};

const mountBuild = (mount) =>
  mount({
    page: '/builds/web',
    surface: { platform: 'web', parts: listDetailParts },
  });

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

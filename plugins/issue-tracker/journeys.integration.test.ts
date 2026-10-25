import { fileURLToPath } from 'node:url';
import { startPluginTest, type PluginTest } from '@argo/plugin-kit/testing';
import {
  projectDetailsSlotId,
  type PluginSlotInput,
} from '@repo/contracts/plugins/wire';
import { expect, it, onTestFinished } from 'vitest';

const project = {
  id: 'project-1',
  name: 'Fixture Project',
  originUrl: 'git@github.com:owner/repository.git',
};

const issueTitle = 'Fixture issue from GitHub';

const trackerName = 'GitHub Issues';

type SlotView = ReturnType<PluginTest['slot']>;

// A check marks the chosen row; its press is held until the stored choice arrives.
const chosen = (view: SlotView): boolean =>
  view.findText(trackerName)?.node.props.selected === true;

async function chooseGithub(view: SlotView): Promise<void> {
  await expect
    .poll(() => view.findText(trackerName)?.node.props.disabled, {
      timeout: 10_000,
    })
    .toBe(false);
  await view.press(trackerName);
  await expect.poll(() => chosen(view), { timeout: 10_000 }).toBe(true);
}

async function tracker(): Promise<PluginTest> {
  const test = await startPluginTest({
    directory: fileURLToPath(new URL('.', import.meta.url)),
    pluginId: 'issue-tracker',
    version: '0.0.0',
    projects: [project],
    path: [fileURLToPath(new URL('./mocks', import.meta.url))],
  });

  onTestFinished(() => test.close());

  return test;
}

const slot: PluginSlotInput = {
  slotId: projectDetailsSlotId,
  context: { projectId: project.id },
};

it('persists a Tracker chosen in the Project details Slot across views', async () => {
  const test = await tracker();
  const first = test.slot(slot);
  await chooseGithub(first);
  first.close();

  const reopened = test.slot(slot);
  await expect.poll(() => chosen(reopened), { timeout: 10_000 }).toBe(true);
}, 20_000);

it('lists Issues from the selected Tracker and opens an Issue description', async () => {
  const test = await tracker();
  await chooseGithub(test.slot(slot));
  const page = await test.mount({ page: '/', surface: { platform: 'web' } });
  await expect
    .poll(() => page.findText(issueTitle), {
      timeout: 10_000,
    })
    .toBeDefined();
  await page.press(issueTitle);
  // Detail draws the body as `markdown`, which `findText` does not read.
  await expect
    .poll(
      () =>
        JSON.stringify(page.tree).includes(
          'This Issue came from the fixture gh executable.',
        ),
      { timeout: 10_000 },
    )
    .toBe(true);
  expect(page.findText('Open in GitHub')?.node.props.onPress).toEqual({
    action: 'openUrl',
    url: 'https://github.com/owner/repository/issues/42',
  });
  expect(await test.log()).not.toContain('refused');
  await page.press('Back to Issues');
  await expect
    .poll(() => page.findText(issueTitle), {
      timeout: 10_000,
    })
    .toBeDefined();
}, 20_000);

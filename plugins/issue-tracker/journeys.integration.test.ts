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

const selectTracker = 'Select GitHub Issues';

const selectedTracker = 'Selected GitHub Issues';

const issueTitle = '#42  Fixture issue from GitHub';

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
  await expect
    .poll(() => first.findText(selectTracker)?.node.props.disabled, {
      timeout: 10_000,
    })
    .toBe(false);
  await first.press(selectTracker);
  await expect
    .poll(() => first.findText(selectedTracker), { timeout: 10_000 })
    .toBeDefined();
  first.close();

  const reopened = test.slot(slot);
  await expect
    .poll(() => reopened.findText(selectedTracker)?.node.props.disabled, {
      timeout: 10_000,
    })
    .toBe(false);
}, 20_000);

it('lists Issues from the selected Tracker and opens an Issue description', async () => {
  const test = await tracker();
  const details = test.slot(slot);
  await expect
    .poll(() => details.findText(selectTracker)?.node.props.disabled, {
      timeout: 10_000,
    })
    .toBe(false);
  await details.press(selectTracker);
  await expect
    .poll(() => details.findText(selectedTracker), { timeout: 10_000 })
    .toBeDefined();
  const page = test.page();
  await expect
    .poll(() => page.findText(issueTitle), {
      timeout: 10_000,
    })
    .toBeDefined();
  await page.press(issueTitle);
  await expect
    .poll(
      () => page.findText('This Issue came from the fixture gh executable.'),
      { timeout: 10_000 },
    )
    .toBeDefined();
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

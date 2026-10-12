import type { Page } from '@playwright/test';
import { scriptedAgentCommand } from '@repo/mocks/agent/scripted-agent-launch';
import { expect } from '../fixtures';
import { browseAgents } from './agent-catalog';
import { Given, When, Then } from './fixtures';
import { agentModelLabel, openNewSession } from './new-session';

// The scripted Agent's own stdio process, entered as any other ACP program.
const scriptedAgent = scriptedAgentCommand('reply');

// The wide Frame lists every Agent beside its models; the pick shows as pressed when the picker opens again.
async function chooseAgentBeside(page: Page, name: string): Promise<void> {
  const picker = page.getByRole('button', { name: agentModelLabel });
  const choice = page.getByRole('button', { name: `Select ${name}` });
  await picker.click();
  await choice.click();
  await page.keyboard.press('Escape');
  await expect(picker).toHaveAttribute('aria-expanded', 'false');
  await picker.click();
  await expect(choice).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Escape');
}

// The wide title row and the phone header both carry the + button.
async function openAddCustomAgent(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Add custom Agent' }).click();
}

// Each argument is a row; its editor opens as a dialog on a wide Frame and a sheet on a phone.
async function addArgument(page: Page, argument: string): Promise<void> {
  await page.getByRole('link', { name: 'Add argument', exact: true }).click();
  const editor = page.getByRole('dialog', { name: 'Argument' });
  await editor
    .getByRole('textbox', { name: 'Argument', exact: true })
    .fill(argument);
  await editor.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(editor).toBeHidden();
}

async function addScriptedAgent(page: Page, name: string): Promise<void> {
  await openAddCustomAgent(page);
  await page.getByRole('textbox', { name: 'Name', exact: true }).fill(name);
  await page
    .getByRole('textbox', { name: 'Executable', exact: true })
    .fill(scriptedAgent.executable);
  for (const argument of scriptedAgent.args) await addArgument(page, argument);
  await page.getByRole('button', { name: 'Add Agent' }).click();
}

async function expectCheckedAgent(page: Page, name: string): Promise<void> {
  await expect(page).toHaveURL(/\/settings\/agents\/[^/]+$/);
  await expect(page.getByRole('heading', { name, level: 1 })).toBeVisible();
  await expect(page.getByText('Answered ACP initialize')).toBeVisible();
}

When(
  'I add the scripted Agent as the custom Agent {string}',
  async ({ page }, name: string): Promise<void> => {
    await addScriptedAgent(page, name);
  },
);

Given(
  'a saved custom Agent {string}',
  async ({ page }, name: string): Promise<void> => {
    await browseAgents(page);
    await addScriptedAgent(page, name);
    await expectCheckedAgent(page, name);
  },
);

When(
  'I open the custom Agent {string} from the Agents list',
  async ({ page }, name: string): Promise<void> => {
    await page.getByRole('link', { name: /^Agents(?:,|$)/ }).click();
    await page.getByRole('link', { name: new RegExp(`^${name},`) }).click();
  },
);

When(
  'I rename the custom Agent to {string}',
  async ({ page }, name: string): Promise<void> => {
    await page.getByRole('link', { name: 'Edit', exact: true }).click();
    await page.getByRole('textbox', { name: 'Name', exact: true }).fill(name);
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(
      page.getByRole('link', { name: 'Edit', exact: true }),
    ).toBeVisible();
  },
);

Then(
  'the custom Agent {string} passed its check',
  async ({ page }, name: string): Promise<void> => {
    await expectCheckedAgent(page, name);
  },
);

When(
  'I start a New Session with the custom Agent {string}',
  async ({ page }, name: string): Promise<void> => {
    await page.getByRole('button', { name: 'Sessions', exact: true }).click();
    await openNewSession(page);
    await chooseAgentBeside(page, name);
  },
);

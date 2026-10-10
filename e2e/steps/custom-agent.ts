import type { Page } from '@playwright/test';
import { scriptedAgentCommand } from '@repo/mocks/agent/scripted-agent-launch';
import { expect } from '../fixtures';
import { When, Then } from './fixtures';
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

When(
  'I add the scripted Agent as the custom Agent {string}',
  async ({ page }, name: string): Promise<void> => {
    await page.getByRole('button', { name: 'Add custom' }).click();
    await page.getByRole('textbox', { name: 'Name', exact: true }).fill(name);
    await page
      .getByRole('textbox', { name: 'Executable', exact: true })
      .fill(scriptedAgent.executable);
    for (const [index, argument] of scriptedAgent.args.entries()) {
      await page.getByRole('button', { name: 'Add argument' }).click();
      await page
        .getByRole('textbox', { name: `Argument ${index + 1}`, exact: true })
        .fill(argument);
    }
    await page.getByRole('button', { name: 'Add Agent' }).click();
  },
);

Then(
  'the custom Agent {string} passed its check',
  async ({ page }, name: string): Promise<void> => {
    await expect(page).toHaveURL(/\/settings\/agents\/[^/]+$/);
    await expect(page.getByRole('heading', { name, level: 1 })).toBeVisible();
    await expect(page.getByText('Answered ACP initialize')).toBeVisible();
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

import { scriptedAgentCommand } from '@repo/mocks/agent/scripted-agent-launch';
import { expect } from '../fixtures';
import { browseAgents } from './agent-catalog';
import { Given, When, Then, test } from './fixtures';
import { mutate } from './server-query';
import { agentWork } from './timeouts';

Given(
  'a saved protocol sign-in Agent {string}',
  async ({ page, server }, name: string): Promise<void> => {
    await mutate({
      page,
      httpUrl: server.httpUrl,
      procedure: 'agents.registerCustom',
      input: { name, ...scriptedAgentCommand('protocol-login'), env: [] },
    });
    await browseAgents(page);
    await page.getByRole('link', { name: new RegExp(`^${name},`) }).click();
    await expect(page.getByRole('heading', { name, level: 1 })).toBeVisible();
  },
);
When(
  'I open protocol sign-in for {string}',
  async ({ page }, name: string): Promise<void> => {
    await page.getByRole('link', { name: 'Sign in', exact: true }).click();
    await expect(
      page.getByRole('dialog', { name: `Sign in to ${name}` }),
    ).toBeVisible();
  },
);
When(
  "I choose the Agent's subscription sign-in method",
  async ({ page }): Promise<void> => {
    await page
      .getByRole('button', { name: 'Subscription sign-in', exact: true })
      .click();
  },
);
Then(
  "the App shows the Agent's device code instructions",
  async ({ page }): Promise<void> => {
    const dialog = page.getByRole('dialog', {
      name: 'Continue in your browser',
    });
    await expect(
      dialog.getByText('Enter code ABCD-EFGH', { exact: true }),
    ).toBeVisible();
    await expect(
      dialog.getByRole('button', { name: 'Open sign-in page' }),
    ).toBeVisible();
    await page.screenshot({
      path: test.info().outputPath('agent-login-device-code.png'),
    });
  },
);
When(
  "I finish the Agent's browser sign-in",
  async ({ page }): Promise<void> => {
    await page.getByRole('button', { name: 'I’ve finished' }).click();
  },
);
Then(
  'the App reports the Agent is ready to use',
  async ({ page }): Promise<void> => {
    const dialog = page.getByRole('dialog', { name: 'Ready to use' });
    await expect(dialog).toBeVisible(agentWork);
    await page.screenshot({
      path: test.info().outputPath('agent-login-ready.png'),
    });
    await dialog.getByRole('button', { name: 'Done', exact: true }).click();
    await expect(dialog).toBeHidden();
  },
);

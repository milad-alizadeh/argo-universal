import { scriptedAgentCommand } from '@repo/mocks/agent/scripted-agent-launch';
import { expect } from '../fixtures';
import { browseAgents } from './agent-catalog';
import { Given, When, Then, test } from './fixtures';
import { mutate } from './server-query';
Given(
  'a saved terminal sign-in Agent {string}',
  async ({ page, server }, name: string): Promise<void> => {
    await mutate({
      page,
      httpUrl: server.httpUrl,
      procedure: 'agents.registerCustom',
      input: { name, ...scriptedAgentCommand('terminal-login'), env: [] },
    });
    await browseAgents(page);
    await page.getByRole('link', { name: new RegExp(`^${name},`) }).click();
  },
);
When('I choose terminal sign-in', async ({ page }): Promise<void> => {
  await page
    .getByRole('button', { name: 'Terminal sign-in', exact: true })
    .click();
});
Then(
  'the App shows an interactive sign-in terminal',
  async ({ page }): Promise<void> => {
    const terminal = page.getByRole('region', {
      name: 'Agent sign-in terminal',
    });
    await expect(terminal).toBeVisible();
    await expect(terminal.getByRole('textbox')).toBeVisible();
    // xterm draws each line in its rows and again in its accessibility tree.
    await expect(terminal).toContainText('› Continue in your browser');
    await page.screenshot({
      path: test.info().outputPath('agent-terminal-login.png'),
    });
  },
);
When(
  'I press Return in the sign-in terminal',
  async ({ page }): Promise<void> => {
    await page.getByRole('region', { name: 'Agent sign-in terminal' }).click();
    await page.getByRole('textbox').focus();
    await page.keyboard.press('Enter');
  },
);

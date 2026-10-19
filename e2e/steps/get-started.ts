import { expect } from '../fixtures';
import { agentCard } from './agent-catalog';
import { Given, When, Then } from './fixtures';
import { reloadApp } from './frame';
import { returnToSessions } from './navigation';
import { openConfiguration } from './new-session';

Given('the fixture Server has no Projects', async ({ page }) => {
  await expect(
    page.getByRole('heading', { name: 'Agent Setup' }),
  ).toBeVisible();
});

// Get started's Add Agent opens the Agents page; the Agent installs from its card there.
When(
  'I add Agent {string} from Get started',
  async ({ page }, name: string) => {
    await page.getByRole('button', { name: 'Add Agent', exact: true }).click();
    await agentCard(page, name)
      .getByRole('button', { name: `Install ${name}`, exact: true })
      .click();
    await returnToSessions(page);
  },
);

Then('Agent Setup is done', async ({ page }) => {
  await expect(page.getByLabel('Done', { exact: true })).toHaveCount(1);
});

When('the fixture Project is registered', async ({ app, page }) => {
  await app.restartEngine(() => Promise.resolve());
  await reloadApp(page);
});

Then('the Agent picker remembers {string}', async ({ page }, name: string) => {
  await openConfiguration(page);
  await expect(
    page.getByRole('button', { name: /^Agent(?:,|$)/ }),
  ).toContainText(name);
  await page.getByRole('button', { name: /^Agent(?:,|$)/ }).click();
  await expect(page.getByRole('button', { name, exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});

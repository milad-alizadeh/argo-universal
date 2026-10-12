import type { Locator, Page } from '@playwright/test';
import { expect } from '../fixtures';
import { When, Then } from './fixtures';
import { phone } from './frame';

// The Server's own Project is the test repository it was started with, named after its folder.
const projectName = 'project';
// A Project row is named "<name>, <trailing detail>"; the test repository has no origin.
const projectRow = `${projectName}, No remote`;

function settingsRow(page: Page, title: string): Locator {
  return page.getByRole('link', { name: new RegExp(`^${title}(?:,|$)`) });
}

When('I open Settings', async ({ page }): Promise<void> => {
  if (page.viewportSize()?.width === phone.width)
    await page.getByRole('button', { name: 'Open navigation' }).click();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
});

Then(
  "Settings counts the Server's Projects and Agents",
  async ({ page }): Promise<void> => {
    await expect(settingsRow(page, 'Projects')).toHaveAccessibleName(
      /^Projects, 1(?:,|$)/,
    );
    await expect(settingsRow(page, 'Agents')).toHaveAccessibleName(
      /^Agents, \d+(?:,|$)/,
    );
  },
);

When('I open the Projects', async ({ page }): Promise<void> => {
  await settingsRow(page, 'Projects').click();
  await expect(page).toHaveURL(/\/settings\/projects$/);
});

Then(
  "the Projects list names the Server's Project",
  async ({ page }): Promise<void> => {
    await expect(
      page.getByRole('link', { name: projectRow, exact: true }),
    ).toBeVisible();
  },
);

When("I open the Server's Project", async ({ page }): Promise<void> => {
  await page.getByRole('link', { name: projectRow, exact: true }).click();
  await expect(page).toHaveURL(
    new RegExp(`/settings/projects/${projectName}$`),
  );
});

Then('the Project page shows its folder', async ({ page }): Promise<void> => {
  await expect(
    page.getByRole('group', { name: new RegExp(`/${projectName}$`) }),
  ).toBeVisible();
});

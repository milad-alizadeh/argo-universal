import type { Page } from '@playwright/test';
import { expect } from '../fixtures';
import { Then, When } from './fixtures';
import { onPhone } from './frame';
import { sessionOpenTimeout } from './new-session';
import { navigation } from './plugins';

const scheduled = 'Scheduled';

const newSchedule = 'New Schedule';

When('I open Scheduled', async ({ page }): Promise<void> => {
  const sections = await navigation(page);

  await sections.getByRole('button', { name: scheduled, exact: true }).click();
  await expect(page).toHaveURL(/\/scheduled$/);
});

When(
  'I create a Schedule with instructions {string}',
  async ({ page }, instructions: string): Promise<void> => {
    await page.getByRole('button', { name: newSchedule, exact: true }).click();

    const form = page.getByRole('dialog', { name: newSchedule });

    await form
      .getByRole('textbox', { name: 'Instructions' })
      .fill(instructions);
    await form.getByRole('button', { name: 'Create Schedule' }).click();
    await expect(form).toBeHidden();
  },
);

// Scheduled resolves the task's Session from the Schedule id in the path.
const taskRoute = /\/scheduled\/[^/?#]+$/;

const openedTasks = new WeakMap<Page, string>();

const openedTask = async (page: Page): Promise<string> => {
  await expect(page).toHaveURL(taskRoute, sessionOpenTimeout);
  await expect(page.getByText('Schedule created', { exact: true })).toBeVisible(
    sessionOpenTimeout,
  );

  return new URL(page.url()).pathname;
};

Then(
  'the Schedule opens its task Session with {string} in its Feed',
  async ({ page }, instructions: string): Promise<void> => {
    openedTasks.set(page, await openedTask(page));
    await expect(
      page.getByTestId('feed-scroll').getByText(instructions, { exact: true }),
    ).toBeVisible();
  },
);

Then(
  'Scheduled returns to the same task Session',
  async ({ page }): Promise<void> => {
    expect(await openedTask(page)).toBe(openedTasks.get(page));
  },
);

When(
  'I reopen the Schedule {string} from its list',
  async ({ page }, title: string): Promise<void> => {
    await (onPhone(page)
      ? page.getByRole('link', { name: /, back$/ }).click()
      : page.goBack());

    await expect(page).toHaveURL(/\/scheduled$/);

    await page
      .getByRole('button', { name: title, exact: true })
      .and(page.locator('[aria-pressed]'))
      .click();
  },
);

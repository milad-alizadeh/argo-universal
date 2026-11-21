import type { Locator, Page } from '@playwright/test';
import { expect } from '../fixtures';
import { Then, When } from './fixtures';
import { onPhone } from './frame';
import { sessionOpenTimeout } from './new-session';
import { navigation } from './plugins';

const scheduled = 'Scheduled';

const newSchedule = 'New Schedule';

const runNow = (page: Page): Locator =>
  page.getByRole('button', { name: 'Run now', exact: true });

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

Then(
  'the Schedule offers to run for the first time',
  async ({ page }): Promise<void> => {
    await expect(runNow(page)).toBeVisible();
    await expect(page.getByTestId('feed-scroll')).toHaveCount(0);
  },
);

When('I run the Schedule now', async ({ page }): Promise<void> => {
  await runNow(page).click();
});

Then(
  'the Session Feed shows the scheduled instructions {string}',
  async ({ page }, instructions: string): Promise<void> => {
    const prompt = page
      .getByTestId('feed-scroll')
      .getByText(instructions, { exact: true });

    await expect(prompt).toBeVisible(sessionOpenTimeout);
  },
);

When(
  'I reopen the Schedule {string} from its list',
  async ({ page }, title: string): Promise<void> => {
    if (onPhone(page))
      await page.getByRole('link', { name: /, back$/ }).click();

    await page.getByRole('button', { name: title, exact: true }).click();
  },
);

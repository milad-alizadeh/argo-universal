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

// A task Schedule's Session exists from creation, so its address names it (ADR-0067).
const scheduleSession = /\/scheduled\/[^/?]+\?sessionId=([^&]+)$/;

const openedSessions = new WeakMap<Page, string>();

const openedSession = async (page: Page): Promise<string> => {
  await expect(page).toHaveURL(scheduleSession, sessionOpenTimeout);

  return scheduleSession.exec(page.url())?.[1] ?? '';
};

Then('the Schedule opens its Session', async ({ page }): Promise<void> => {
  openedSessions.set(page, await openedSession(page));
});

Then('the Schedule opens the same Session', async ({ page }): Promise<void> => {
  expect(await openedSession(page)).toBe(openedSessions.get(page));
});

When(
  'I reopen the Schedule {string} from its list',
  async ({ page }, title: string): Promise<void> => {
    if (onPhone(page))
      await page.getByRole('link', { name: /, back$/ }).click();

    await page.getByRole('button', { name: title, exact: true }).click();
  },
);

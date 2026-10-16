import type { Locator, Page } from '@playwright/test';
import { type App, expect } from '../fixtures';
import { Given, When, Then } from './fixtures';
import { phone, wide } from './frame';
import { expectRunningCommand, restartEngine } from './live-feed';
import { attentionLabel, liveTitle, startSession } from './live-session';

// The pages each scenario opened besides its first, as other devices.
const otherPages = new WeakMap<Page, Page>();

const sessionWithStatus = (
  page: Page,
  title: string,
  status: string,
): Locator =>
  page.getByRole('button', { name: `${title}, ${status}`, exact: true });

/*
 * A Session is Unread only when nobody saw the end of its Feed, so the reader
 * leaves before the Turn ends; the Turn ends by the Engine restarting, which
 * stops it with a Notice the reader has not seen.
 */
async function leaveTurnToEnd(
  app: Pick<App, 'restartEngine'>,
  page: Page,
  title: string,
): Promise<void> {
  await page.setViewportSize(wide);
  await startSession(page, title);
  await expectRunningCommand(page);
  await page.getByRole('button', { name: 'New Session', exact: true }).click();
  await expect(page).toHaveURL(/\/sessions\/new$/);
  await restartEngine(app, page);
  await expect(sessionWithStatus(page, title, 'Unread')).toBeVisible({
    timeout: 30_000,
  });
}

When(
  'a Turn ends while I am away from the Session {string}',
  async ({ app, page }, title: string): Promise<void> => {
    await leaveTurnToEnd(app, page, title);
  },
);

Given(
  'an unread Session in a phone Frame',
  async ({ app, page }): Promise<void> => {
    await leaveTurnToEnd(app, page, liveTitle);
    await page.setViewportSize(phone);
    await page.getByRole('link', { name: /back/i }).click();
  },
);

When(
  "I see the end of the Session {string}'s Feed on another page",
  async ({ app, page }, title: string): Promise<void> => {
    if (!app.openPage) throw new Error('This scenario needs the web App');
    const other = await app.openPage();
    otherPages.set(page, other);
    await other.setViewportSize(wide);
    await other.goto('/');
    await sessionWithStatus(other, title, 'Unread').click();
    await expect(
      other.getByTestId('feed-scroll').getByText(title, { exact: true }),
    ).toBeVisible();
  },
);

Then(
  'the first page shows the Session {string} seen with no attention badge',
  async ({ page }, title: string): Promise<void> => {
    await expect(sessionWithStatus(page, title, 'Idle')).toBeVisible();
    await expect(page.getByLabel(attentionLabel, { exact: true })).toHaveCount(
      0,
    );
    await otherPages.get(page)?.close();
  },
);

import type { Page } from '@playwright/test';
import { expect } from '../fixtures';
import { Given, When, Then } from './fixtures';
import { phone } from './frame';
import {
  attentionLabel,
  liveTitle,
  sessionRow,
  startReadSession,
} from './live-session';
import { connectSecondApp } from './second-app';
import { mutate } from './server-query';

const otherTitle = 'Plan the release';

// One Session gets a new Turn from another App, as a client of the Server, while another Session is open here.
async function promptWhileAnotherIsOpen(
  page: Page,
  httpUrl: string,
  titles: { changed: string; open: string },
): Promise<void> {
  const id = await startReadSession(page, titles.changed);
  await startReadSession(page, titles.open);
  await mutate({
    page,
    httpUrl,
    procedure: 'session.prompt',
    input: { sessionId: id, prompt: [{ type: 'text', text: 'Check again' }] },
  });
}

async function makeLiveSessionUnread(
  page: Page,
  httpUrl: string,
): Promise<void> {
  await promptWhileAnotherIsOpen(page, httpUrl, {
    changed: liveTitle,
    open: otherTitle,
  });
  await expect(sessionRow(page, liveTitle, 'Unread')).toBeVisible();
}

Given(
  'an unread Session in a wide Frame',
  async ({ page, server }): Promise<void> => {
    await makeLiveSessionUnread(page, server.httpUrl);
  },
);

Given(
  'an unread Session in a phone Frame',
  async ({ page, server }): Promise<void> => {
    await makeLiveSessionUnread(page, server.httpUrl);
    await page.setViewportSize(phone);
    await page.getByRole('link', { name: /back/i }).click();
  },
);

When(
  'another App prompts the Session {string} while {string} is open',
  async ({ page, server }, changed: string, open: string): Promise<void> => {
    await promptWhileAnotherIsOpen(page, server.httpUrl, { changed, open });
  },
);

Then(
  'the Sessions list shows the unread Session with one attention badge',
  async ({ page }): Promise<void> => {
    await expect(sessionRow(page, liveTitle, 'Unread')).toBeVisible();
    await expect(page.getByLabel(attentionLabel, { exact: true })).toHaveText(
      '1',
    );
  },
);

Then(
  'the Sessions list shows {string} as read with no attention badge',
  async ({ page }, title: string): Promise<void> => {
    await expect(sessionRow(page, title, 'Idle')).toBeVisible();
    await expect(page.getByLabel(attentionLabel, { exact: true })).toHaveCount(
      0,
    );
  },
);

// The other App is the context's second page; the context closes it with the test.
function otherApp(page: Page): Page {
  const other = page
    .context()
    .pages()
    .find((open) => open !== page);
  if (!other) throw new Error('No other App is open');
  return other;
}

Given(
  'another App shows the Sessions list',
  async ({ page, server }): Promise<void> => {
    const other = await page.context().newPage();
    // A wide `/` opens the newest Session, which would read it; a phone `/` shows only the list.
    await other.setViewportSize(phone);
    await connectSecondApp(other, server.httpUrl);
    await other.goto('/');
    await expect(sessionRow(other, liveTitle, 'Unread')).toBeVisible();
  },
);

Then(
  'the other App shows {string} as read with no attention badge',
  async ({ page }, title: string): Promise<void> => {
    const other = otherApp(page);
    await expect(sessionRow(other, title, 'Idle')).toBeVisible();
    await expect(other.getByLabel(attentionLabel, { exact: true })).toHaveCount(
      0,
    );
  },
);

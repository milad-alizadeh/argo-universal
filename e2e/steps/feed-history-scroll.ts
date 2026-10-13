import type { Page } from '@playwright/test';
import { expect } from '../fixtures';

export const oldestHistoryMessage = 'History message 1.';

export async function scrollToOldestHistoryMessage(page: Page): Promise<void> {
  const feed = page.getByTestId('feed-scroll');
  const oldest = feed.getByText(oldestHistoryMessage, { exact: true });
  await expect(async () => {
    await feed.evaluate((element) => {
      element.scrollTop = 0;
    });
    await oldest.scrollIntoViewIfNeeded({ timeout: 100 });
    await expect(oldest).toBeInViewport({ timeout: 100 });
  }).toPass({ timeout: 5000 });
}

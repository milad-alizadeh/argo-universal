import type { Page } from '@playwright/test';
import { expect } from '../fixtures';
import { expectMessage, messageLabel } from './new-session';

// Once the Input request settles, the Composer takes the next prompt.
export async function expectComposerAccepts(
  page: Page,
  draft: string,
): Promise<void> {
  await page.getByRole('textbox', { name: messageLabel }).fill(draft);
  await expectMessage(page, draft);
  await expect(
    page.getByRole('button', { name: 'Send', exact: true }),
  ).toBeEnabled();
}

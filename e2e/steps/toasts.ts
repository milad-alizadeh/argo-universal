import type { Page, Locator } from '@playwright/test';
// A toast's text, inside the live region that announces it.
export const toast = (page: Page, text: string, exact = true): Locator =>
  page
    .getByRole('region', { name: /^Notifications/ })
    .getByText(text, { exact });

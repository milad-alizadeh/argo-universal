import type { Page, Locator } from '@playwright/test';

const notifications = (page: Page): Locator =>
  page.getByRole('region', { name: /^Notifications/ });

// A toast's text, inside the live region that announces it.
export const toast = (page: Page, text: string, exact = true): Locator =>
  notifications(page).getByText(text, { exact });

// Every toast on show.
export const shownToasts = (page: Page): Locator =>
  notifications(page).getByRole('listitem');

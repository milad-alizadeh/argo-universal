import { expect } from '../fixtures';
import { Then, When } from './fixtures';
import { serveOnePage } from './frame';

Then(
  'the Plugin row {string} is shown',
  async ({ page }, name: string): Promise<void> => {
    await expect(page.getByText(name, { exact: true })).toBeVisible();
  },
);

When(
  "I reload the Plugin page and press the browser's Back",
  async ({ page }): Promise<void> => {
    await serveOnePage(page);
    await page.reload();
    await expect(page.getByRole('link', { name: /, back$/ })).toBeVisible();
    await page.goBack();
  },
);

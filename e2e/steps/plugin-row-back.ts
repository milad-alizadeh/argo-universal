import { expect } from '../fixtures';
import { Then } from './fixtures';

Then(
  'the Plugin row {string} is shown',
  async ({ page }, name: string): Promise<void> => {
    await expect(page.getByText(name, { exact: true })).toBeVisible();
  },
);

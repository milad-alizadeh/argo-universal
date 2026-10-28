import { expect } from '../fixtures';
import { Then, When } from './fixtures';

Then(
  'the Session bar reads {string}',
  async ({ page }, line: string): Promise<void> => {
    await expect(page.getByText(line, { exact: true })).toBeVisible();
  },
);

When(
  'I press Open for the {word} Plugin on the Session bar',
  async ({ page }, name: string): Promise<void> => {
    await page
      .getByRole('button', { name: `Open ${name}`, exact: true })
      .click();
  },
);

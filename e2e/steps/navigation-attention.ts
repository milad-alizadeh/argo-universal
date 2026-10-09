import { expect } from '../fixtures';
import { When, Then } from './fixtures';
import { attentionLabel } from './live-session';

When('I view the phone navigation', async ({ page }): Promise<void> => {
  await page.getByRole('button', { name: 'Open navigation' }).click();
});

Then(
  'navigation shows one Session needing attention',
  async ({ page }): Promise<void> => {
    await expect(page.getByLabel(attentionLabel, { exact: true })).toHaveText(
      '1',
    );
  },
);

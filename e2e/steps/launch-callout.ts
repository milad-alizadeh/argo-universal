import { expect } from '../fixtures';
import { callout } from './agent-sign-in';
import { When, Then } from './fixtures';
import { onPhone } from './frame';
import { sessionOpenTimeout } from './new-session';

const retryHint = 'Try to restart the Agent';

Then(
  'the App says the Agent failed to launch',
  async ({ page }): Promise<void> => {
    await expect(callout(page, 'Failed to Launch')).toBeVisible(
      sessionOpenTimeout,
    );
  },
);

Then(
  'the launch failure shows {string}',
  async ({ page }, stderr: string): Promise<void> => {
    await expect(page.getByText(stderr)).toBeVisible();
  },
);

When('I press Retry', async ({ page }): Promise<void> => {
  await page.getByRole('button', { name: retryHint }).click();
});

// A phone's sheet swipes away; a wide window's tray stays above the Composer.
When('I put the callout away', async ({ page }): Promise<void> => {
  if (!onPhone(page)) return;
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

Then('the launch callout is gone', async ({ page }): Promise<void> => {
  await expect(callout(page, 'Failed to Launch')).toHaveCount(
    0,
    sessionOpenTimeout,
  );
});

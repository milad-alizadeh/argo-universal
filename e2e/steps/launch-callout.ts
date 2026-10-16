import { expect } from '../fixtures';
import { callout } from './agent-sign-in';
import { When, Then } from './fixtures';
import { onPhone } from './frame';
import { sessionOpenTimeout } from './new-session';
import { shownToasts } from './toasts';

const retryHint = 'Try to restart the Agent';

const launchFailureTitle = 'Failed to Launch';

Then(
  'the App says the Agent failed to launch',
  async ({ page }): Promise<void> => {
    await expect(callout(page, launchFailureTitle)).toBeVisible(
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
  await expect(callout(page, launchFailureTitle)).toHaveCount(
    0,
    sessionOpenTimeout,
  );
});

/*
 * A dropped Connection under an open Session: the banner says so, and no launch callout claims
 * the Agent failed. Each page in a section's stack has its banner; the shown page's is the visible one.
 */
Then('the App says it is reconnecting', async ({ page }): Promise<void> => {
  await expect(
    page
      .getByText('Reconnecting…', { exact: true })
      .filter({ visible: true })
      .first(),
  ).toBeVisible(sessionOpenTimeout);
});

Then('the App shows no launch failure', async ({ page }): Promise<void> => {
  await expect(callout(page, launchFailureTitle)).toHaveCount(0);
});

// The banner already says the Connection dropped; no toast repeats it.
Then('the App shows no toast', async ({ page }): Promise<void> => {
  await expect(shownToasts(page)).toHaveCount(0);
});

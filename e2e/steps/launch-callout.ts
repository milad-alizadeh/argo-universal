import { expect } from '../fixtures';
import { callout } from './agent-sign-in';
import { Then } from './fixtures';
import { sessionOpenTimeout } from './new-session';

const launchFailureTitle = 'Failed to Launch';

Then(
  'the App says the Agent failed to launch',
  async ({ page }): Promise<void> => {
    await expect(
      page
        .getByText('Couldn’t load configuration.', { exact: true })
        .or(callout(page, launchFailureTitle)),
    ).toBeVisible(sessionOpenTimeout);
  },
);

Then(
  'the launch failure shows {string}',
  async ({ page }, stderr: string): Promise<void> => {
    await expect(page.getByText(stderr)).toBeVisible();
  },
);

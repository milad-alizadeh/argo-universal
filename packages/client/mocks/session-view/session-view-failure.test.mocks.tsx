import { findToast } from '@repo/kit/mocks/find-toast';
import { expect } from 'storybook/test';
import type { Story } from './session-view-story.test.mocks';

const agentFailure = 'The Agent stopped three times in ten minutes';

// A Session that failed gives no prompt and toasts the Server's reason.
export const failedWithReason: Story = {
  args: { view: { state: 'failed', reason: agentFailure } },
  play: async ({ canvas }) => {
    await expect(await findToast("Couldn't open the Session")).toBeVisible();
    await expect(await findToast(agentFailure)).toBeVisible();
    await expect(canvas.queryByRole('textbox', { name: 'Message' })).toBeNull();
  },
};

// Without a reason from the Server, the toast says the Server didn't respond.
export const failedWithoutReason: Story = {
  args: { view: { state: 'failed' } },
  play: async () => {
    await expect(await findToast("Couldn't open the Session")).toBeVisible();
    await expect(
      await findToast("The Server didn't respond. Check that it's running."),
    ).toBeVisible();
  },
};

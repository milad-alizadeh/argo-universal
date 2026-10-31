import { findToast } from '@repo/kit/mocks/find-toast';
import { expect, fn } from 'storybook/test';
import type { Story } from './session-view-story.test.mocks';

const openFailedTitle = "Couldn't open the Session";

const agentFailure = 'The Agent stopped three times in ten minutes';

// A Session that failed gives no prompt and toasts the Server's reason.
export const failedWithReason: Story = {
  args: { view: { state: 'failed', reason: agentFailure } },
  play: async ({ canvas }) => {
    await expect(await findToast(openFailedTitle)).toBeVisible();
    await expect(await findToast(agentFailure)).toBeVisible();
    await expect(canvas.queryByRole('textbox', { name: 'Message' })).toBeNull();
  },
};

// Without a reason from the Server, the toast says the Server didn't respond.
export const failedWithoutReason: Story = {
  args: { view: { state: 'failed' } },
  play: async () => {
    await expect(await findToast(openFailedTitle)).toBeVisible();
    await expect(
      await findToast("The Server didn't respond. Check that it's running."),
    ).toBeVisible();
  },
};

const onLeave = fn();

// A Session the Server doesn't have is named on the page, with a way back, and no toast blames the Server.
export const missing: Story = {
  args: { view: { state: 'missing', onLeave } },
  play: async ({ canvas, userEvent }) => {
    await expect(
      await canvas.findByText("This Session doesn't exist"),
    ).toBeVisible();
    await expect(canvas.queryByText(openFailedTitle)).toBeNull();
    await userEvent.click(
      canvas.getByRole('button', { name: 'Back to Sessions' }),
    );
    await expect(onLeave).toHaveBeenCalledOnce();
  },
};

import { settleLayout } from '@repo/kit/mocks/story-layout';
import { expect, fn, within } from 'storybook/test';
import { idleSession } from '../../src/screens/sessions/$id/session-detail-view.mocks';
import type { Story } from './session-view-story.test.mocks';

const onAuthenticate = fn();

// A Turn that ended `auth_required` asks for sign-in above the Composer, and the Feed and Composer stay.
export const authenticationRequired: Story = {
  args: {
    view: {
      state: 'open',
      ...idleSession,
      callout: { kind: 'auth-required', onAuthenticate },
    },
  },
  play: async ({ canvas, canvasElement, userEvent }) => {
    await settleLayout('wide');
    const page = within(canvasElement.ownerDocument.body);
    await expect(
      await page.findByText('Authentication Required'),
    ).toBeVisible();
    await expect(
      canvas.getByRole('textbox', { name: 'Message' }),
    ).toBeVisible();
    await expect(
      canvas.getByRole('heading', { name: /^Without using any tools/ }),
    ).toBeVisible();
    await userEvent.click(page.getByRole('button', { name: 'Authenticate' }));
    await expect(onAuthenticate).toHaveBeenCalledOnce();
  },
};

import { expect } from 'storybook/test';
import { archivedBannerText } from '../../src/features/sessions';
import { eachLayout } from '../../src/lib/generic/each-layout';
import { idleSession } from '../../src/screens/sessions/$id/session-detail-view.mocks';
import type { Story } from './session-view-story.test.mocks';

// An archived Session's Feed stays readable; the banner takes the Composer's place and offers no button.
export const archivedIsReadOnly: Story = {
  args: { view: { state: 'open', ...idleSession, archived: true } },
  play: async ({ canvas }) =>
    eachLayout(async () => {
      await expect(
        await canvas.findByRole('heading', {
          name: /^Without using any tools/,
        }),
      ).toBeVisible();
      await expect(canvas.getByText(archivedBannerText)).toBeVisible();
      await expect(
        canvas.queryByRole('textbox', { name: 'Message' }),
      ).toBeNull();
      await expect(canvas.queryByRole('button', { name: 'Send' })).toBeNull();
      await expect(canvas.queryByRole('button', { name: 'Undo' })).toBeNull();
    }),
};

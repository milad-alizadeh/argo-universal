import { eachLayout } from '@repo/kit/mocks/story-layout';
import { expect, fn } from 'storybook/test';
import { archivedBannerText } from '../../src/features/sessions';
import { idleSession } from '../../src/screens/sessions/$id/session-detail-view.mocks';
import type { Story } from './session-view-story.test.mocks';

const archivedMenu = {
  archived: true,
  status: 'idle',
  onRename: fn(),
  onArchive: fn(),
} as const;

// An archived Session's Feed stays readable; the banner takes the Composer's place and offers no button.
export const archivedIsReadOnly: Story = {
  args: {
    view: {
      state: 'open',
      ...idleSession,
      header: { ...idleSession.header, menu: archivedMenu },
      archived: true,
    },
  },
  play: async ({ canvas }) =>
    eachLayout(async (wide) => {
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

      // The band's fixed control remains disabled; the phone omits the unavailable menu.
      await (wide
        ? expect(canvas.getByRole('button', { name: 'More' })).toBeDisabled()
        : expect(canvas.queryByRole('button', { name: 'More' })).toBeNull());
    }),
};

import { expect, fn } from 'storybook/test';
import { archivedBannerText } from '../../src/features/session-list';
import { eachLayout } from '../../src/lib/generic/each-layout';
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
      // An archived Session offers neither Rename nor Archive, so the header draws no ⋯.
      await expect(canvas.queryByRole('button', { name: 'More' })).toBeNull();
    }),
};

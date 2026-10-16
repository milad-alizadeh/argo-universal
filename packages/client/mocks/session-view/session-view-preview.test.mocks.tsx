import { expect } from 'storybook/test';
import { runningSession } from '../../src/screens/sessions/$id/session-detail-view.mocks';
import type { Story } from './session-view-story.test.mocks';

// A long-press preview draws the Feed alone: no Composer to type into.
export const previewShowsTheFeedAlone: Story = {
  args: { view: { state: 'open', ...runningSession, preview: true } },
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole('heading', { name: /^Think briefly first/ }),
    ).toBeVisible();
    await expect(canvas.queryByRole('textbox', { name: 'Message' })).toBeNull();
  },
};

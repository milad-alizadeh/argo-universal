import { settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, waitFor } from 'storybook/test';
import { recordedImageUrl } from '../../../../lib/product/feed-message.mocks';
import type { FeedViewItem } from '../../view/feed-view';
import { Feed } from './feed';
import { rhythmAudits } from './feed-rhythm-audit-fixtures';

const meta = {
  title: 'Tests/Feed/RhythmAudit',
  component: Feed,
  parameters: { screenPreview: true },
  args: {
    items: [],
    liveHeader: null,
    loadingOlder: false,
    onStartReached: (): void => {},
    imageUrl: recordedImageUrl,
    opensAtStart: true,
  },
} satisfies Meta<typeof Feed>;

export default meta;

type Story = StoryObj<typeof meta>;

// Nothing in a recorded Turn pushes the Feed sideways on a phone.
function fitsThePhone(items: FeedViewItem[]): Story {
  return {
    args: { items },
    beforeEach: () => settleLayout('phone'),
    play: async ({ canvas }) => {
      const scroll = await canvas.findByTestId('feed-scroll');

      await canvas.findAllByTestId('feed-column');
      await waitFor(async () => {
        await expect(scroll.scrollWidth).toBeLessThanOrEqual(
          scroll.clientWidth + 1,
        );
      });
    },
  };
}

export const Transitions = fitsThePhone(rhythmAudits.transitions);

export const Markdown = fitsThePhone(rhythmAudits.markdown);

export const Attachments = fitsThePhone(rhythmAudits.attachments);

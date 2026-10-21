import { layoutWidths } from '@repo/kit/each-layout';
import { settleViewport } from '@repo/kit/settle-viewport';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, waitFor, within } from 'storybook/test';
import {
  type MockAgent,
  recordedAgentMessage,
  recordedFeedMock,
  recordedImageUrl,
  recordedUserMessage,
  redSquareDataUrl,
} from '../../../../lib/product/feed-message.mocks';
import { toFeedView } from '../../view/to-feed-view';
import { Feed } from '../feed/feed';
import { feedContentArgs } from './feed-content.mocks';

const meta = {
  title: 'Tests/FeedContent',
  component: Feed,
  parameters: { screenPreview: true },
  args: feedContentArgs,
} satisfies Meta<typeof Feed>;

export default meta;

type Story = StoryObj<typeof meta>;

function opensAgentImage(viewportWidth: number, agent: MockAgent): Story {
  const image = recordedUserMessage(agent, 'image-prompt').content.filter(
    (block) => block.type === 'image',
  );

  const row = {
    ...recordedAgentMessage(agent, 'markdown-answer'),
    content: image,
  };

  return {
    args: {
      items: toFeedView(
        [row],
        recordedFeedMock(agent, 'markdown-answer').snapshot,
      ).items,
      imageUrl: recordedImageUrl,
    },
    play: async ({ canvas, userEvent }) => {
      await settleViewport(viewportWidth);
      await userEvent.click(
        canvas.getByRole('button', { name: 'Open image, 32×32' }),
      );
      const dialog = await within(document.body).findByRole('dialog');
      await waitFor(() => expect(dialog).toBeVisible());
      await expect(
        within(dialog).getByRole('img', { name: '32×32' }),
      ).toHaveAttribute('src', redSquareDataUrl);
      await userEvent.keyboard('{Escape}');
      await waitFor(() =>
        expect(
          within(document.body).queryByRole('dialog'),
        ).not.toBeInTheDocument(),
      );
    },
  };
}

export const ImageFirstAgentPhone = opensAgentImage(
  layoutWidths.phone,
  'agent-1',
);

export const ImageFirstAgentWide = opensAgentImage(
  layoutWidths.wide,
  'agent-1',
);

export const ImageSecondAgentPhone = opensAgentImage(
  layoutWidths.phone,
  'agent-2',
);

export const ImageSecondAgentWide = opensAgentImage(
  layoutWidths.wide,
  'agent-2',
);

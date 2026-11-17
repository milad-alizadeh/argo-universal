import { layoutWidths, settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { expect, waitFor, within } from 'storybook/test';
import {
  recordedImageUrl,
  redSquareDataUrl,
} from '../../../../lib/product/feed-message.mocks';
import { FeedImageUrlContext } from '../feed-image';
import { ToolCallGroup } from './tool-call-group';
import { imageReadsGroup } from './tool-call-group-fixtures';
import { renderRecordedActivity } from './tool-call-group-preview.mocks';

const meta = {
  title: 'Tests/Feed/ToolCallGroup/Images',
  component: ToolCallGroup,
  args: { ...imageReadsGroup, renderActivity: renderRecordedActivity },
  decorators: [
    (Story): React.JSX.Element => (
      <FeedImageUrlContext.Provider value={recordedImageUrl}>
        <Story />
      </FeedImageUrlContext.Provider>
    ),
  ],
} satisfies Meta<typeof ToolCallGroup>;

export default meta;

type Story = StoryObj<typeof meta>;

const before = 'Open image, feed-before.png';

const after = 'Open image, feed-after.png';

function opensReadImages(width: number): Story {
  return {
    play: async ({ canvas, userEvent }) => {
      await settleLayout(width);
      await expect(canvas.getByRole('button', { name: before })).toBeVisible();
      await expect(canvas.getByRole('button', { name: after })).toBeVisible();

      await userEvent.click(canvas.getByRole('button', { name: before }));
      const dialog = await within(document.body).findByRole('dialog');
      await waitFor(() => expect(dialog).toBeVisible());
      await expect(
        within(dialog).getByRole('img', { name: 'feed-before.png' }),
      ).toHaveAttribute('src', redSquareDataUrl);
      await userEvent.keyboard('{Escape}');
      await waitFor(() =>
        expect(
          within(document.body).queryByRole('dialog'),
        ).not.toBeInTheDocument(),
      );

      await userEvent.click(
        canvas.getByRole('button', { name: imageReadsGroup.group.title }),
      );
      await waitFor(() =>
        expect(canvas.getAllByRole('button', { name: before })).toHaveLength(2),
      );
      await expect(canvas.getAllByRole('button', { name: after })).toHaveLength(
        2,
      );

      await userEvent.click(
        canvas.getByRole('button', { name: /^Read .*feed-before\.png$/ }),
      );
      await expect(canvas.queryByText('Output')).not.toBeInTheDocument();
      await expect(canvas.queryByText(/iVBORw0KGgo/)).not.toBeInTheDocument();
    },
  };
}

export const OpensReadImagesPhone = opensReadImages(layoutWidths.phone);

export const OpensReadImagesWide = opensReadImages(layoutWidths.wide);

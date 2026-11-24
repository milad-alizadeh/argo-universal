import type { BlobRef, ContentBlock, ImageContent } from '@repo/contracts';
import { renderCounter } from '@repo/kit/mocks/render-counts';
import { settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { Profiler } from 'react';
import { expect, waitFor } from 'storybook/test';
import {
  recordedAgentMessage,
  recordedFeedMock,
  recordedUserMessage,
  redSquareDataUrl,
} from '../../../../lib/product/feed-message.mocks';
import { toFeedView } from '../../view/to-feed-view';
import type { ImageUrl } from '../feed-image';
import { Feed } from './feed';
import { feedScrollId, scrolledToEnd, settleWait } from './feed-reader.mocks';
import { feedArgs } from './paged-feed.mocks';

const { snapshot } = recordedFeedMock('agent-1', 'markdown-answer');

const recordedPrompt = recordedUserMessage('agent-1', 'image-prompt');

const promptBlob = 'late-prompt-image';

const answerBlob = 'late-answer-image';

// The recorded prompt's image as another Blob, so one arriving is told from the other.
const imageOf = (blobId: string): ImageContent[] =>
  recordedPrompt.content.flatMap((block: ContentBlock) =>
    block.type === 'image'
      ? [{ ...block, name: blobId, blob: { ...block.blob, blobId } }]
      : [],
  );

const items = [
  ...feedArgs.items,
  ...toFeedView(
    [
      { ...recordedPrompt, id: 'prompt-row', content: imageOf(promptBlob) },
      {
        ...recordedAgentMessage('agent-1', 'markdown-answer'),
        id: 'answer-row',
        content: imageOf(answerBlob),
      },
    ],
    snapshot,
  ).items,
];

// Images that come later, as a paired Server's do: empty until `arrive`, and each Blob tells only its own readers.
const arrived = new Set<string>();

const waiting = new Map<string, Set<() => void>>();

const lateImageUrl: ImageUrl = Object.assign(
  (blob: BlobRef): string => (arrived.has(blob.blobId) ? redSquareDataUrl : ''),
  {
    watch: (blobId: string, changed: () => void): (() => void) => {
      const readers = waiting.get(blobId) ?? new Set<() => void>();
      readers.add(changed);
      waiting.set(blobId, readers);

      return (): void => void readers.delete(changed);
    },
  },
);

const arrive = (blobId: string): void => {
  arrived.add(blobId);

  for (const changed of waiting.get(blobId) ?? []) changed();
};

const meta = {
  title: 'Tests/Feed/ImageRenders',
  component: Feed,
  parameters: { screenPreview: true },
  args: { ...feedArgs, items, imageUrl: lateImageUrl },
} satisfies Meta<typeof Feed>;

export default meta;

type Story = StoryObj<typeof meta>;

const renders = renderCounter();

export const ArrivingImageDrawsOnlyItsOwnThumbnail: Story = {
  render: (args) => (
    <Profiler id={renders.id} onRender={renders.onRender}>
      <Feed {...args} />
    </Profiler>
  ),
  beforeEach: () => {
    arrived.clear();
    waiting.clear();
  },
  play: async ({ canvas, canvasElement }) => {
    await settleLayout('wide');
    const scroll = await canvas.findByTestId(feedScrollId);
    await waitFor(() => expect(scrolledToEnd(scroll)).toBe(true), settleWait);
    await waitFor(() => expect(waiting.get(answerBlob)?.size).toBe(1));

    const counts = await renders.during(canvasElement, async () => {
      arrive(answerBlob);
      await waitFor(() =>
        expect(canvasElement.querySelector('img[src^="data:"]')).not.toBeNull(),
      );
    });

    await expect(counts.FeedImage?.updates).toHaveLength(1);
    await expect(counts.FeedRow).toBeUndefined();
    await expect(counts.FeedList).toBeUndefined();
  },
};

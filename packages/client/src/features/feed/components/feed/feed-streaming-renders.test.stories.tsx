import type { SessionUpdate } from '@repo/contracts';
import {
  type RenderCount,
  type RenderCounts,
  renderCounter,
} from '@repo/kit/mocks/render-counts';
import { settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { Profiler, useEffect, useState } from 'react';
import { expect, waitFor } from 'storybook/test';
import { recordedAgentMessage } from '../../../../lib/product/feed-message.mocks';
import type { FeedView } from '../../view/feed-view';
import { keepUnchangedItems } from '../../view/keep-unchanged-items';
import { toFeedView } from '../../view/to-feed-view';
import { liveHeaderNow, workingHeader } from '../live-header/live-header.mocks';
import { Feed } from './feed';
import { feedScrollId, scrolledToEnd, settleWait } from './feed-reader.mocks';
import { longSnapshot, longTail } from './feed.mocks';
import { feedArgs } from './paged-feed.mocks';

const meta = {
  title: 'Tests/Feed/StreamingRenders',
  component: Feed,
  parameters: { screenPreview: true },
  args: feedArgs,
} satisfies Meta<typeof Feed>;

export default meta;

type Story = StoryObj<typeof meta>;

const lastRow = longTail.at(-1);

if (!lastRow) throw new Error('Recorded catalog needs a Long Feed');

type FeedRowUpdate = RenderCount['updates'][number];

const streamedId = 'streamed-answer';

const chunkWords = (chunks: number): string =>
  Array.from({ length: chunks }, (_unused, index) => `chunk${index}`).join(' ');

const answerAfter = (chunks: number): SessionUpdate => ({
  ...recordedAgentMessage('agent-1', 'edit-and-command'),
  id: streamedId,
  position: lastRow.position + 1,
  revision: longSnapshot.maxRevision + chunks,
  state: 'open',
  content: [{ type: 'text', text: chunkWords(chunks) }],
});

interface Stream {
  send: (() => void) | null;
  view: FeedView | null;
}

const stream: Stream = { send: null, view: null };

// What the Session's Feed store does with each chunk: a new view that keeps the items the chunk did not change.
function viewAfter(chunks: number): FeedView {
  const next = toFeedView([...longTail, answerAfter(chunks)], longSnapshot);
  stream.view = stream.view ? keepUnchangedItems(stream.view, next) : next;

  return stream.view;
}

const renders = renderCounter();

// The Long Feed with one answer that grows by a word each time the story sends a chunk.
function StreamingFeed(): React.JSX.Element {
  const [chunks, setChunks] = useState(1);
  useEffect(() => {
    stream.send = (): void => setChunks((sent) => sent + 1);

    return (): void => {
      stream.send = null;
      stream.view = null;
    };
  }, []);

  return (
    <Profiler id={renders.id} onRender={renders.onRender}>
      <Feed
        {...feedArgs}
        items={viewAfter(chunks).items}
        liveHeader={workingHeader}
        now={liveHeaderNow}
      />
    </Profiler>
  );
}

const sentChunks = 5;

const showsText = (props: FeedRowUpdate, text: string): boolean =>
  JSON.stringify(props).includes(text);

const isStreamed = (props: FeedRowUpdate): boolean =>
  showsText(props, streamedId);

// The live header's row is built new with the entries, so it draws with each chunk too.
const isLive = (props: FeedRowUpdate): boolean =>
  showsText(props, '"live_header"');

const rowsThatUpdated = (
  counts: RenderCounts,
  matches: (props: FeedRowUpdate) => boolean,
): FeedRowUpdate[] => (counts.FeedRow?.updates ?? []).filter(matches);

export const ChunkDrawsOnlyTheStreamedRowAndLiveHeader: Story = {
  render: () => <StreamingFeed />,
  play: async ({ canvas, canvasElement }) => {
    await settleLayout('wide');
    const scroll = await canvas.findByTestId(feedScrollId);
    await waitFor(() => expect(scrolledToEnd(scroll)).toBe(true), settleWait);
    await waitFor(() => expect(stream.send).not.toBeNull(), settleWait);
    await canvas.findByText(chunkWords(1));

    const counts = await renders.during(canvasElement, async () => {
      for (let chunk = 2; chunk <= sentChunks + 1; chunk += 1) {
        stream.send?.();
        await canvas.findByText(chunkWords(chunk));
      }
    });

    await expect(rowsThatUpdated(counts, isStreamed)).toHaveLength(sentChunks);
    await expect(
      rowsThatUpdated(counts, (props) => !isStreamed(props) && !isLive(props)),
    ).toEqual([]);
  },
};

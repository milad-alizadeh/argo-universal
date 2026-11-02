import type { SessionUpdate } from '@repo/contracts';
import { settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { useEffect, useState } from 'react';
import { expect, waitFor } from 'storybook/test';
import {
  recordedAgentMessage,
  recordedUserMessage,
} from '../../../../lib/product/feed-message.mocks';
import { toFeedView } from '../../view/to-feed-view';
import { liveHeaderNow, workingHeader } from '../live-header/live-header.mocks';
import { Feed } from './feed';
import { feedScrollId, scrolledToEnd, settleWait } from './feed-reader.mocks';
import { longSnapshot, longTail } from './feed.mocks';
import { feedArgs } from './paged-feed.mocks';

const meta = {
  title: 'Tests/Feed/StreamingText',
  component: Feed,
  parameters: { screenPreview: true },
  args: feedArgs,
} satisfies Meta<typeof Feed>;

export default meta;

type Story = StoryObj<typeof meta>;

const recording = 'edit-and-command';

const promptText = 'Write three pages about the lighthouse keeper';

const sentence =
  'The rain had been falling on the harbour for eleven days when the keeper admitted that the light had stopped meaning anything. ';

// Paragraphs of mixed length, every other one in italics, so the answer starts paragraphs and closes emphasis as it streams.
const answerText = Array.from({ length: 16 }, (_unused, index) => {
  const mark = index % 2 ? '*' : '';

  return `${mark}${sentence.repeat(2 + (index % 3)).trim()}${mark}`;
}).join('\n\n');

// Few enough chunks that a loaded runner, which spends about 170ms rendering the Feed per chunk, still finishes well inside the test timeout.
const charsPerChunk = 240;

const msBetweenChunks = 24;

const lastRow = longTail.at(-1);

if (!lastRow) throw new Error('Recorded catalog needs a Long Feed');

const sentPrompt: SessionUpdate = {
  ...recordedUserMessage('agent-1', recording),
  id: 'sent-prompt',
  position: lastRow.position + 1,
  revision: longSnapshot.maxRevision + 1,
  content: [{ type: 'text', text: promptText }],
};

const answerSoFar = (length: number): SessionUpdate => ({
  ...recordedAgentMessage('agent-1', recording),
  id: 'streamed-answer',
  position: lastRow.position + 2,
  revision: longSnapshot.maxRevision + 2,
  state: length < answerText.length ? 'open' : 'settled',
  content: [{ type: 'text', text: answerText.slice(0, length) }],
});

// What the story and its Feed share. A mounted Feed fills it in and an unmounted one empties it, so one visit never reads another's.
interface Stream {
  streamed: number;
  send: (() => void) | null;
}

const stream: Stream = { streamed: 0, send: null };

const sentRows = (length: number): SessionUpdate[] =>
  length ? [sentPrompt, answerSoFar(length)] : [];

const nextLength = (length: number): number =>
  Math.min(answerText.length, length + charsPerChunk);

function useStreamedLength(): number {
  const [length, setLength] = useState(0);
  useEffect(() => {
    stream.streamed = 0;
    stream.send = (): void => setLength(1);

    return (): void => {
      stream.send = null;
      stream.streamed = 0;
    };
  }, []);
  useEffect(() => {
    if (!length || length === answerText.length) return;
    const timer = setTimeout(() => setLength(nextLength), msBetweenChunks);

    return (): void => clearTimeout(timer);
  }, [length]);
  useEffect(() => {
    stream.streamed = length;
  }, [length]);

  return length;
}

// The Long Feed, then a prompt and its answer streaming in a few words at a time once the story sends it.
function StreamingFeed(): React.JSX.Element {
  const length = useStreamedLength();
  const rows = [...longTail, ...sentRows(length)];

  return (
    <Feed
      {...feedArgs}
      items={toFeedView(rows, longSnapshot).items}
      liveHeader={length ? workingHeader : null}
      now={liveHeaderNow}
    />
  );
}

// Longest the answer may take to stream in before the story gives up. The steps before it can spend 15s of the 30s test timeout, so this stays inside what is left.
const streamDeadlineMs = 12_000;

// A sent prompt and its answer streaming in below it: the Feed follows the end, so the newest text stays in view above the Composer.
export const FollowsEndWhileAnswerStreams: Story = {
  render: () => <StreamingFeed />,
  play: async ({ canvas }) => {
    await settleLayout('wide');
    const scroll = await canvas.findByTestId(feedScrollId);
    await waitFor(() => expect(scrolledToEnd(scroll)).toBe(true), settleWait);
    // The Feed's mount effect hands over `send`; wait for it rather than assume it ran.
    await waitFor(() => expect(stream.send).not.toBeNull(), settleWait);
    stream.send?.();
    await canvas.findByText(promptText);
    await waitFor(() => expect(stream.streamed).toBe(answerText.length), {
      timeout: streamDeadlineMs,
    });
    await waitFor(() => expect(scrolledToEnd(scroll)).toBe(true), settleWait);
  },
};

const openMessage = (
  id: string,
  offset: number,
  text: string,
): SessionUpdate => ({
  ...recordedAgentMessage('agent-1', recording),
  id,
  position: lastRow.position + offset,
  revision: longSnapshot.maxRevision + offset,
  state: 'open',
  content: [{ type: 'text', text }],
});

// Every message of a running Turn stays open until the Turn ends; the Agent writes only into the newest.
export const OneCaretAcrossOpenMessages: Story = {
  args: {
    items: toFeedView(
      [
        ...longTail,
        openMessage('finished-answer', 1, 'Goal set'),
        openMessage('streaming-answer', 2, 'Starting on the rest'),
      ],
      longSnapshot,
    ).items,
    liveHeader: workingHeader,
    now: liveHeaderNow,
  },
  play: async ({ canvas }) => {
    await settleLayout('wide');
    await expect(await canvas.findByText('Starting on the rest')).toBeVisible();
    await expect(canvas.getAllByTestId('streaming-caret')).toHaveLength(1);
  },
};

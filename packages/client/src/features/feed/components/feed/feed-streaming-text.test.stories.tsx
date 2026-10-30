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
import {
  feedScrollId,
  scrolledToEnd,
  settledTopOf,
  settleWait,
} from './feed-reader.mocks';
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

const promptText = 'Write three pages about the lighthouse keeper';

const sentence =
  'The rain had been falling on the harbour for eleven days when the keeper admitted that the light had stopped meaning anything. ';

// Paragraphs of mixed length, every other one in italics, so the answer starts paragraphs and closes emphasis as it streams.
const answerText = Array.from({ length: 16 }, (_unused, index) => {
  const mark = index % 2 ? '*' : '';

  return `${mark}${sentence.repeat(2 + (index % 3)).trim()}${mark}`;
}).join('\n\n');

const charsPerChunk = 48;

const msBetweenChunks = 24;

const lastRow = longTail.at(-1);

if (!lastRow) throw new Error('Recorded catalog needs a Long Feed');

const sentPrompt: SessionUpdate = {
  ...recordedUserMessage('agent-1', 'edit-and-command'),
  id: 'sent-prompt',
  position: lastRow.position + 1,
  revision: longSnapshot.maxRevision + 1,
  content: [{ type: 'text', text: promptText }],
};

const answerSoFar = (length: number): SessionUpdate => ({
  ...recordedAgentMessage('agent-1', 'edit-and-command'),
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

const topInView = (row: HTMLElement, scroll: HTMLElement): number =>
  row.getBoundingClientRect().top - scroll.getBoundingClientRect().top;

// Longest the answer may take to stream in before the story gives up. It streams in about 3s, and the steps before it can spend 15s of the 30s test timeout, so this stays well inside what is left.
const streamDeadlineMs = 8000;

// Reads the prompt's place in the view on every frame until the answer has streamed in full. The deadline is a timer, so it still fires when frames stop, and the failure says how far the stream and the frames had got.
function promptTopsWhileStreaming(
  prompt: HTMLElement,
  scroll: HTMLElement,
): Promise<number[]> {
  return new Promise((resolve, reject) => {
    const tops: number[] = [];
    let done = false;

    const deadline = setTimeout(() => {
      done = true;
      reject(
        new Error(
          `Answer streamed ${stream.streamed} of ${answerText.length} characters in ${streamDeadlineMs}ms; ${tops.length} frames were read`,
        ),
      );
    }, streamDeadlineMs);

    const step = (): void => {
      if (done) return;
      tops.push(topInView(prompt, scroll));

      if (stream.streamed < answerText.length) {
        requestAnimationFrame(step);
      } else {
        done = true;
        clearTimeout(deadline);
        resolve(tops);
      }
    };

    requestAnimationFrame(step);
  });
}

// The top of the view, clear of the header's fade.
const nearTop = 120;

// A sent prompt rises to the top of the view, then holds still to the pixel while its answer streams in below, past the end of the view.
export const PinsPromptWhileAnswerStreams: Story = {
  render: () => <StreamingFeed />,
  play: async ({ canvas }) => {
    await settleLayout('wide');
    const scroll = await canvas.findByTestId(feedScrollId);
    await waitFor(() => expect(scrolledToEnd(scroll)).toBe(true), settleWait);
    // The Feed's mount effect hands over `send`; wait for it rather than assume it ran.
    await waitFor(() => expect(stream.send).not.toBeNull(), settleWait);
    stream.send?.();
    const prompt = await canvas.findByText(promptText);
    await waitFor(
      () => expect(topInView(prompt, scroll)).toBeLessThan(nearTop),
      settleWait,
    );
    await settledTopOf(() => prompt);
    const tops = await promptTopsWhileStreaming(prompt, scroll);
    await expect(Math.max(...tops) - Math.min(...tops)).toBeLessThan(1);
    // The answer ran on below the view, where the Feed did not follow it.
    await expect(scrolledToEnd(scroll)).toBe(false);
  },
};

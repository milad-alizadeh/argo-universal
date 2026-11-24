import { Button } from '@repo/kit/primitives/actions/button';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { expect, fn, userEvent } from 'storybook/test';
import {
  recordedAgentMessage,
  recordedUserMessage,
} from '../../../../lib/product/feed-message.mocks';
import type { FeedEntry } from './feed-entry';
import type { FeedRowData } from './feed-row-data';
import { useFeedRowData } from './use-feed-row-data';

const drawn = fn<(rows: FeedRowData[]) => void>();

const recording = 'edit-and-command';

type RowEntry = Extract<FeedEntry, { type: 'row' }>;

const asEntry = (row: RowEntry['row']): RowEntry => ({ type: 'row', row });

const prompt = asEntry(recordedUserMessage('agent-1', recording));

const answer = recordedAgentMessage('agent-1', recording);

const openAnswer = (words: number): FeedEntry =>
  asEntry({
    ...answer,
    state: 'open',
    content: [{ type: 'text', text: 'word '.repeat(words) }],
  });

function Probe({ entries }: { entries: FeedEntry[] }): null {
  const rows = useFeedRowData(entries);
  drawn(rows);

  return null;
}

// The Feed's entries as the Feed builds them for each chunk: the rows before it are the same objects, the streamed one is new.
function Harness(): React.JSX.Element {
  const [words, setWords] = useState(1);

  return (
    <>
      <Probe entries={[prompt, openAnswer(words)]} />
      <Button label="Chunk" onPress={() => setWords((sent) => sent + 1)} />
    </>
  );
}

const meta = {
  title: 'Tests/Feed/UseFeedRowData',
  component: Harness,
  tags: ['!autodocs'],
  beforeEach: (): void => {
    drawn.mockClear();
  },
} satisfies Meta<typeof Harness>;

export default meta;

type Story = StoryObj<typeof meta>;

// A chunk draws the hook's caller once, and the rows the chunk did not change are the ones the last draw held.
export const ChunkUpdatesRowsInPlace: Story = {
  play: async ({ canvas }) => {
    const chunk = await canvas.findByRole('button', { name: 'Chunk' });
    const before = drawn.mock.calls.length;
    const heldRows = drawn.mock.lastCall?.[0];
    await userEvent.click(chunk);

    await expect(drawn.mock.calls.length - before).toBe(1);

    const rows = drawn.mock.lastCall?.[0];
    await expect(rows?.[0]).toBe(heldRows?.[0]);
    await expect(rows?.[1]).not.toBe(heldRows?.[1]);
  },
};

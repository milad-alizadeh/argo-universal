import { settleLayout } from '@repo/kit/mocks/story-layout';
import { Button } from '@repo/kit/primitives/actions/button';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { useState } from 'react';
import { expect, waitFor } from 'storybook/test';
import type { FeedGroup, FeedToolCall } from '../../view/feed-view';
import { commandTitle } from '../command-row/command-row-play.mocks';
import { completedCommand } from '../tool-call.mocks';
import { expandedAttribute, openRow } from './feed-reader.mocks';
import { FeedRow } from './feed-row';

const meta = { title: 'Tests/Feed/Recycling' } satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const sameEntryLabel = 'Refresh entry';

const nextEntryLabel = 'Show another entry';

const noop = (): void => {};

const imageUrl = (): string => '';

const groupTitle = 'Ran 1 command';

function groupEntry(call: FeedToolCall): FeedGroup {
  return {
    type: 'group',
    id: call.row.id,
    title: groupTitle,
    state: 'settled',
    items: [call],
  };
}

// A recycled cell draws a fresh entry with the same component instance.
function ReusedRow({
  grouped = false,
}: {
  grouped?: boolean;
}): React.JSX.Element {
  const [id, setId] = useState(completedCommand.id);
  const [revision, setRevision] = useState(completedCommand.revision);

  const call: FeedToolCall = {
    type: 'tool_call',
    row: { ...completedCommand, id, revision },
  };

  return (
    <>
      <Button
        label={sameEntryLabel}
        onPress={() => setRevision(revision + 1)}
      />
      <Button label={nextEntryLabel} onPress={() => setId('next-command')} />
      <FeedRow
        entry={grouped ? groupEntry(call) : call}
        spaceBelow=""
        streaming={false}
        imageUrl={imageUrl}
        onMotionChange={noop}
        onGrow={noop}
      />
    </>
  );
}

export const DisclosureFollowsEntry: Story = {
  render: () => <ReusedRow />,
  play: async ({ canvas }) => {
    await settleLayout('wide');

    const disclosure = (): HTMLElement =>
      canvas.getByRole('button', { name: commandTitle });

    await openRow(disclosure());
    canvas.getByRole('button', { name: sameEntryLabel }).click();
    await waitFor(() =>
      expect(disclosure()).toHaveAttribute(expandedAttribute, 'true'),
    );
    canvas.getByRole('button', { name: nextEntryLabel }).click();
    await waitFor(() =>
      expect(disclosure()).toHaveAttribute(expandedAttribute, 'false'),
    );
  },
};

export const ReusesGroupHeader: Story = {
  render: () => <ReusedRow grouped />,
  play: async ({ canvas }) => {
    await settleLayout('wide');

    const header = canvas.getByRole('button', { name: groupTitle });

    await openRow(header);
    canvas.getByRole('button', { name: sameEntryLabel }).click();
    await expect(header).toHaveAttribute(expandedAttribute, 'true');
    canvas.getByRole('button', { name: nextEntryLabel }).click();
    await waitFor(() =>
      expect(header).toHaveAttribute(expandedAttribute, 'false'),
    );
    await expect(canvas.getByRole('button', { name: groupTitle })).toBe(header);
  },
};

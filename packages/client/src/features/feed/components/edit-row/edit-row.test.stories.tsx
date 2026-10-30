import { layoutWidths, settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { expect, within } from 'storybook/test';
import { recordedEdit } from '../../../../../mocks/feed-edit-mock';
import { EditRow } from './edit-row';
import { editRow, type RecordedEdit } from './edit-row-play.mocks';
import { EditRowPreview } from './edit-row-preview.mocks';

const meta = {
  title: 'Tests/Feed/EditRow',
  component: EditRow,
  globals: { mode: 'light' },
  parameters: { screenPreview: true },
  render: ({ row }): React.JSX.Element => (
    <EditRowPreview key={row.id} row={row} />
  ),
  args: { row: recordedEdit('agent-1') },
} satisfies Meta<typeof EditRow>;

export default meta;

type Story = StoryObj<typeof meta>;

const smallEdit: RecordedEdit = {
  row: recordedEdit('agent-1'),
  name: 'Edited hello.txt, plus 1, minus 1',
  added: '+1',
  removed: '−1',
  line: 'hello Argo',
  summary: false,
};

export const SmallEditPhone = editRow(layoutWidths.phone, smallEdit);

export const SmallEditWide = editRow(layoutWidths.wide, smallEdit);

const smallPatch: RecordedEdit = {
  row: recordedEdit('agent-2'),
  name: 'Edited app.txt, plus 1, minus 1',
  added: '+1',
  removed: '−1',
  line: 'gamma',
  summary: true,
};

export const SmallPatchPhone = editRow(layoutWidths.phone, smallPatch);

export const SmallPatchWide = editRow(layoutWidths.wide, smallPatch);

const newFile: RecordedEdit = {
  row: recordedEdit('agent-1', 'edit-and-command', 'add'),
  name: 'Added notes.md, plus 4',
  added: '+4',
  removed: null,
  line: '# Todo',
  summary: false,
};

export const NewFilePhone = editRow(layoutWidths.phone, newFile);

export const NewFileWide = editRow(layoutWidths.wide, newFile);

const newFileFromPatch: RecordedEdit = {
  row: recordedEdit('agent-2', 'edit-and-command', 'add'),
  name: 'Added notes.md, plus 1',
  added: '+1',
  removed: null,
  line: 'hello',
  summary: true,
};

export const NewFileFromPatchPhone = editRow(
  layoutWidths.phone,
  newFileFromPatch,
);

export const NewFileFromPatchWide = editRow(
  layoutWidths.wide,
  newFileFromPatch,
);

export const FailedEdit: Story = {
  args: { row: recordedEdit('agent-2', 'edit-failure') },
  play: async ({ canvas }) => {
    if (process.env.NODE_ENV !== 'test') return;

    for (const width of [layoutWidths.phone, layoutWidths.wide]) {
      await settleLayout(width);
      const feed = within(canvas.getByTestId('edit-feed'));
      await expect(feed.getByText("Couldn't edit")).toBeVisible();
      await expect(feed.getByText('file.txt')).toBeVisible();
      await expect(feed.queryByTestId('diff-view')).toBeNull();
      await expect(feed.queryByText('+1')).toBeNull();
      await expect(feed.queryByText('−1')).toBeNull();
    }
  },
};

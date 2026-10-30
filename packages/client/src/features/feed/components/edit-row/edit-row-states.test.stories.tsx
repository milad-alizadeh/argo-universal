import { layoutWidths } from '@repo/kit/mocks/story-layout';
import type { Meta } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { recordedEdit } from '../../../../../mocks/feed-edit-mock';
import { EditRow } from './edit-row';
import { editRow, type RecordedEdit } from './edit-row-play.mocks';
import { EditRowPreview } from './edit-row-preview.mocks';

const meta = {
  title: 'Tests/Feed/EditRow/States',
  component: EditRow,
  globals: { mode: 'light' },
  parameters: { screenPreview: true },
  render: ({ row }): React.JSX.Element => (
    <EditRowPreview key={row.id} row={row} />
  ),
  args: { row: recordedEdit('agent-1') },
} satisfies Meta<typeof EditRow>;

export default meta;

const deletedFile: RecordedEdit = {
  row: recordedEdit('agent-2', 'edit-states', 'delete'),
  name: 'Deleted legacy.txt, minus 3',
  added: null,
  removed: '−3',
  line: 'first legacy line',
  summary: true,
};

export const DeletedFilePhone = editRow(layoutWidths.phone, deletedFile);

export const DeletedFileWide = editRow(layoutWidths.wide, deletedFile);

const largeDiff: RecordedEdit = {
  row: recordedEdit('agent-2', 'edit-states'),
  name: 'Edited large.txt, plus 60, minus 60',
  added: '+60',
  removed: '−60',
  line: 'old value 1',
  summary: true,
};

export const LargeDiffPhone = editRow(layoutWidths.phone, largeDiff);

export const LargeDiffWide = editRow(layoutWidths.wide, largeDiff);

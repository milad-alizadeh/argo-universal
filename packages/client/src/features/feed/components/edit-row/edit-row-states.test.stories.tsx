import { layoutWidths } from '@repo/kit/each-layout';
import type { Meta } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { recordedEdit } from '../../../../../mocks/feed-edit-mock';
import { EditRow } from './edit-row';
import { editRow, type RecordedEdit } from './edit-row-play.mocks';
import { EditRowPreview } from './edit-row-preview.mocks';

const meta = {
  title: 'Tests/EditRow',
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
  path: '/repo/legacy.txt',
  verb: 'Deleted',
  added: null,
  removed: '−3',
  line: 'first legacy line',
  summary: true,
};

export const DeletedFilePhone = editRow(layoutWidths.phone, deletedFile);

export const DeletedFileWide = editRow(layoutWidths.wide, deletedFile);

const largeDiff: RecordedEdit = {
  row: recordedEdit('agent-2', 'edit-states'),
  path: '/repo/large.txt',
  verb: 'Edited',
  added: '+60',
  removed: '−60',
  line: 'old value 1',
  summary: true,
};

export const LargeDiffPhone = editRow(layoutWidths.phone, largeDiff);

export const LargeDiffWide = editRow(layoutWidths.wide, largeDiff);

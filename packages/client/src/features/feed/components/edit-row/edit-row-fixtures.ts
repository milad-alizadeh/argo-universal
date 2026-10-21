import { recordedEdit } from '../../../../../mocks/feed-edit-mock';
import type { EditRowProps } from './edit-row';

export const singleFileEdit = {
  row: recordedEdit('agent-1'),
} satisfies EditRowProps;

export const multiFileEdit = {
  row: recordedEdit('agent-2'),
} satisfies EditRowProps;

export const failedEdit = {
  row: recordedEdit('agent-2', 'edit-failure'),
} satisfies EditRowProps;

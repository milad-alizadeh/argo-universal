import type { CommandAction, ToolCallUpdate } from '@repo/contracts';
import { commandRow, workMocks } from '../../../../mocks/feed-view.mocks';

const [mock] = workMocks;

if (!mock) throw new Error('Recording needs work');

export const base = commandRow(mock.rows);

export const call = (changes: Partial<ToolCallUpdate>): ToolCallUpdate => ({
  ...base,
  _meta: undefined,
  locations: undefined,
  content: [],
  ...changes,
});

export const withActions = (actions: CommandAction[]): ToolCallUpdate =>
  call({ _meta: { argo: { commandActions: actions } } });

export const fromLocation = 'from-location.ts';

export const read = (path?: string): CommandAction => ({
  type: 'read',
  command: 'opaque',
  ...(path && { path }),
});

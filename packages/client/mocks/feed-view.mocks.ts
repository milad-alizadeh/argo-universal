import type {
  CommandAction,
  SessionUpdate,
  ToolCallUpdate,
} from '@repo/contracts';
import { recordedFeedMocks } from '@repo/mocks/app';
export const firstReadId = 'first-read';

export const workMocks = recordedFeedMocks.filter(
  (mock) => mock.recording === 'edit-and-command',
);

export const recordedItemTypes: Record<string, string[]> = {
  'agent-1/edit-and-command': ['row', 'group', 'row'],
  'agent-2/edit-and-command': ['row', 'row', 'group', 'row'],
  'agent-1/interrupt': ['row', 'tool_call'],
  'agent-2/interrupt': ['row', 'row', 'tool_call'],
  'agent-1/compaction': ['row', 'row'],
  'agent-2/compaction': ['row', 'row', 'row'],
  'agent-1/image-prompt': ['row', 'thought', 'row'],
  'agent-2/image-prompt': ['row', 'row'],
  'agent-1/markdown-answer': ['row', 'thought', 'row'],
  'agent-2/markdown-answer': ['row', 'thought', 'row'],
  'agent-2/command-outcomes': ['row', 'row', 'group', 'row'],
  'agent-2/edit-states': ['row', 'row', 'group', 'row'],
  'agent-2/edit-failure': ['row', 'row', 'tool_call', 'row'],
};

export function toolCalls(rows: SessionUpdate[]): ToolCallUpdate[] {
  return rows.filter((row) => row.sessionUpdate === 'tool_call_update');
}

export function commandRow(rows: SessionUpdate[]): ToolCallUpdate {
  const row = toolCalls(rows).find(
    (row) => row.kind === 'execute' && !hasReadAction(row),
  );
  if (!row) throw new Error('Recording needs a command');
  return row;
}

function hasReadAction(row: ToolCallUpdate): boolean {
  const actions = suppliedActions(row);
  return Boolean(actions?.some((action) => action.type === 'read'));
}

function suppliedActions(row: ToolCallUpdate): CommandAction[] | undefined {
  return row._meta?.argo?.commandActions;
}

export function readRow(rows: SessionUpdate[]): ToolCallUpdate {
  const row = toolCalls(rows).find(isRead);
  if (!row) throw new Error('Recording needs a read');
  return row;
}

function isRead(row: ToolCallUpdate): boolean {
  return row.kind === 'read' || hasReadAction(row);
}

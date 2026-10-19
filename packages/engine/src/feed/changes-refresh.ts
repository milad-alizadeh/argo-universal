import type { SessionUpdate } from '@repo/contracts';
import { acpToolCallRowId } from './acp/tools';
import type {
  FeedContext,
  FeedEvent,
  FeedInternalEvent,
} from './feed-machine-types';

type AcpUpdate = Extract<FeedEvent, { type: 'feed.acpUpdate' }>;

const isEdit = (row: SessionUpdate): boolean =>
  row.sessionUpdate === 'tool_call_update' && row.kind === 'edit';

const isSettledEditRow = (row: SessionUpdate | undefined): boolean =>
  row !== undefined && isEdit(row) && row.state === 'settled';

const settledEdit = (
  event: AcpUpdate,
  rows: FeedContext['rows'] | undefined,
): boolean => {
  const update = event.update;

  if (update.sessionUpdate !== 'tool_call_update') return false;

  return isSettledEditRow(
    rows?.[acpToolCallRowId(event.acpSessionId, update.toolCallId)],
  );
};

export const settledEditRefresh = (
  event: AcpUpdate,
  rows: FeedContext['rows'] | undefined,
): FeedInternalEvent[] =>
  settledEdit(event, rows) ? [{ type: 'feed.refreshChanges' }] : [];

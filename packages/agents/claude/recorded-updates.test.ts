import { expect, it } from 'vitest';
import type { FeedUpdate } from '../src/agent-events';
import type { VendorMessage } from './messages';
import { mapAll, feedChanges, foldRows } from './mocks/mapping';
import { compaction } from './mocks/sdk-compaction';
import { interrupted } from './mocks/sdk-interrupt';
import { edits } from './mocks/sdk-tools';
const vendorSessionId = '6d8abfff-ea69-4c66-b642-d445f9060d16';
it('reconciles the recorded compacting status and boundary into one Compaction row', (): void => {
  const changes = feedChanges(mapAll(compaction).events);
  const compactions = changes.flatMap(
    (change): Extract<FeedUpdate, { sessionUpdate: 'compaction_update' }>[] =>
      change.type === 'upsert' &&
      change.update.sessionUpdate === 'compaction_update'
        ? [change.update]
        : [],
  );
  expect(compactions).toEqual([
    {
      id: vendorSessionId,
      compactionId: vendorSessionId,
      sessionUpdate: 'compaction_update',
      state: 'open',
      status: 'in_progress',
    },
    {
      id: vendorSessionId,
      compactionId: vendorSessionId,
      sessionUpdate: 'compaction_update',
      state: 'settled',
      status: 'completed',
    },
  ]);
});
it('keeps the Agent’s Bash description and timestamps without inventing command actions', (): void => {
  const rows = foldRows(feedChanges(mapAll(edits).events));
  const command = rows.find(
    (row): boolean =>
      row.sessionUpdate === 'tool_call_update' && row.kind === 'execute',
  );
  expect(command).toMatchObject({
    title: 'Show hello.txt and short git status',
    _meta: { argo: { startedAt: 1791165776295, endedAt: 1791165776582 } },
  });
  expect(requireToolCall(command)._meta?.argo).not.toHaveProperty(
    'commandActions',
  );
});
it('uses the transport receipt time when an interrupted Tool call has no final result', (): void => {
  const messages = interrupted
    .filter(
      (message): message is Exclude<VendorMessage, { type: 'user' }> =>
        message.type !== 'user',
    )
    .map(
      (
        message,
      ):
        | Exclude<VendorMessage, { type: 'user' | 'result' }>
        | (Extract<VendorMessage, { type: 'result' }> & {
            receivedAt: number;
          }) =>
        message.type === 'result'
          ? { ...message, receivedAt: 1791165784000 }
          : message,
    );
  const rows = foldRows(feedChanges(mapAll(messages).events));
  expect(rows).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        sessionUpdate: 'tool_call_update',
        status: 'cancelled',
        _meta: { argo: expect.objectContaining({ endedAt: 1791165784000 }) },
      }),
    ]),
  );
});
function requireToolCall(
  row: FeedUpdate | undefined,
): Extract<FeedUpdate, { sessionUpdate: 'tool_call_update' }> {
  if (!row) throw new Error('Missing recorded command');
  if (row.sessionUpdate !== 'tool_call_update')
    throw new Error('Missing recorded command');
  return row;
}

import type { FeedUpdate } from '@repo/contracts';
import { capToolOutput } from './acp/tool-output';
import type { FeedEvent } from './feed-machine-types';

type Tool = Extract<FeedUpdate, { sessionUpdate: 'tool_call_update' }>;

export function toolCallEvent(row: Tool, turnId: string | null): FeedEvent {
  const capped = capToolOutput(row, {
    sessionUpdate: 'tool_call_update',
    toolCallId: row.toolCallId,
    rawOutput: row.rawOutput,
  });

  return {
    type: 'feed.change',
    turnId,
    blobs: capped.blobs,
    change: { type: 'upsert', update: capped.row },
  };
}

import type { FeedChange } from '@repo/contracts';
import type { GraphEventFromLogic } from '@repo/vitest/model-graph';
import type { SnapshotFrom } from 'xstate';
import {
  feedMachine,
  turnEndingEvent,
  permissionsCancelledEvent,
  permissionSelectedEvent,
  messageRejectedEvent,
} from '../src/feed';

export const acpUpdateEventType = 'feed.acpUpdate';

const modelAcpSessionId = 'model-session';

const firstMessageRowId = 'message-1#0';

const modelToolCallId = 'model-tool';

/*
 * Symbolic graph traversal proves transition coverage only. Engine integration
 * tests exercise the actual stream timing, Writer, SQLite, and shutdown effects.
 */
export const machine = feedMachine;

export type FeedSnapshot = SnapshotFrom<typeof machine>;

export const modelInput = {
  now: (): number => 1000,
  createId: (): string => 'model-id',
  sessionId: 'session-1',
  epoch: 2,
  maxRevision: 0,
  nextPosition: 0,
  findWrittenRow: (): undefined => undefined,
};

interface FeedChangeEvent {
  readonly type: 'feed.change';
  readonly change: FeedChange;
  readonly turnId: 'turn-1';
}

const change = (feedChange: FeedChange): FeedChangeEvent =>
  ({ type: 'feed.change', change: feedChange, turnId: 'turn-1' }) as const;

const openMessage = change({
  type: 'upsert',
  update: {
    id: firstMessageRowId,
    state: 'open',
    sessionUpdate: 'agent_message',
    messageId: 'message-1',
    content: [{ type: 'text', text: '' }],
  },
});

const appendText = change({
  type: 'append',
  id: firstMessageRowId,
  field: 'content.0.text',
  text: 'a',
});

const settleMessage = change({
  type: 'patch',
  id: firstMessageRowId,
  set: { state: 'settled' },
});

export const streamBatchDelayEvent =
  'xstate.after.streamBatchDelay.feed.active.stream.batching';

export const storeDelayEvent =
  'xstate.after.storeDelay.feed.active.store.dirty';

// Done events of states are left out: the model would send them before the regions are done.
export const events = [
  openMessage,
  appendText,
  settleMessage,
  {
    type: acpUpdateEventType,
    acpSessionId: modelAcpSessionId,
    turnId: 'turn-1',
    update: {
      sessionUpdate: 'agent_message_chunk',
      messageId: 'model-message',
      content: { type: 'text', text: 'model text' },
    },
  },
  {
    type: acpUpdateEventType,
    acpSessionId: modelAcpSessionId,
    turnId: 'turn-1',
    update: {
      sessionUpdate: 'tool_call_update',
      toolCallId: modelToolCallId,
      status: 'completed',
    },
  },
  {
    type: acpUpdateEventType,
    acpSessionId: modelAcpSessionId,
    turnId: 'turn-1',
    update: {
      sessionUpdate: 'notice',
      severity: 'info',
      title: 'Model notice',
    },
  },
  {
    type: acpUpdateEventType,
    acpSessionId: modelAcpSessionId,
    turnId: 'turn-1',
    update: {
      sessionUpdate: 'compaction_update',
      compactionId: 'model-compaction',
      status: 'completed',
    },
  },
  {
    type: acpUpdateEventType,
    acpSessionId: modelAcpSessionId,
    turnId: 'turn-1',
    update: { sessionUpdate: 'plan_removed', planId: 'unknown-plan' },
  },
  { type: 'feed.completeTurn', turnId: 'turn-1' },
  {
    type: turnEndingEvent,
    turnId: 'turn-1',
    ending: { kind: 'interruption' },
  },
  {
    type: permissionsCancelledEvent,
    turnId: 'turn-1',
    acpSessionId: modelAcpSessionId,
    toolCallIds: [modelToolCallId],
  },
  {
    type: permissionSelectedEvent,
    turnId: 'turn-1',
    acpSessionId: modelAcpSessionId,
    toolCallId: modelToolCallId,
    option: { optionId: 'allow', name: 'Allow', kind: 'allow_once' },
  },
  {
    type: messageRejectedEvent,
    turnId: 'turn-1',
    reason: 'model reason',
  },
  { type: 'feed.flush' },
  { type: streamBatchDelayEvent },
  { type: storeDelayEvent },
] satisfies GraphEventFromLogic<typeof machine>[];

export type FeedMachineEvent = (typeof events)[number];

import type {
  AnyMessage,
  SessionNotification,
  StateUpdate,
} from '@agentclientprotocol/sdk';
import { z } from 'zod';

/*
 * codex-acp 2.3.0 sends the first draft of the ACP subagents RFD, `subagent_spawned` and
 * `subagent_state_update`, to every client that advertises `subagents`. The SDK schema Argo reads
 * names the same two events `subagent_update`, so they are rewritten here before dispatch.
 * https://github.com/agentclientprotocol/codex-acp/blob/main/docs/subagent-sessions.md
 */
const Spawned = z.object({
  sessionUpdate: z.literal('subagent_spawned'),
  subagentSessionId: z.string(),
  name: z.string().optional(),
  task: z.string().optional(),
});

const StateUpdated = z.object({
  sessionUpdate: z.literal('subagent_state_update'),
  subagentSessionId: z.string(),
  state: z.string(),
});

const DraftNotification = z.object({
  jsonrpc: z.literal('2.0'),
  method: z.literal('session/update'),
  params: z.object({
    sessionId: z.string(),
    update: z.union([Spawned, StateUpdated]),
  }),
});

type Update = SessionNotification['update'];

export type DraftSubagentUpdate =
  | z.infer<typeof Spawned>
  | z.infer<typeof StateUpdated>;

// codex-acp names the task like this when the spawn gave it none.
const placeholderTask = 'Delegated task for ';

const notification = (sessionId: string, update: Update): AnyMessage => ({
  jsonrpc: '2.0',
  method: 'session/update',
  params: { sessionId, update },
});

const hasTask = (task: string | undefined): task is string =>
  task !== undefined && task.trim() !== '' && !task.startsWith(placeholderTask);

function spawnedUpdate(update: z.infer<typeof Spawned>): Update {
  const running: Update = {
    sessionUpdate: 'subagent_update',
    sessionId: update.subagentSessionId,
    capabilities: {},
    state: { state: 'running' },
  };

  if (update.name) running.title = update.name;

  return running;
}

// The task is the parent's first message to the child, which Argo folds into the Subagent's Started row.
function taskUpdate(
  parentId: string,
  update: z.infer<typeof Spawned>,
): Update[] {
  if (!hasTask(update.task)) return [];

  return [
    {
      sessionUpdate: 'session_message',
      messageId: `${update.subagentSessionId}:task`,
      senderSessionId: parentId,
      recipientSessionId: update.subagentSessionId,
      content: [{ type: 'text', text: update.task }],
    },
  ];
}

// Every codex-acp outcome ends the child's work; only the two with a known cause name a stop reason.
function idleState(outcome: string): StateUpdate {
  if (outcome === 'completed') return { state: 'idle', stopReason: 'end_turn' };

  if (outcome === 'cancelled')
    return { state: 'idle', stopReason: 'cancelled' };

  return { state: 'idle' };
}

function updatesOf(parentId: string, draft: DraftSubagentUpdate): Update[] {
  if (draft.sessionUpdate === 'subagent_spawned')
    return [spawnedUpdate(draft), ...taskUpdate(parentId, draft)];

  return [
    {
      sessionUpdate: 'subagent_update',
      sessionId: draft.subagentSessionId,
      state: idleState(draft.state),
    },
  ];
}

export function standardSubagentUpdates(message: AnyMessage): AnyMessage[] {
  const parsed = DraftNotification.safeParse(message);

  if (!parsed.success) return [message];
  const { sessionId, update } = parsed.data.params;

  return updatesOf(sessionId, update).map((next) =>
    notification(sessionId, next),
  );
}

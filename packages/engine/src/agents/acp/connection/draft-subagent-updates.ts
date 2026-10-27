import type {
  AnyMessage,
  SessionNotification,
  StateUpdate,
} from '@agentclientprotocol/sdk';
import { z } from 'zod';
import type { RejectionReporter } from './schema-reader';

/*
 * ADR-0016's recorded exception: codex-acp 2.3.0 and claude-agent-acp 0.97.0 send the draft
 * `subagent_spawned` and `subagent_state_update` to clients that advertise `subagents` (claude-agent-acp
 * only to JetBrains AIR clients). They become the standard `subagent_update` before the SDK reads them.
 * Delete this once the Agents Argo supports send the standard update.
 * https://github.com/agentclientprotocol/codex-acp/blob/main/docs/subagent-sessions.md
 */
const sessionUpdateMethod = 'session/update';

const DraftState = z.enum(['completed', 'cancelled', 'failed', 'disconnected']);

const Spawned = z.object({
  sessionUpdate: z.literal('subagent_spawned'),
  subagentSessionId: z.string().min(1),
  name: z.string().optional(),
  task: z.string().optional(),
  prompt: z.string().optional(),
  capabilities: z.strictObject({}).optional(),
});

const StateUpdated = z.object({
  sessionUpdate: z.literal('subagent_state_update'),
  subagentSessionId: z.string().min(1),
  state: DraftState,
});

const DraftNotification = z.object({
  method: z.literal(sessionUpdateMethod),
  params: z.object({
    sessionId: z.string(),
    update: z.discriminatedUnion('sessionUpdate', [Spawned, StateUpdated]),
  }),
});

const DraftSignature = z.object({
  method: z.literal(sessionUpdateMethod),
  params: z.object({
    update: z.object({
      sessionUpdate: z.enum(['subagent_spawned', 'subagent_state_update']),
    }),
  }),
});

type Update = SessionNotification['update'];

type Spawn = z.infer<typeof Spawned>;

type Ending = z.infer<typeof StateUpdated>;

type FromParent<Draft> = { sessionId: string; update: Draft };

const missingTask = 'Delegated task';

// `failed` ends the work with Argo's `error` stop reason; `disconnected` is not an outcome, so the SDK's `unknown` leaves the child unconfirmed.
const standardStates: Record<z.infer<typeof DraftState>, StateUpdate> = {
  completed: { state: 'idle', stopReason: 'end_turn' },
  cancelled: { state: 'idle', stopReason: 'cancelled' },
  failed: { state: 'idle', stopReason: 'error' },
  disconnected: { state: 'unknown' },
};

// codex-acp and claude-agent-acp name a task `Delegated task` or `Delegated task for <name>` when the spawn gave none.
const isPlaceholder = (task: string): boolean =>
  task === missingTask || task.startsWith(`${missingTask} for `);

// `prompt` is the full task when the Agent sends one; `task` is then only a description.
const delegatedTask = ({ prompt, task }: Spawn): string | undefined =>
  [prompt, task].find(
    (text) => text !== undefined && text.trim() !== '' && !isPlaceholder(text),
  );

const runningUpdate = (spawn: Spawn): Update => ({
  sessionUpdate: 'subagent_update',
  sessionId: spawn.subagentSessionId,
  title: spawn.name,
  capabilities: spawn.capabilities,
  state: { state: 'running' },
});

// The task is the parent's first message to the child, which Argo folds into the child's Started row.
const taskMessage = ({ sessionId, update }: FromParent<Spawn>): Update[] => {
  const text = delegatedTask(update);

  if (text === undefined) return [];

  return [
    {
      sessionUpdate: 'session_message',
      messageId: `${update.subagentSessionId}:task`,
      senderSessionId: sessionId,
      recipientSessionId: update.subagentSessionId,
      content: [{ type: 'text', text }],
    },
  ];
};

const endUpdate = (ending: Ending): Update => ({
  sessionUpdate: 'subagent_update',
  sessionId: ending.subagentSessionId,
  state: standardStates[ending.state],
});

const rewriteDraftUpdate = ({
  sessionId,
  update,
}: FromParent<Spawn | Ending>): Update[] => {
  if (update.sessionUpdate === 'subagent_state_update')
    return [endUpdate(update)];

  return [runningUpdate(update), ...taskMessage({ sessionId, update })];
};

type DraftSubagentTranslator = (message: AnyMessage) => AnyMessage[];

const notification = (sessionId: string, update: Update): AnyMessage => ({
  jsonrpc: '2.0',
  method: sessionUpdateMethod,
  params: { sessionId, update },
});

// A draft that does not match what the Agents send is reported, counted and dropped; every other message passes through.
export const createDraftSubagentTranslator =
  (rejections: RejectionReporter): DraftSubagentTranslator =>
  (message) => {
    if (!DraftSignature.safeParse(message).success) return [message];
    const draft = DraftNotification.safeParse(message);

    if (!draft.success) {
      rejections.report('Rejected draft subagent update', draft.error);

      return [];
    }

    const { sessionId } = draft.data.params;

    return rewriteDraftUpdate(draft.data.params).map((update) =>
      notification(sessionId, update),
    );
  };

import type {
  SessionUpdate,
  SubagentUpdate,
  TextContent,
} from '@repo/contracts';
import type { ScriptedStep } from '@repo/mocks/agent/scripted-scenario';
import { openMemorySubagents, type MemorySubagents } from './memory-subagents';

type AcpUpdate = Extract<ScriptedStep, { type: 'update' }>['update'];

type AcpSessionMessage = Extract<
  AcpUpdate,
  { sessionUpdate: 'session_message' }
>;

export type Participants = Pick<
  AcpSessionMessage,
  'senderSessionId' | 'recipientSessionId'
>;

export const text = (value: string): TextContent => ({
  type: 'text',
  text: value,
});

// An ACP update on a transcript; with no session id it is the parent's own.
export const onTranscript = (
  update: AcpUpdate,
  sessionId?: string,
): ScriptedStep => ({ type: 'update', sessionId, update });

export const associate = (sessionId: string, title?: string): ScriptedStep =>
  onTranscript({ sessionUpdate: 'subagent_update', sessionId, title });

export const sessionMessage = (
  messageId: string,
  fields: Omit<AcpSessionMessage, 'sessionUpdate' | 'messageId'>,
  transcript?: string,
): ScriptedStep =>
  onTranscript(
    { sessionUpdate: 'session_message', messageId, ...fields },
    transcript,
  );

export const sessionMessageChunk = (
  messageId: string,
  content: string,
  transcript?: string,
): ScriptedStep =>
  onTranscript(
    {
      sessionUpdate: 'session_message_chunk',
      messageId,
      content: text(content),
    },
    transcript,
  );

// Routes the steps as a Session whose own ACP id is `acpSessionId`, and waits until every Feed is stored.
export const played = async (
  steps: readonly ScriptedStep[],
  acpSessionId = 'parent',
): Promise<MemorySubagents> => {
  const subagents = openMemorySubagents(acpSessionId);

  subagents.play(steps);
  await subagents.settled();

  return subagents;
};

type SubagentRowFacts = NonNullable<
  NonNullable<SubagentUpdate['_meta']>['argo']
> &
  Pick<SubagentUpdate, 'subagentState'>;

// What the parent Feed says about its Subagents, in Feed order.
export const subagentRowFacts = (
  subagents: MemorySubagents,
): SubagentRowFacts[] =>
  subagents
    .rows()
    .flatMap((row) =>
      row.sessionUpdate === 'subagent_update'
        ? [{ ...row._meta?.argo, subagentState: row.subagentState }]
        : [],
    );

export type MessageFacts = {
  messageId: string;
  content: unknown;
  senderSessionId: string | undefined;
  recipientSessionId: string | undefined;
};

// The Session messages of a Feed, with the Sessions Argo resolved as their participants.
export const messageFacts = (rows: readonly SessionUpdate[]): MessageFacts[] =>
  rows.flatMap((row) =>
    row.sessionUpdate === 'session_message'
      ? [
          {
            messageId: row.messageId,
            content: row.content,
            ...participantFacts(row),
          },
        ]
      : [],
  );

const participantFacts = (
  row: Extract<SessionUpdate, { sessionUpdate: 'session_message' }>,
): Pick<MessageFacts, 'senderSessionId' | 'recipientSessionId'> => ({
  senderSessionId: participant(row)?.senderSessionId,
  recipientSessionId: participant(row)?.recipientSessionId,
});

const participant = (
  row: Extract<SessionUpdate, { sessionUpdate: 'session_message' }>,
): NonNullable<typeof row._meta>['argo'] => row._meta?.argo;

import type {
  SessionNewInput,
  SessionNewOutput,
  SessionPromptInput,
  SessionPromptOutput,
} from '@repo/contracts';
import type {
  readerOperations,
  sessionOperations,
} from '@repo/contracts/operations';
import type {
  AcceptedSessionPrompt,
  NativeStartRequest,
  Sessions,
} from '../sessions';
import {
  startedWork,
  type AcceptedWork,
  type StartedWork,
} from './native-start';
import type { OperationImplementations } from './operations';

type SessionImplementations = Pick<
  OperationImplementations,
  keyof typeof sessionOperations | keyof typeof readerOperations
>;

// Sessions answer their own Operations; a new Session and a Prompt answer with the native work they start.
export const sessionImplementations = (
  sessions: Sessions,
): SessionImplementations => ({
  'session.new': (input, request) => startCreation(sessions, input, request),
  'session.prompt': async (input, request) =>
    startPrompt(sessions, input, request),
  ...sessions.implementations,
});

async function startCreation(
  sessions: Sessions,
  input: SessionNewInput,
  request: NativeStartRequest,
): Promise<StartedWork<SessionNewOutput>> {
  const creation = await sessions.create(input, request);

  return startedWork('creation', creation, ({ sessionId, turnId }) => ({
    result: { sessionId },
    turnId,
  }));
}

function startPrompt(
  sessions: Sessions,
  input: SessionPromptInput,
  request: NativeStartRequest,
): StartedWork<SessionPromptOutput> {
  return startedWork('turn', sessions.prompt(input, request), acceptedPrompt);
}

function acceptedPrompt(
  accepted: AcceptedSessionPrompt,
): AcceptedWork<SessionPromptOutput> {
  if (accepted.messageId === null) return { result: accepted };

  return {
    result: { messageId: accepted.messageId },
    turnId: accepted.turnId,
  };
}

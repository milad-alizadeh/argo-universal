import type {
  SessionNewInput,
  SessionNewOutput,
  SessionPromptInput,
  SessionPromptOutput,
} from '@repo/contracts';
import type { sessionOperations } from '@repo/contracts/operations';
import type {
  AcceptedSessionPrompt,
  NativeStartRequest,
  SessionPorts,
} from '../sessions';
import {
  startedWork,
  type AcceptedWork,
  type NativeStartId,
  type StartedWork,
} from './native-start';
import type { OperationImplementations } from './operations';

type SessionImplementations = Pick<
  OperationImplementations,
  keyof typeof sessionOperations
>;

export const sessionImplementations = ({
  commands,
  starts,
}: SessionPorts): SessionImplementations => ({
  'session.new': (input, request) => startCreation(starts, input, request),
  'session.prompt': async (input, request) =>
    startPrompt(starts, input, request),
  ...commandImplementations(commands),
});

const commandImplementations = (
  commands: SessionPorts['commands'],
): Omit<SessionImplementations, NativeStartId> => ({
  'session.cancel': async (input) => commands.cancel(input.sessionId),
  'session.archive': (input) => commands.archive(input.sessionId),
  'session.unarchive': (input) => commands.unarchive(input.sessionId),
  'session.savePlan': commands.savePlan,
  'session.close': (params) => commands.close(params.sessionId),
  'session.setConfigOption': commands.configure,
  'shell.stop': async (params) => commands.stopShell(params),
  'session.rename': commands.rename,
});

async function startCreation(
  starts: SessionPorts['starts'],
  input: SessionNewInput,
  request: NativeStartRequest,
): Promise<StartedWork<SessionNewOutput>> {
  const creation = await starts.create(input, request);

  return startedWork('creation', creation, ({ sessionId, turnId }) => ({
    result: { sessionId },
    turnId,
  }));
}

function startPrompt(
  starts: SessionPorts['starts'],
  input: SessionPromptInput,
  request: NativeStartRequest,
): StartedWork<SessionPromptOutput> {
  return startedWork('turn', starts.prompt(input, request), acceptedPrompt);
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

import type {
  SessionNewInput,
  SessionNewOutput,
  SessionNewParams,
  SessionPromptInput,
  SessionPromptOutput,
} from '@repo/contracts';
import type {
  readerOperations,
  sessionOperations,
} from '@repo/contracts/operations';
import {
  namedParam,
  type NativeStartRequest,
  type PromptLanding,
  type Sessions,
} from '../sessions';
import {
  startedWork,
  type AcceptedWork,
  type StartedWork,
} from './native-start';
import type { OperationImplementations } from './operations';

type SessionImplementations = Pick<
  OperationImplementations,
  keyof typeof sessionOperations | keyof typeof readerOperations | 'plugin.new'
>;

// Sessions answer their own Operations; a new Session and a Prompt answer with the native work they start.
export const sessionImplementations = (
  sessions: Sessions,
): SessionImplementations => ({
  'session.new': (input, request) =>
    startCreation(sessions, named(input), request),
  'session.prompt': async (input, request) =>
    startPrompt(sessions, input, request),
  ...sessions.implementations,
});

// A Session that runs session.new has its Project and Agent filled by its scope; any other caller names both.
const named = (input: SessionNewParams): Parameters<Sessions['create']>[0] => ({
  ...input,
  projectId: namedParam(
    input.projectId,
    'Pass projectId: the Project the new Session runs in. A Session that runs this starts in its own.',
  ),
  agent: namedParam(
    input.agent,
    'Pass agent: the Agent of the new Session. A Session that runs this starts its own Agent.',
  ),
});

async function startCreation(
  sessions: Sessions,
  input: SessionNewInput & Pick<SessionNewParams, 'followThrough'>,
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

// The work a Prompt is followed by is the Turn that holds it: the one it started, was steered into, or will start.
function acceptedPrompt(
  landing: PromptLanding,
): AcceptedWork<SessionPromptOutput> {
  if (landing.status === 'dropped')
    return { result: { messageId: null, drop: landing.drop } };

  if (landing.status === 'queued') {
    const { messageId, notSteered, queuedId } = landing;

    return {
      result: { status: 'queued', messageId, notSteered },
      turnId: queuedId,
    };
  }

  const { status, messageId, turnId } = landing;

  return { result: { status, messageId }, turnId };
}

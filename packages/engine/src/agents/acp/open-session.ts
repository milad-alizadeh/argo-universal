import type {
  ClientContext,
  InitializeResponse,
  NewSessionResponse,
  ResumeSessionRequest,
  SessionCapabilities,
} from '@agentclientprotocol/sdk';
import type { AcpSessionOpening, AcpSessionLease } from './resource-types';

type OpeningInput = {
  agent: ClientContext;
  initialization: InitializeResponse;
  opening: AcpSessionOpening;
};

type Opened = Pick<AcpSessionLease, 'response' | 'sessionId'>;

export const sessionCapabilities = (
  initialization: InitializeResponse,
): SessionCapabilities | undefined =>
  initialization.agentCapabilities?.sessionCapabilities;

export const openProtocolSession = async (
  input: OpeningInput,
): Promise<Opened> => {
  if (input.opening.method === 'session/new') return newSession(input);

  return openExisting(input);
};

const openExisting = (input: OpeningInput): Promise<Opened> => {
  if (input.opening.method === 'session/resume')
    return resumeSession(input, input.opening.params);
  throw new Error('Expected a known ACP session');
};

const newSession = async ({
  agent,
  opening,
}: OpeningInput): Promise<Opened> => {
  const response = await agent.request<NewSessionResponse>(
    'session/new',
    opening.params,
  );

  return { response, sessionId: response.sessionId };
};

const resumeSession = async (
  { agent, initialization }: OpeningInput,
  params: ResumeSessionRequest,
): Promise<Opened> => {
  const capabilities = sessionCapabilities(initialization);

  if (!capabilities?.resume)
    throw new Error('Agent does not support session/resume');

  return {
    response: await agent.request('session/resume', params),
    sessionId: params.sessionId,
  };
};

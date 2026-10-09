import type {
  ClientContext,
  InitializeResponse,
  LoadSessionRequest,
  ResumeSessionRequest,
  SessionCapabilities,
} from '@agentclientprotocol/sdk';
import type { AcpSessionOpening, AcpSessionLease } from './resource-types';
import type { createAcpResponseReaders } from './response-readers';

type OpeningInput = {
  agent: ClientContext;
  initialization: InitializeResponse;
  opening: AcpSessionOpening;
  readers: ReturnType<typeof createAcpResponseReaders>;
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
  if (input.opening.method === 'session/load')
    return loadSession(input, input.opening.params);
  if (input.opening.method === 'session/resume')
    return resumeSession(input, input.opening.params);
  throw new Error('Expected a known ACP session');
};
const newSession = async ({
  agent,
  opening,
  readers,
}: OpeningInput): Promise<Opened> => {
  const response = readers['session/new'].parse(
    await agent.request<unknown>('session/new', opening.params),
  );
  return { response, sessionId: response.sessionId };
};
const loadSession = async (
  { agent, initialization, readers }: OpeningInput,
  params: LoadSessionRequest,
): Promise<Opened> => {
  if (!initialization.agentCapabilities?.loadSession)
    throw new Error('Agent does not support session/load');
  return {
    response: readers['session/load'].parse(
      await agent.request<unknown>('session/load', params),
    ),
    sessionId: params.sessionId,
  };
};
const resumeSession = async (
  { agent, initialization, readers }: OpeningInput,
  params: ResumeSessionRequest,
): Promise<Opened> => {
  const capabilities = sessionCapabilities(initialization);
  if (!capabilities?.resume)
    throw new Error('Agent does not support session/resume');
  return {
    response: readers['session/resume'].parse(
      await agent.request<unknown>('session/resume', params),
    ),
    sessionId: params.sessionId,
  };
};

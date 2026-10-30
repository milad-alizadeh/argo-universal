import {
  InitialConfigOption,
  SessionConfigOption,
  type SessionAgentOptionsInput,
  type AgentOptionsUpdate,
  type SessionRecord,
} from '@repo/contracts';
import { TRPCError } from '@trpc/server';
import { readSessionRow } from '../session-record';
import type { SessionSources } from '../session-sources';
import { readAgentConfiguration } from './agent-options-read';
import { storageSources } from './agent-options-shared';

type InputSources = Pick<SessionSources, 'database' | 'findWriter'>;

const matchingOwner = (
  session: SessionRecord,
  input: SessionAgentOptionsInput,
): boolean =>
  session.agent === input.agent && session.projectId === input.projectId;

const missingOptionsSession = (): TRPCError =>
  new TRPCError({
    code: 'NOT_FOUND',
    message: 'Session not found for this Agent and Project.',
  });

function requireOptionsSession(
  sources: InputSources,
  input: SessionAgentOptionsInput,
  sessionId: string,
): SessionRecord {
  const session = readSessionRow(storageSources(sources), sessionId);

  if (!session) throw missingOptionsSession();

  if (!matchingOwner(session, input)) throw missingOptionsSession();

  return session;
}

const savedPicks = (
  session: SessionRecord,
): NonNullable<SessionAgentOptionsInput['picks']> =>
  Object.fromEntries(
    [
      ...InitialConfigOption.array().parse(session.configValues),
      ...InitialConfigOption.array().parse(session.heldConfig),
    ].map(({ configId, value }) => [configId, value]),
  );

/*
 * Browsing keeps the Session closed. Discover using its own saved choices, not
 * whichever choices another Session most recently wrote for this Agent.
 */
export function sessionOptionsInput(
  sources: InputSources,
  input: SessionAgentOptionsInput,
): SessionAgentOptionsInput {
  if (!input.sessionId) return input;

  const session = requireOptionsSession(sources, input, input.sessionId);

  return {
    ...input,
    picks: savedPicks(session),
  };
}

export function savedAgentOptions(
  sources: InputSources,
  input: SessionAgentOptionsInput,
): AgentOptionsUpdate {
  const saved = readAgentConfiguration(storageSources(sources), input);

  return {
    agent: input.agent,
    projectId: input.projectId,
    commands: saved?.commands ?? null,
    configOptions: savedOptions(saved, input),
  };
}

function savedOptions(
  saved: ReturnType<typeof readAgentConfiguration>,
  input: SessionAgentOptionsInput,
): AgentOptionsUpdate['configOptions'] {
  return saved
    ? saved.configOptions.map((option) => withPick(option, input))
    : null;
}

function withPick(
  option: SessionConfigOption,
  input: SessionAgentOptionsInput,
): SessionConfigOption {
  const value = input.picks?.[option.configId];

  return typeof value === typeof option.currentValue
    ? SessionConfigOption.parse({ ...option, currentValue: value })
    : option;
}

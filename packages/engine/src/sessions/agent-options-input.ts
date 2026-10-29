import {
  InitialConfigOption,
  SessionConfigOption,
  type SessionAgentOptionsInput,
  type AgentOptionsUpdate,
} from '@repo/contracts';
import { TRPCError } from '@trpc/server';
import type { OptionsDeps } from './agent-options-discovery';
import { readAgentConfiguration } from './agent-options-storage';
import { readSessionRow } from './session-record';

// Saved rows, with the writes still queued over them.
export const storageSources = (
  deps: Pick<OptionsDeps, 'database' | 'findWriter'>,
): {
  database: OptionsDeps['database'];
  writer: ReturnType<OptionsDeps['findWriter']>;
} => ({
  database: deps.database,
  writer: deps.findWriter(),
});

/*
 * Browsing keeps the Session closed. Discover using its own saved choices, not
 * whichever choices another Session most recently wrote for this Agent.
 */
export function sessionOptionsInput(
  deps: OptionsDeps,
  input: SessionAgentOptionsInput,
): SessionAgentOptionsInput {
  if (!input.sessionId) return input;

  const session = readSessionRow(storageSources(deps), input.sessionId);

  if (
    !session ||
    session.agent !== input.agent ||
    session.projectId !== input.projectId
  )
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Session not found for this Agent and Project.',
    });

  return {
    ...input,
    picks: Object.fromEntries(
      [
        ...InitialConfigOption.array().parse(session.configValues),
        ...InitialConfigOption.array().parse(session.heldConfig),
      ].map(({ configId, value }) => [configId, value]),
    ),
  };
}

export function savedAgentOptions(
  deps: OptionsDeps,
  input: SessionAgentOptionsInput,
): AgentOptionsUpdate {
  const saved = readAgentConfiguration(storageSources(deps), input);

  return {
    agent: input.agent,
    projectId: input.projectId,
    commands: saved?.commands ?? null,
    configOptions: saved
      ? saved.configOptions.map((option) => withPick(option, input))
      : null,
  };
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

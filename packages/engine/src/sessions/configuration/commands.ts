import type {
  InitialConfigOption,
  SessionSetConfigOptionOutput,
} from '@repo/contracts';
import { sendSessionCommand } from '../session-command';
import { setConfigEvent } from '../session-context';
import type { SessionActorRef } from '../session-machine';
import { isOfferedConfigChoice, requireOfferedChoice } from './offered';
import type { AgentConfigValue } from './values';

type Options = SessionSetConfigOptionOutput['configOptions'];

// Resolves with the Session's options once the Agent applied the choice, or once a held choice is stored.
export const applySessionConfig = async (
  session: SessionActorRef,
  input: AgentConfigValue,
): Promise<Options> => {
  requireOfferedChoice(session.getSnapshot().context.configOptions, input);

  const applied = Promise.withResolvers<Options>();

  sendSessionCommand(session, {
    type: setConfigEvent,
    configId: input.configId,
    value: input.value,
    applied,
  });

  return applied.promise;
};

// Cached defaults may disappear when the selected model changes, so an optional choice no longer offered is skipped.
const skipsChoice = (
  session: SessionActorRef,
  choice: InitialConfigOption,
): boolean =>
  Boolean(
    choice.optional &&
    !isOfferedConfigChoice(session.getSnapshot().context.configOptions, choice),
  );

async function applyInOrder(
  session: SessionActorRef,
  choices: InitialConfigOption[],
): Promise<void> {
  for (const choice of choices) {
    if (skipsChoice(session, choice)) continue;

    await applySessionConfig(session, choice);
  }
}

// A new Session with an Agent session applies its first choices one at a time, in the order they were chosen.
export async function applyInitialConfiguration(
  session: SessionActorRef,
  choices: InitialConfigOption[],
): Promise<void> {
  if (session.getSnapshot().context.acpLease)
    await applyInOrder(session, choices);
}

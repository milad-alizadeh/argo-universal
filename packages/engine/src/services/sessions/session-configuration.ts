import type {
  SessionSetConfigOptionInput,
  SessionSetConfigOptionOutput,
} from '@repo/contracts';
import type { SessionRouterDeps } from './router-deps';
import { validateConfigChoice } from './session-admission';
import {
  sendSessionCommand,
  validateSessionCommandAdmission,
} from './session-command';
import type { SessionActorRef } from './session-machine';
import { openReadySession } from './session-opening';

export const applySessionConfig = (
  session: SessionActorRef,
  input: SessionSetConfigOptionInput,
): Promise<SessionSetConfigOptionOutput['configOptions']> => {
  validateConfigChoice(session.getSnapshot().context.configOptions, input);
  const applied = session.getSnapshot().context.acpLease
    ? Promise.withResolvers<SessionSetConfigOptionOutput['configOptions']>()
    : undefined;
  sendSessionCommand(session, {
    type: 'session.setConfigOption',
    configId: input.configId,
    value: input.value,
    applied,
  });
  return (
    applied?.promise ??
    Promise.resolve(session.getSnapshot().context.configOptions)
  );
};
export const configureSession = async (
  context: Pick<
    SessionRouterDeps,
    'sessions' | 'readSession' | 'sessionCommandSignal'
  >,
  input: SessionSetConfigOptionInput,
): Promise<SessionSetConfigOptionOutput> => {
  const session = await openReadySession(
    context,
    input.sessionId,
    'session.setConfigOption',
  );
  validateSessionCommandAdmission(context);
  return { configOptions: await applySessionConfig(session, input) };
};

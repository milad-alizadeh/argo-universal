import type {
  SessionSetConfigOptionInput,
  SessionSetConfigOptionOutput,
} from '@repo/contracts';
import type { Bound } from '../lib/bound';
import { asRequestError } from './admission/refused-choice';
import { archiveSession, unarchiveSession } from './archive/archive-commands';
import { applySessionConfig } from './configuration';
import type { SessionRouterDeps } from './router-deps';
import { cancelSession, closeSession } from './session-closure';
import { validateSessionCommandAdmission } from './session-command';
import { openReadySession } from './session-opening';
import { renameSession } from './session-rename';
import { saveSessionPlan } from './session-save-plan';
import { stopShell } from './shells/stop';

type ConfigureDeps = Pick<
  SessionRouterDeps,
  'sessions' | 'readSession' | 'sessionCommandSignal'
>;

// A thin Session handler (ADR-0016 §10): the Session configuration module checks and applies the choice.
async function configureSession(
  deps: ConfigureDeps,
  input: SessionSetConfigOptionInput,
): Promise<SessionSetConfigOptionOutput> {
  const session = await openReadySession(
    deps,
    input.sessionId,
    'session.setConfigOption',
  );

  validateSessionCommandAdmission(deps);

  const configOptions = await applySessionConfig(session, input).catch(
    asRequestError,
  );

  return { configOptions };
}

// The commands act Operations run on a Session, bound to what Sessions run them with.
export type SessionCommands = {
  cancel: Bound<typeof cancelSession>;
  archive: Bound<typeof archiveSession>;
  unarchive: Bound<typeof unarchiveSession>;
  close: Bound<typeof closeSession>;
  savePlan: Bound<typeof saveSessionPlan>;
  configure: Bound<typeof configureSession>;
  rename: Bound<typeof renameSession>;
  stopShell: Bound<typeof stopShell>;
};

export function createSessionCommands(
  deps: SessionRouterDeps,
): SessionCommands {
  return {
    cancel: cancelSession.bind(null, deps),
    archive: archiveSession.bind(null, deps),
    unarchive: unarchiveSession.bind(null, deps),
    close: closeSession.bind(null, deps),
    savePlan: saveSessionPlan.bind(null, deps),
    configure: configureSession.bind(null, deps),
    rename: renameSession.bind(null, deps),
    stopShell: stopShell.bind(null, deps),
  };
}

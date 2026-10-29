import type { Bound } from '../lib/bound';
import { archiveSession, unarchiveSession } from './archive/archive-commands';
import type { SessionRouterDeps } from './router-deps';
import { cancelSession, closeSession } from './session-closure';
import { configureSession } from './session-configuration';
import { renameSession } from './session-rename';
import { saveSessionPlan } from './session-save-plan';
import { stopShell } from './shells/stop';

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

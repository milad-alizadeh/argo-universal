import type { sessionOperations } from '@repo/contracts/operations';
import {
  archiveSession,
  cancelSession,
  createSession,
  stopShell,
  unarchiveSession,
  closeSession,
  configureSession,
  renameSession,
  saveSessionPlan,
  type SessionRouterDeps,
} from '../sessions';
import type { OperationImplementations } from './operations';

export const sessionImplementations = (
  deps: SessionRouterDeps,
): Pick<OperationImplementations, keyof typeof sessionOperations> => ({
  'session.new': (input) => createSession(deps, input),
  'session.cancel': async (input) => cancelSession(deps, input.sessionId),
  'session.archive': (input) => archiveSession(deps, input.sessionId),
  'session.unarchive': (input) => unarchiveSession(deps, input.sessionId),
  'session.savePlan': saveSessionPlan.bind(null, deps),
  'session.close': (params) => closeSession(deps, params.sessionId),
  'session.setConfigOption': configureSession.bind(null, deps),
  'shell.stop': async (params) => stopShell(deps, params),
  'session.rename': renameSession.bind(null, deps),
});

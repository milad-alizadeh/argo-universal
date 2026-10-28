import type {
  SessionStopShellInput,
  SessionStopShellOutput,
  SessionCloseInput,
  SessionCloseOutput,
} from '@repo/contracts';
import type { sessionOperations } from '@repo/contracts/operations';
import {
  stopShell,
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
  'session.savePlan': saveSessionPlan.bind(null, deps),
  'session.close': (params: SessionCloseInput): Promise<SessionCloseOutput> =>
    closeSession(deps, params.sessionId),
  'session.setConfigOption': configureSession.bind(null, deps),
  'shell.stop': async (
    params: SessionStopShellInput,
  ): Promise<SessionStopShellOutput> => stopShell(deps, params),
  'session.rename': renameSession.bind(null, deps),
});

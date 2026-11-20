import type { OperationParams } from '../implementations';
import type { ScopeTarget, Targeted } from './targets';

type OpenedDestination = OperationParams<'app.open'>['destination'];

// A Session's or a Project's Screen reaches that one; the lists, Agents, Settings and Plugin Pages reach nothing in particular.
const openedTarget = (destination: OpenedDestination): ScopeTarget => {
  if (destination.screen === 'session')
    return {
      kind: 'session',
      sessionId: destination.sessionId,
      opening: false,
    };

  return destination.screen === 'project'
    ? { kind: 'project', projectId: destination.projectId }
    : { kind: 'global' };
};

export const openedScreen = (
  params: OperationParams<'app.open'>,
): Targeted<OperationParams<'app.open'>> => ({
  target: openedTarget(params.destination),
  params,
});

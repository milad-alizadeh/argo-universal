import type { OperationId } from '@repo/contracts/operations';
import type { OperationParams } from '../implementations';
import type { SessionCaller } from '../session-tokens';

// What an Operation reaches: nothing in particular, one Project, or one Session.
export type ScopeTarget =
  | { kind: 'global' }
  | { kind: 'project'; projectId: string }
  | { kind: 'session'; sessionId: string; opening: boolean };

// The target, and the params the Operation then runs with.
export type Targeted<Params> = { target: ScopeTarget; params: Params };

type TargetRule<Params> = (
  params: Params,
  caller: SessionCaller,
) => Targeted<Params>;

type TargetRules = { [Id in OperationId]: TargetRule<OperationParams<Id>> };

const global = <Params>(params: Params): Targeted<Params> => ({
  target: { kind: 'global' },
  params,
});

const projectParam = <Params extends { projectId: string }>(
  params: Params,
): Targeted<Params> => ({
  target: { kind: 'project', projectId: params.projectId },
  params,
});

const sessionParam = <Params extends { sessionId: string }>(
  params: Params,
): Targeted<Params> => ({
  target: { kind: 'session', sessionId: params.sessionId, opening: false },
  params,
});

// Only a close acts on a Session that is still opening (owner, 2026-10-28).
const openingSessionParam = <Params extends { sessionId: string }>(
  params: Params,
): Targeted<Params> => ({
  target: { kind: 'session', sessionId: params.sessionId, opening: true },
  params,
});

// A Session lists its own Project's Sessions unless it names another Project.
const listedProject: TargetRule<OperationParams<'session.list'>> = (
  params,
  caller,
) => {
  const projectId = params.projectId ?? caller.projectId;

  return {
    target: { kind: 'project', projectId },
    params: { ...params, projectId },
  };
};

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

const openedScreen: TargetRule<OperationParams<'app.open'>> = (params) => ({
  target: openedTarget(params.destination),
  params,
});

// Every Operation names its target when it enters the registry.
const targetRules = {
  'app.open': openedScreen,
  'project.list': global,
  'project.listBranches': projectParam,
  'session.list': listedProject,
  'session.get': sessionParam,
  'session.feed': sessionParam,
  'session.changes': sessionParam,
  'session.diff': sessionParam,
  'session.listAgents': sessionParam,
  'session.listShells': sessionParam,
  'session.listBranches': sessionParam,
  'session.new': projectParam,
  'session.prompt': sessionParam,
  'session.cancel': sessionParam,
  'session.rename': sessionParam,
  'session.setConfigOption': sessionParam,
  'session.savePlan': sessionParam,
  'session.close': openingSessionParam,
  'shell.stop': sessionParam,
  'session.archive': sessionParam,
  'session.unarchive': sessionParam,
  'registry.get': global,
  'registry.refresh': global,
  'registry.sync': global,
  'agent.list': global,
  'agent.install': global,
  'agent.remove': global,
  'agent.getAccess': global,
  'agent.setAccess': global,
  'agent.installInstructions': global,
  'plugin.list': global,
  'plugin.activate': global,
  'plugin.setEnabled': global,
  'plugin.getSettings': global,
  'plugin.setSetting': global,
} satisfies TargetRules;

const targets: TargetRules = targetRules;

export function scopeTarget<Id extends OperationId>(
  id: Id,
  params: OperationParams<Id>,
  caller: SessionCaller,
): Targeted<OperationParams<Id>> {
  return targets[id](params, caller);
}

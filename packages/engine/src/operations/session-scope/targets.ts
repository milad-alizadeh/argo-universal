import type { OperationId } from '@repo/contracts/operations';
import { TRPCError } from '@trpc/server';
import type { OperationParams } from '../implementations';
import type { SessionCaller } from '../session-tokens';
import { callerSessionParam, ownSessionOnly } from './caller-session-targets';

type Defaults = {
  [Id in OperationId]?: (
    params: OperationParams<Id>,
    caller: SessionCaller,
  ) => OperationParams<Id>;
};

function ownSessionTarget<Params extends { sessionId?: string }>(
  params: Params,
  caller: SessionCaller,
): Params {
  if (params.sessionId !== undefined && params.sessionId !== caller.sessionId)
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Close follow-through from its starter Session.',
    });

  return callerSessionParam(params, caller);
}

const defaults: Defaults = {
  'project.scheduleList': (params, caller) => ({
    ...params,
    projectId: params.projectId ?? caller.projectId,
  }),
  'session.list': (params, caller) => ({
    ...params,
    projectId: params.projectId ?? caller.projectId,
  }),
  'session.closeFollowThrough': ownSessionTarget,
  'session.offerSkill': (params, caller) => ({
    ...params,
    starterId: caller.sessionId,
  }),
  'session.rename': callerSessionParam,
  'session.declareSubagentRole': callerSessionParam,
  'session.setTodos': callerSessionParam,
  'session.setTodoStep': callerSessionParam,
  'plugin.new': callerSessionParam,
  'conversation.end': callerSessionParam,
  'run.start': callerSessionParam,
  'run.stop': callerSessionParam,
  'run.restart': callerSessionParam,
  'run.startGroup': callerSessionParam,
  'run.stopGroup': callerSessionParam,
  'run.status': callerSessionParam,
  'run.logs': callerSessionParam,
  'run.draft': callerSessionParam,
  'terminal.read': callerSessionParam,
  'terminal.send': callerSessionParam,
  'conversation.hangUp': ownSessionOnly,
};

export function scopedParams<Id extends OperationId>(
  id: Id,
  params: OperationParams<Id>,
  caller: SessionCaller,
): OperationParams<Id> {
  return defaults[id]?.(params, caller) ?? params;
}

import type { OperationId } from '@repo/contracts/operations';
import type { OperationParams } from '../implementations';
import type { SessionCaller } from '../session-tokens';
import { callerSessionParam, ownSessionOnly } from './caller-session-targets';

type Defaults = {
  [Id in OperationId]?: (
    params: OperationParams<Id>,
    caller: SessionCaller,
  ) => OperationParams<Id>;
};

const defaults: Defaults = {
  'session.list': (params, caller) => ({
    ...params,
    projectId: params.projectId ?? caller.projectId,
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
  'run.status': callerSessionParam,
  'run.logs': callerSessionParam,
  'run.draft': callerSessionParam,
  'conversation.hangUp': ownSessionOnly,
};

export function scopedParams<Id extends OperationId>(
  id: Id,
  params: OperationParams<Id>,
  caller: SessionCaller,
): OperationParams<Id> {
  return defaults[id]?.(params, caller) ?? params;
}

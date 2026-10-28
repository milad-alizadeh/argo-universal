import type {
  operations,
  OperationId,
  OperationExecution,
} from '@repo/contracts/operations';
import type { Json } from '@repo/contracts/plugins/hook-protocol';
import type { z } from 'zod';
import { userOrigin, type SessionList } from '../sessions';
import { createAgentAccessOperations } from './agent-access';
import {
  acceptedResult,
  type NativeStartId,
  type NativeStartRequest,
  type StartedWork,
} from './native-start';
import type { OperationsDeps } from './operations';
import { createPluginOperations } from './plugins';
import { createProjectOperations } from './projects';
import { createReadOperations } from './readers';
import { createRegistryOperations } from './registry';
import { sessionImplementations } from './sessions';

type ParamsById = {
  [Id in OperationId]: z.output<(typeof operations)[Id]['params']>;
};

type ResultsById = {
  [Id in OperationId]: z.output<(typeof operations)[Id]['result']>;
};

export type OperationParams<Id extends OperationId = OperationId> =
  ParamsById[Id];

export type OperationResult<Id extends OperationId = OperationId> =
  ResultsById[Id];

export type OperationRunResult = OperationResult | OperationExecution;

export type PlainOperationId = Exclude<OperationId, NativeStartId>;

export type PlainImplementations = {
  [Id in PlainOperationId]: (
    params: ParamsById[Id],
  ) => Promise<ResultsById[Id]>;
};

export type NativeStartImplementations = {
  [Id in NativeStartId]: (
    params: ParamsById[Id],
    request: NativeStartRequest,
  ) => Promise<StartedWork<ResultsById[Id]>>;
};

export type OperationImplementations = PlainImplementations &
  NativeStartImplementations;

export type AppImplementations = {
  [Id in OperationId]: (params: ParamsById[Id]) => Promise<ResultsById[Id]>;
};

export function createImplementations(
  deps: OperationsDeps,
  sessionList: SessionList,
): OperationImplementations {
  return {
    ...createAgentAccessOperations(deps),
    ...sessionImplementations(deps),
    ...createReadOperations(deps, sessionList),
    ...createPluginOperations(deps.plugins.plugins),
    ...createRegistryOperations(deps),
    ...createProjectOperations(deps),
  };
}

// A Session caller's Operation, after its scope allows it; a new Session may bring its pre-allocated id.
export type SessionInvoke = <Id extends OperationId>(
  operation: { id: Id; params: Json },
  start?: { sessionId?: string },
) => Promise<OperationResult<Id>>;

// The App's own Session starts answer once admitted, as the user, with neither a wait id nor a Tool call.
export function appImplementations(
  implementations: OperationImplementations,
): AppImplementations {
  return {
    ...implementations,
    'session.new': (params) =>
      acceptedResult(implementations['session.new'](params, userOrigin)),
    'session.prompt': (params) =>
      acceptedResult(implementations['session.prompt'](params, userOrigin)),
  };
}

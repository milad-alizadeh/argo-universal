import type {
  operations,
  OperationId,
  OperationExecution,
} from '@repo/contracts/operations';
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

// A new Session's id, allocated before its start so its delegation reservation can name it.
export type NewSessionId = { sessionId?: string };

// A Session caller's Operation, with the params its scope parsed, after its scope allows it.
export type SessionInvoke = <Id extends OperationId>(
  operation: { id: Id; params: ParamsById[Id] },
  start?: NewSessionId,
) => Promise<OperationResult<Id>>;

// Every Operation as a Session caller runs it: native starts follow the caller's Tool call.
export type SessionImplementations = {
  [Id in OperationId]: (
    params: ParamsById[Id],
    start: NewSessionId,
  ) => Promise<ResultsById[Id]>;
};

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

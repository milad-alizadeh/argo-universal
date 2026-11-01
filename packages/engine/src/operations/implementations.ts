import type { operations, OperationId } from '@repo/contracts/operations';
import type { z } from 'zod';
import type { NativeStartRequest } from '../sessions';
import { createAgentAccessOperations } from './agent-access';
import { createAppOperations } from './app';
import type { NativeStartId, StartedWork } from './native-start';
import type { OperationsDeps } from './operations';
import { createPluginOperations } from './plugins';
import { createProjectOperations } from './projects';
import { createRegistryOperations } from './registry';
import { sessionImplementations } from './sessions';
import type { WorkExecution } from './work';

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

// What a token caller is answered: the Operation's own result, or the native work it started.
export type RunAnswer<Result> =
  | { kind: 'result'; result: Result }
  | WorkExecution;

export type OperationRunResult = RunAnswer<OperationResult>;

export const answer = <Result>(result: Result): RunAnswer<Result> => ({
  kind: 'result',
  result,
});

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

// Every Operation as one caller kind runs it, with its params parsed.
export type CallerImplementations<Args extends unknown[] = []> = {
  [Id in OperationId]: (
    params: ParamsById[Id],
    ...args: Args
  ) => Promise<ResultsById[Id]>;
};

export function createImplementations(
  deps: OperationsDeps,
): OperationImplementations {
  return {
    ...createAgentAccessOperations(deps),
    ...createAppOperations(deps),
    ...sessionImplementations(deps.sessions),
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

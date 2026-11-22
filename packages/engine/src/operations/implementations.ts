import type { operations, OperationId } from '@repo/contracts/operations';
import type { Json } from '@repo/contracts/plugins/hook-protocol';
import type { z } from 'zod';
import type { NativeStartRequest, SessionOperationCall } from '../sessions';
import { createAgentAccessOperations } from './agent-access';
import { createAppOperations } from './app';
import { createConversationOperations } from './conversation';
import { createDiagramOperations } from './diagram';
import type { NativeStartId, StartedWork } from './native-start';
import type { OperationsDeps } from './operations';
import { createPluginOperations } from './plugins';
import { createProjectOperations } from './projects';
import { createRegistryOperations } from './registry';
import type { AppCaller, SessionCaller, UserCaller } from './session-tokens';
import { sessionImplementations } from './sessions';
import type { WorkExecution, UserAdmission } from './work';

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
    ...connection: Id extends 'session.queue' | 'conversation.start'
      ? [connectionSignal?: AbortSignal]
      : []
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
    ...createDiagramOperations(),
    ...sessionImplementations(deps.sessions),
    ...createPluginOperations(deps.plugins, deps.sessions),
    ...createRegistryOperations(deps),
    ...createProjectOperations(deps),
    ...createConversationOperations(deps.conversation, deps.sessions),
  };
}

// A new Session's id, allocated before its start so its delegation reservation can name it.
export type NewSessionId = { sessionId?: string };

// A Session caller's Operation, with the params its scope parsed, after its scope allows it.
export type SessionInvoke = <Id extends OperationId>(
  operation: { id: Id; params: ParamsById[Id] },
  start?: NewSessionId,
) => Promise<OperationResult<Id>>;

type Operation = { id: OperationId; params: Json };

// The App's procedure has parsed the params, and parses the result itself.
export type AppRun<Id extends OperationId> = AppCaller & {
  id: Id;
  params: OperationParams<Id>;
};

export type UserRun = UserCaller & Operation & { admission: UserAdmission };

export type SessionRun = SessionCaller &
  Operation & {
    call: SessionOperationCall;
  };

import type {
  OperationId,
  OperationRow,
  OperationExecution,
  OperationRunResponse,
} from '@repo/contracts/operations';
import type { Json } from '@repo/contracts/plugins/hook-protocol';
import type { RegistryDeps } from '../agents';
import type { PluginsRouterDeps } from '../plugins';
import {
  createOperationCalls,
  createSessionDirectory,
  type OperationCalls,
  type SessionList,
  type SessionRouterDeps,
} from '../sessions';
import {
  discoveryCall,
  listedOutput,
  operationCall,
  recordedOutput,
  recordOperation,
} from './call-recording';
import {
  createImplementations,
  type OperationRunResult,
} from './implementations';
import { requireOperationId } from './params';
import { OperationResponses, storedOutputBlobs } from './responses';
import { OperationRunner } from './runner';
import { listOperations } from './search';
import { scopedOperations, SessionScope } from './session-scope';
import type {
  SessionCaller,
  SessionTokens,
  TokenCaller,
} from './session-tokens';
import { tokensMatch } from './tokens';
import { liveWorkDeps, OperationWork, type OperationWaitClock } from './work';

export type {
  OperationImplementations,
  OperationResult,
  OperationRunResult,
} from './implementations';

export type OperationsDeps = SessionRouterDeps &
  RegistryDeps & {
    controlToken: string;
    userHome: string;
    sessionTokens: SessionTokens;
    blobsFolder: string;
    plugins: PluginsRouterDeps;
    operationWaitClock?: OperationWaitClock;
  };

type Operation = { id: OperationId; params: Json };

type RunRequest = { id: string; params: Json; wait: boolean };

type Connection = { token?: string; wait: boolean; signal?: AbortSignal };

// A token caller's Operations: the user's run and admit under the deadline; a Session's are recorded as its Tool calls.
export class Operations {
  private readonly work: OperationWork;
  private readonly calls: OperationCalls;
  private readonly responses: OperationResponses;
  public constructor(
    private readonly deps: OperationsDeps,
    private readonly runner: OperationRunner,
  ) {
    this.calls = createOperationCalls(deps);
    this.work = new OperationWork(liveWorkDeps(deps), (token) =>
      this.caller(token),
    );
    this.responses = new OperationResponses(storedOutputBlobs(deps));
  }
  public async list(
    token: string | undefined,
    filter = '',
  ): Promise<OperationRow[]> {
    const caller = this.caller(token);

    if (caller.kind === 'user') return listOperations(filter);
    const call = this.calls.begin(caller.sessionId, discoveryCall(filter));

    const listed = async (): Promise<OperationRow[]> =>
      scopedOperations(listOperations(filter), call);

    return recordOperation(call, listed, listedOutput).result;
  }
  public async run(
    token: string | undefined,
    request: RunRequest,
    signal?: AbortSignal,
  ): Promise<OperationRunResponse> {
    const id = requireOperationId(request.id);
    const operation = { id, params: request.params };
    const connection = { token, wait: request.wait, signal };
    const value = await this.answer(this.caller(token), connection, operation);

    return this.responses.run(value, signal);
  }
  public async wait(
    id: string,
    token: string | undefined,
    signal?: AbortSignal,
  ): Promise<OperationExecution> {
    const execution = await this.work.wait(id, token, signal);

    return this.responses.execution(execution, signal);
  }
  private answer(
    caller: TokenCaller,
    connection: Connection,
    operation: Operation,
  ): Promise<OperationRunResult> {
    if (caller.kind === 'session')
      return this.runRecorded(caller, connection, operation);

    return this.work.runUser(connection, (admission) =>
      this.runner.run({ ...caller, ...operation, admission }),
    );
  }
  private runRecorded(
    caller: SessionCaller,
    connection: Connection,
    operation: Operation,
  ): Promise<OperationRunResult> {
    const call = this.calls.begin(caller.sessionId, operationCall(operation));

    const run = (): Promise<OperationRunResult> =>
      this.runner.run({ ...caller, ...operation, call });

    const started = recordOperation(call, run, recordedOutput);

    return this.work.runRecorded(
      { ...connection, caller, id: operation.id },
      started,
    );
  }
  private caller(token: string | undefined): TokenCaller {
    if (token && tokensMatch(this.deps.controlToken, token))
      return { kind: 'user' };

    return this.deps.sessionTokens.require(token);
  }
}

// Every caller's one runner, reading Sessions through the Session directory.
export function createRunner(
  deps: OperationsDeps,
  sessionList: SessionList,
): OperationRunner {
  const directory = createSessionDirectory(deps);

  return new OperationRunner(createImplementations(deps, sessionList), {
    directory,
    scope: new SessionScope({ directory, createId: deps.createId }),
  });
}

import type {
  OperationId,
  OperationRow,
  OperationExecution,
  OperationRunResponse,
} from '@repo/contracts/operations';
import type {
  OperationRunRequest,
  OperationWaitRequest,
} from '@repo/contracts/operations/control';
import type { Json } from '@repo/contracts/plugins/hook-protocol';
import type { RegistryDeps } from '../agents';
import type { FeedDeps } from '../feed';
import type { PluginsRouterDeps } from '../plugins';
import type { Sessions } from '../sessions';
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
import {
  operationConnection,
  type OperationConnection,
} from './operation-connection';
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
  OperationRunResult,
} from './implementations';

// What Operations read: Sessions only through their one interface, and the Engine's own deps.
export type OperationsDeps = RegistryDeps &
  Pick<FeedDeps, 'findWriter'> & {
    sessions: Sessions;
    controlToken: string;
    userHome: string;
    sessionTokens: SessionTokens;
    blobsFolder: string;
    plugins: PluginsRouterDeps;
    operationWaitClock?: OperationWaitClock;
    // The Engine's Session command signal: stopping it ends every wait.
    sessionCommandSignal?: AbortSignal;
    // Allocates a new Session's id before its start.
    createId: () => string;
  };

type Operation = { id: OperationId; params: Json };

type RunRequest = OperationRunRequest;

// A token caller's Operations: the user's run and admit under the deadline; a Session's are recorded as its Tool calls.
export class Operations {
  private readonly work: OperationWork;
  private readonly sessions: Sessions;
  private readonly responses: OperationResponses;
  public constructor(
    private readonly deps: OperationsDeps,
    private readonly runner: OperationRunner,
  ) {
    this.sessions = deps.sessions;
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
    const call = this.sessions.call(caller.sessionId, discoveryCall(filter));

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

    const connection = operationConnection(token, request, signal);

    const value = await this.answer(this.caller(token), connection, operation);

    return this.responses.run(value, signal);
  }
  public async wait(
    request: OperationWaitRequest,
    token: string | undefined,
    signal?: AbortSignal,
  ): Promise<OperationExecution> {
    const execution = await this.work.wait(request.id, token, {
      signal,
      timeoutMs: request.timeoutMs,
    });

    return this.responses.execution(execution, signal);
  }
  private answer(
    caller: TokenCaller,
    connection: OperationConnection,
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
    connection: OperationConnection,
    operation: Operation,
  ): Promise<OperationRunResult> {
    const call = this.sessions.call(caller.sessionId, operationCall(operation));

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
export function createRunner(deps: OperationsDeps): OperationRunner {
  const { directory } = deps.sessions;

  return new OperationRunner(createImplementations(deps), {
    directory,
    scope: new SessionScope({ directory, createId: deps.createId }),
  });
}

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
import {
  discoveryCall,
  listedOutput,
  operationCall,
  recordedOutput,
  recordOperation,
} from './call-recording';
import type { OperationRunResult } from './implementations';
import {
  operationConnection,
  type OperationConnection,
} from './operation-connection';
import { availableOperations } from './operation-permission';
import type { OperationsDeps } from './operations-deps';
import { requireOperationId } from './params';
import { PluginOperationRouter } from './plugin-run';
import { OperationResponses, storedOutputBlobs } from './responses';
import type { OperationRunner } from './runner';
import { listOperations } from './search';
import type { SessionCaller, TokenCaller } from './session-tokens';
import { authenticate } from './tokens';
import { liveWorkDeps, OperationWork } from './work';

export type { OperationsDeps } from './operations-deps';

export type {
  OperationImplementations,
  OperationRunResult,
} from './implementations';

type Operation = { id: OperationId; params: Json };

// A token caller's Operations: the user's run and admit under the deadline; a Session's are recorded as its Tool calls.
export class Operations {
  private readonly work: OperationWork;
  private readonly responses: OperationResponses;
  private readonly pluginOperations: PluginOperationRouter;
  public constructor(
    private readonly deps: OperationsDeps,
    private readonly runner: OperationRunner,
  ) {
    this.pluginOperations = new PluginOperationRouter(
      deps.plugins,
      deps.sessions,
    );
    this.work = new OperationWork(liveWorkDeps(deps), (token) =>
      authenticate(this.deps, token),
    );
    this.responses = new OperationResponses(storedOutputBlobs(deps));
  }
  public async list(
    token: string | undefined,
    filter = '',
  ): Promise<OperationRow[]> {
    const caller = authenticate(this.deps, token);

    const rows = await this.rows(filter);

    if (caller.kind === 'user') return availableOperations(rows, false);

    const call = this.deps.sessions.call(
      caller.sessionId,
      discoveryCall(filter),
    );

    const listed = async (): Promise<OperationRow[]> =>
      availableOperations(rows, call.canConfirm);

    return recordOperation(call, listed, listedOutput).result;
  }

  private async rows(filter: string): Promise<OperationRow[]> {
    const plugins = await this.pluginOperations.listed(filter);

    return [...listOperations(filter), ...plugins];
  }

  public async run(
    token: string | undefined,
    request: OperationRunRequest,
    signal?: AbortSignal,
  ): Promise<OperationRunResponse> {
    const caller = authenticate(this.deps, token);
    const plugin = await this.pluginOperations.find(request.id);

    // One of a running Plugin's own Operations, which the Plugin answers itself (ADR-0044).
    if (plugin)
      return this.pluginOperations.runFor(caller, plugin, request.params);

    const connection = operationConnection(token, request, signal);
    const value = await this.answer(caller, connection, operationFor(request));

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
    const action = operationCall(operation);
    const call = this.deps.sessions.call(caller.sessionId, action);

    const run = (): Promise<OperationRunResult> =>
      this.runner.run({ ...caller, ...operation, call });

    const started = recordOperation(call, run, recordedOutput(operation.id));

    return this.work.runRecorded(
      { ...connection, caller, id: operation.id },
      started,
    );
  }
}

const operationFor = ({ id, params }: OperationRunRequest): Operation => ({
  id: requireOperationId(id),
  params,
});

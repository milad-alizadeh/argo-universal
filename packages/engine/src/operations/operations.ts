import {
  operations,
  type OperationId,
  type OperationRow,
  type OperationExecution,
} from '@repo/contracts/operations';
import type { Json } from '@repo/contracts/plugins/hook-protocol';
import type { RegistryDeps } from '../agents';
import type { FeedDeps } from '../feed';
import type { PluginsRouterDeps } from '../plugins';
import type {
  SessionOperationCall,
  SessionList,
  SessionRouterDeps,
} from '../sessions';
import {
  recordOperation,
  requireOperationCall,
  startRecordedOperation,
  type StartedOperation,
} from './call-recording';
import {
  createImplementations,
  type OperationImplementations,
  type OperationResult,
} from './implementations';
import type { OperationInput } from './params';
import { runOperation } from './router.gen';
import { listOperations } from './search';
import { scopedOperations, runSessionOperation } from './session-scope';
import { SessionStarts } from './session-starts';
import { type OperationCaller, type SessionTokens } from './session-tokens';
import { tokensMatch } from './tokens';
import type { OperationWaitClock } from './wait-clock';
import { OperationWork } from './work';

export type {
  OperationImplementations,
  OperationResult,
} from './implementations';

export type OperationsDeps = SessionRouterDeps &
  RegistryDeps & {
    controlToken: string;
    userHome: string;
    sessionTokens: SessionTokens;
    blobsFolder: string;
    plugins: PluginsRouterDeps;
    watchSessionSnapshot: FeedDeps['watchSessionSnapshot'];
    operationWaitClock?: OperationWaitClock;
  };

type RunInput = { id: OperationId; params: Json; wait: boolean };

type OperationCallInput = { name: OperationId; label: string; input: Json };

export class Operations {
  private readonly implementations: OperationImplementations;
  private readonly work: OperationWork;
  private readonly starts: SessionStarts;
  public constructor(
    private readonly deps: OperationsDeps,
    sessionList: SessionList,
  ) {
    this.implementations = createImplementations(deps, sessionList);
    this.work = new OperationWork(deps, (token) => this.caller(token));
    this.starts = new SessionStarts(deps);
  }
  public list(token: string | undefined, filter = ''): Promise<OperationRow[]> {
    const caller = this.caller(token);

    return recordOperation(
      { deps: this.deps, caller },
      {
        name: 'operations.list',
        label: 'Discover Operations',
        input: { filter },
      },
      async (call) => scopedOperations(listOperations(filter), call),
    );
  }
  public run(
    token: string | undefined,
    input: RunInput,
    signal?: AbortSignal,
  ): Promise<OperationResult | OperationExecution> {
    const caller = this.caller(token);

    const started = this.start(caller, input);

    return this.work.run({ caller, token, wait: input.wait, signal }, started);
  }
  private start(
    caller: OperationCaller,
    input: RunInput,
  ): StartedOperation<OperationResult> {
    return startRecordedOperation(
      { deps: this.deps, caller },
      operationCall(input),
      (call) => this.authorized(caller, input, call),
    );
  }
  public wait(
    id: string,
    token: string | undefined,
    signal?: AbortSignal,
  ): Promise<OperationExecution> {
    return this.work.wait(id, token, signal);
  }
  private async authorized(
    caller: OperationCaller,
    operation: { id: OperationId; params: Json },
    call?: SessionOperationCall,
  ): Promise<OperationResult> {
    if (caller.kind === 'user') return this.runUser(operation);

    const access = {
      implementations: this.implementations,
      caller,
      deps: this.deps,
      starts: this.starts,
      call: requireOperationCall(call),
    };

    return runSessionOperation(access, operation);
  }
  private async runUser({
    id,
    params,
  }: {
    id: OperationId;
    params: Json;
  }): Promise<OperationResult> {
    return operations[id].result.parseAsync(
      await runOperation(this.implementations, id, params),
    );
  }
  private caller(token: string | undefined): OperationCaller {
    if (token && tokensMatch(this.deps.controlToken, token))
      return { kind: 'user' };

    return this.deps.sessionTokens.require(token);
  }
  public runApp<Id extends OperationId>(
    id: Id,
    params: OperationInput,
  ): Promise<OperationResult<Id>> {
    return runOperation(this.implementations, id, params);
  }
}

function operationCall({ id, params }: RunInput): OperationCallInput {
  return { name: id, label: operations[id].label, input: params };
}

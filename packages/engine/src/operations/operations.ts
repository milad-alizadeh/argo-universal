import {
  operations,
  type OperationId,
  type OperationRow,
  type OperationExecution,
} from '@repo/contracts/operations';
import type { Json } from '@repo/contracts/plugins/hook-protocol';
import type { RegistryDeps } from '../agents';
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
  type OperationRunResult,
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
import { isNativeStartOperation } from './native-user-starts';
import type { WaitBudget } from './wait-budget';

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

type RunInput = { id: OperationId; params: Json; wait: boolean };

type OperationCallInput = { name: OperationId; label: string; input: Json };
type CallContext = { caller: OperationCaller; budget: WaitBudget; call?: SessionOperationCall };

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

    return this.work.run({ caller, token, wait: input.wait, signal, id: input.id }, (budget) => this.start({ caller, budget }, input));
  }
  private start(
    context: CallContext,
    input: RunInput,
  ): StartedOperation<OperationRunResult> {
    return startRecordedOperation(
      { deps: this.deps, caller: context.caller },
      operationCall(input),
      (call) => this.authorized({ ...context, call }, input),
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
    { caller, call, budget }: CallContext,
    operation: { id: OperationId; params: Json },
  ): Promise<OperationRunResult> {
    if (caller.kind === 'user') return this.runUser(operation, budget);

    const access = {
      implementations: this.implementations,
      caller,
      deps: this.deps,
      starts: this.starts,
      call: requireOperationCall(call),
    };

    return runSessionOperation(access, operation);
  }
  private async runUser({ id, params }: { id: OperationId; params: Json }, budget: WaitBudget): Promise<OperationRunResult> {
    if (isNativeStartOperation(id)) return this.work.startUser({ id, params }, budget);

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

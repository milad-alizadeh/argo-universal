import {
  operations,
  type OperationId,
  type OperationRow,
  type OperationExecution,
} from '@repo/contracts/operations';
import type { Json } from '@repo/contracts/plugins/hook-protocol';
import type { RegistryDeps } from '../agents';
import type { PluginsRouterDeps } from '../plugins';
import type { SessionList, SessionRouterDeps } from '../sessions';
import {
  recordOperation,
  startRecordedOperation,
  type StartedOperation,
} from './call-recording';
import {
  createImplementations,
  type OperationParams,
  type OperationResult,
  type OperationRunResult,
} from './implementations';
import { OperationRunner, type RunContext } from './runner';
import { listOperations } from './search';
import { scopedOperations } from './session-scope';
import { SessionStarts } from './session-starts';
import { type OperationCaller, type SessionTokens } from './session-tokens';
import { tokensMatch } from './tokens';
import type { OperationWaitClock } from './wait-clock';
import { OperationWork } from './work';

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

export class Operations {
  private readonly runner: OperationRunner;
  private readonly work: OperationWork;
  public constructor(
    private readonly deps: OperationsDeps,
    sessionList: SessionList,
  ) {
    this.work = new OperationWork(deps, (token) => this.caller(token));
    this.runner = new OperationRunner(
      createImplementations(deps, sessionList),
      {
        deps,
        work: this.work,
        starts: new SessionStarts(deps),
      },
    );
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

    return this.work.run(
      { caller, token, wait: input.wait, signal, id: input.id },
      (budget) => this.start({ caller, budget }, input),
    );
  }
  private start(
    context: RunContext,
    input: RunInput,
  ): StartedOperation<OperationRunResult> {
    return startRecordedOperation(
      { deps: this.deps, caller: context.caller },
      operationCall(input),
      (call) => this.runner.run({ ...context, call }, input),
    );
  }
  public wait(
    id: string,
    token: string | undefined,
    signal?: AbortSignal,
  ): Promise<OperationExecution> {
    return this.work.wait(id, token, signal);
  }
  private caller(token: string | undefined): OperationCaller {
    if (token && tokensMatch(this.deps.controlToken, token))
      return { kind: 'user' };

    return this.deps.sessionTokens.require(token);
  }
  public runApp<Id extends OperationId>(
    id: Id,
    params: OperationParams<Id>,
  ): Promise<OperationResult<Id>> {
    return this.runner.runApp(id, params);
  }
}

function operationCall({ id, params }: RunInput): OperationCallInput {
  return { name: id, label: operations[id].label, input: params };
}

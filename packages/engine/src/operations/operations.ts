import {
  operations,
  type OperationId,
  type OperationRow,
  type OperationExecution,
} from '@repo/contracts/operations';
import type { Json } from '@repo/contracts/plugins/hook-protocol';
import type { RegistryDeps } from '../agents';
import type { PluginsRouterDeps } from '../plugins';
import {
  createOperationCalls,
  createSessionDirectory,
  createSessionWorkSource,
  type OperationCalls,
  type SessionList,
  type SessionRouterDeps,
} from '../sessions';
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
import { scopedOperations, SessionScope } from './session-scope';
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
  private readonly calls: OperationCalls;
  public constructor(
    private readonly deps: OperationsDeps,
    sessionList: SessionList,
  ) {
    this.calls = createOperationCalls(deps);
    this.work = new OperationWork(
      deps,
      (token) => this.caller(token),
      createSessionWorkSource(deps),
    );
    this.runner = createRunner(deps, { sessionList, work: this.work });
  }
  public list(token: string | undefined, filter = ''): Promise<OperationRow[]> {
    const caller = this.caller(token);

    return recordOperation(
      { calls: this.calls, caller },
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
      { calls: this.calls, caller: context.caller },
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

function createRunner(
  deps: OperationsDeps,
  { sessionList, work }: { sessionList: SessionList; work: OperationWork },
): OperationRunner {
  const directory = createSessionDirectory(deps);

  return new OperationRunner(createImplementations(deps, sessionList), {
    deps,
    work,
    scope: new SessionScope({ directory, createId: deps.createId }),
  });
}

function operationCall({ id, params }: RunInput): OperationCallInput {
  return { name: id, label: operations[id].label, input: params };
}

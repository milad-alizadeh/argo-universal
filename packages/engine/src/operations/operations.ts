import {
  operations,
  type OperationId,
  type OperationRow,
  type OperationExecution,
  type OperationRunResponse,
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
import { requireOperationId } from './params';
import { OperationResponses, storedOutputBlobs } from './responses';
import { OperationRunner, type RunContext } from './runner';
import { listOperations } from './search';
import { scopedOperations, SessionScope } from './session-scope';
import { type OperationCaller, type SessionTokens } from './session-tokens';
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

type RunInput = { id: OperationId; params: Json; wait: boolean };

type RunRequest = Omit<RunInput, 'id'> & { id: string };

type OperationCallInput = { name: OperationId; label: string; input: Json };

export class Operations {
  private readonly runner: OperationRunner;
  private readonly work: OperationWork;
  private readonly calls: OperationCalls;
  private readonly responses: OperationResponses;
  public constructor(
    private readonly deps: OperationsDeps,
    sessionList: SessionList,
  ) {
    this.calls = createOperationCalls(deps);
    this.work = new OperationWork(liveWorkDeps(deps), (token) =>
      this.caller(token),
    );
    this.runner = createRunner(deps, { sessionList, work: this.work });
    this.responses = new OperationResponses(storedOutputBlobs(deps));
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
  public async run(
    token: string | undefined,
    request: RunRequest,
    signal?: AbortSignal,
  ): Promise<OperationRunResponse> {
    const input = { ...request, id: requireOperationId(request.id) };
    const caller = this.caller(token);

    const value = await this.work.run(
      { caller, token, wait: input.wait, signal, id: input.id },
      (admission) => this.start({ caller, admission }, input),
    );

    return this.responses.run(value, signal);
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
  public async wait(
    id: string,
    token: string | undefined,
    signal?: AbortSignal,
  ): Promise<OperationExecution> {
    const execution = await this.work.wait(id, token, signal);

    return this.responses.execution(execution, signal);
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

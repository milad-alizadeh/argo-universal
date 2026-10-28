import type { OperationId } from '@repo/contracts/operations';
import type { Json } from '@repo/contracts/plugins/hook-protocol';
import {
  sessionOrigin,
  userOrigin,
  type SessionOperationCall,
} from '../sessions';
import { requireOperationCall } from './call-recording';
import {
  appImplementations,
  type AppImplementations,
  type NativeStartImplementations,
  type OperationImplementations,
  type OperationParams,
  type OperationResult,
  type OperationRunResult,
  type PlainImplementations,
  type PlainOperationId,
} from './implementations';
import {
  isNativeStartOperation,
  recordStartedWork,
  type NativeStartId,
  type NativeStartRequest,
  type StartedWork,
} from './native-start';
import type { OperationsDeps } from './operations';
import { parseResult, validateParams } from './params';
import { runSessionOperation } from './session-scope';
import type { SessionStarts } from './session-starts';
import type { OperationCaller, SessionCaller } from './session-tokens';
import type { WaitBudget } from './wait-budget';
import type { OperationWork } from './work';

type Operation = { id: OperationId; params: Json };

type NewSessionId = { sessionId?: string };

export type RunContext = {
  caller: OperationCaller;
  budget: WaitBudget;
  call?: SessionOperationCall;
};

type SessionContext = { caller: SessionCaller; call: SessionOperationCall };

type RunnerPorts = {
  deps: OperationsDeps;
  work: OperationWork;
  starts: SessionStarts;
};

// Every caller runs an Operation here: the caller's scope, then validate, invoke and parse the result.
export class OperationRunner {
  private readonly plain: PlainImplementations;
  private readonly native: NativeStartImplementations;
  private readonly app: AppImplementations;
  public constructor(
    implementations: OperationImplementations,
    private readonly ports: RunnerPorts,
  ) {
    this.plain = implementations;
    this.native = implementations;
    this.app = appImplementations(implementations);
  }
  // The App's procedure already parsed params and parses the result; the App records and waits for nothing.
  public runApp<Id extends OperationId>(
    id: Id,
    params: OperationParams<Id>,
  ): Promise<OperationResult<Id>> {
    return this.app[id](params);
  }
  // The user token has no scope step; a Session token's scope may ask the user first.
  public run(
    { caller, budget, call }: RunContext,
    operation: Operation,
  ): Promise<OperationRunResult> {
    if (caller.kind === 'user') return this.runUser(budget, operation);

    return this.runSession(
      { caller, call: requireOperationCall(call) },
      operation,
    );
  }
  private runUser(
    budget: WaitBudget,
    { id, params }: Operation,
  ): Promise<OperationRunResult> {
    if (!isNativeStartOperation(id)) return this.invoke(id, params);

    return this.ports.work.admitUser(
      (signal) => this.begin(id, params, { ...userOrigin, signal }),
      budget,
    );
  }
  private runSession(
    context: SessionContext,
    operation: Operation,
  ): Promise<OperationResult> {
    const { deps, starts } = this.ports;

    return runSessionOperation(
      {
        ...context,
        deps,
        starts,
        invoke: (scoped, start) => this.invokeSession(context, scoped, start),
      },
      operation,
    );
  }
  private invokeSession<Id extends OperationId>(
    context: SessionContext,
    operation: { id: Id; params: Json },
    start?: NewSessionId,
  ): Promise<OperationResult<Id>>;
  private async invokeSession(
    { caller, call }: SessionContext,
    { id, params }: Operation,
    start: NewSessionId = {},
  ): Promise<OperationResult> {
    if (!isNativeStartOperation(id)) return this.invoke(id, params);

    const origin = sessionOrigin(this.ports.deps.readSession, caller.sessionId);

    const started = await this.begin(id, params, { ...origin, ...start });

    return recordStartedWork(call, started);
  }
  private async invoke<Id extends PlainOperationId>(
    id: Id,
    params: Json,
  ): Promise<OperationResult<Id>> {
    return parseResult(id, await this.plain[id](validateParams(id, params)));
  }
  private async begin<Id extends NativeStartId>(
    id: Id,
    params: Json,
    request: NativeStartRequest,
  ): Promise<StartedWork<OperationResult<Id>>> {
    const started = await this.native[id](validateParams(id, params), request);

    return {
      ...started,
      accepted: async () => {
        const accepted = await started.accepted();

        return { ...accepted, result: await parseResult(id, accepted.result) };
      },
    };
  }
}

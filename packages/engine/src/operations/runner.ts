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
  type NewSessionId,
  type SessionImplementations,
  type SessionInvoke,
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
import type { SessionScope } from './session-scope';
import type { OperationCaller, SessionCaller } from './session-tokens';
import type { OperationWork, WorkAdmission } from './work';

type Operation = { id: OperationId; params: Json };

export type RunContext = {
  caller: OperationCaller;
  admission: WorkAdmission;
  call?: SessionOperationCall;
};

type SessionContext = { caller: SessionCaller; call: SessionOperationCall };

type RunnerPorts = {
  deps: OperationsDeps;
  work: OperationWork;
  scope: SessionScope;
};

// Every caller runs an Operation here: validate, a Session caller's scope, invoke, then parse the result.
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
    { caller, admission, call }: RunContext,
    operation: Operation,
  ): Promise<OperationRunResult> {
    if (caller.kind === 'user') return this.runUser(admission, operation);

    return this.runSession(
      { caller, call: requireOperationCall(call) },
      operation,
    );
  }
  private runUser(
    admission: WorkAdmission,
    { id, params }: Operation,
  ): Promise<OperationRunResult> {
    if (!isNativeStartOperation(id)) return this.invoke(id, params);

    return this.ports.work.admitUser(
      (signal) => this.begin(id, params, { ...userOrigin, signal }),
      admission,
    );
  }
  private runSession(
    context: SessionContext,
    operation: Operation,
  ): Promise<OperationResult> {
    return this.ports.scope.run(
      { ...context, invoke: this.invokeSession(context) },
      operation,
    );
  }
  // The scope parsed the params once; the result is parsed once here.
  private invokeSession(context: SessionContext): SessionInvoke {
    const implementations = this.sessionImplementations(context);

    return async ({ id, params }, start = {}) =>
      parseResult(id, await implementations[id](params, start));
  }
  private sessionImplementations(
    context: SessionContext,
  ): SessionImplementations {
    return {
      ...this.plain,
      'session.new': (params, start) =>
        this.startFromSession(context, { id: 'session.new', params }, start),
      'session.prompt': (params, start) =>
        this.startFromSession(context, { id: 'session.prompt', params }, start),
    };
  }
  // A Session caller's native start comes from that Session, and its Tool call follows the work.
  private async startFromSession<Id extends NativeStartId>(
    { caller, call }: SessionContext,
    { id, params }: { id: Id; params: OperationParams<Id> },
    start: NewSessionId,
  ): Promise<OperationResult<Id>> {
    const origin = sessionOrigin(this.ports.deps.readSession, caller.sessionId);
    const started = await this.native[id](params, { ...origin, ...start });

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

import type { ProjectsListOutput } from '@repo/contracts';
import {
  operations,
  type OperationId,
  type OperationRow,
  type OperationExecution,
} from '@repo/contracts/operations';
import type { Json } from '@repo/contracts/plugins/hook-protocol';
import { createRejectionCounter } from '@repo/machine-log';
import type { z } from 'zod';
import type { RegistryDeps } from '../agents';
import type { FeedDeps } from '../feed';
import type { PluginsRouterDeps } from '../plugins';
import { readProjects } from '../projects';
import {
  readSessionOperation,
  type SessionOperationCall,
  type SessionList,
  type SessionRouterDeps,
} from '../sessions';
import { createAgentAccessOperations } from './agent-access';
import {
  recordOperation,
  requireOperationCall,
  startRecordedOperation,
} from './call-recording';
import { createPluginOperations } from './plugins';
import { createReadOperations } from './readers';
import { createRegistryOperations } from './registry';
import { runOperation } from './router.gen';
import { listOperations } from './search';
import { scopedOperations, runSessionOperation } from './session-scope';
import { type OperationCaller, type SessionTokens } from './session-tokens';
import { sessionImplementations } from './sessions';
import { tokensMatch } from './tokens';
import { waitForNativeWork } from './wait';
import type { OperationWaitClock } from './wait-clock';
import { WaitIds } from './wait-id';

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

export type OperationResult<Id extends OperationId = OperationId> = z.output<
  (typeof operations)[Id]['result']
>;

export type OperationImplementations = {
  [Id in OperationId]: (
    params: z.output<(typeof operations)[Id]['params']>,
  ) => Promise<z.output<(typeof operations)[Id]['result']>>;
};

function createImplementations(
  deps: OperationsDeps,
  sessionList: SessionList,
): OperationImplementations {
  const rejections = createRejectionCounter('projects');

  return {
    ...createAgentAccessOperations(deps),
    ...sessionImplementations(deps),
    ...createReadOperations(deps, sessionList),
    ...createPluginOperations(deps.plugins.plugins),
    ...createRegistryOperations(deps),
    'project.list': (): Promise<ProjectsListOutput> =>
      readProjects(deps.database, rejections),
  };
}

export class Operations {
  private readonly implementations: OperationImplementations;
  private readonly waitIds: WaitIds;
  public constructor(
    private readonly deps: OperationsDeps,
    sessionList: SessionList,
  ) {
    this.implementations = createImplementations(deps, sessionList);
    this.waitIds = new WaitIds(deps.controlToken);
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
    id: OperationId,
    params: Json,
    wait = false,
    signal?: AbortSignal,
  ): Promise<OperationResult | OperationExecution> {
    const caller = this.caller(token);

    const started = startRecordedOperation(
      { deps: this.deps, caller },
      { name: id, label: operations[id].label, input: params },
      (call) => this.authorized(caller, { id, params }, call),
    );
    if (!started.call || caller.kind === 'user') return started.result;
    const waitId = this.waitIds.issue(caller, {
      kind: 'call',
      sessionId: caller.sessionId,
      entityId: started.call.toolCallId,
    });
    const observer = new AbortController();
    const observed = this.observe(
      waitId,
      () => caller,
      signal ? AbortSignal.any([signal, observer.signal]) : observer.signal,
      !wait,
    );
    return Promise.race([
      started.result,
      observed.then(
        async (value): Promise<OperationResult | OperationExecution> =>
          value.status === 'settled' ? started.result : value,
      ),
    ]).finally(() => observer.abort());
  }
  public wait(
    id: string,
    token: string | undefined,
    signal?: AbortSignal,
    stopOnInput = false,
  ): Promise<OperationExecution> {
    return this.observe(id, () => this.caller(token), signal, stopOnInput);
  }
  private observe(
    id: string,
    readCaller: () => OperationCaller,
    signal?: AbortSignal,
    stopOnInput = false,
  ): Promise<OperationExecution> {
    const caller = readCaller();
    const work = this.waitIds.require(caller, id);
    if (work.kind !== 'call')
      throw new Error('Turn waits are not available yet');
    const read = (): OperationExecution => {
      this.waitIds.require(readCaller(), id);
      const value = readSessionOperation(
        this.deps,
        work.sessionId,
        work.entityId,
      );
      if (value.error) throw new Error(value.error);
      return {
        kind: 'operation_execution',
        id,
        status: value.status,
        ...(value.result === undefined ? {} : { result: value.result }),
      };
    };
    return waitForNativeWork({
      read,
      sessionId: work.sessionId,
      watch: this.deps.watchSessionSnapshot,
      clock: this.deps.operationWaitClock,
      signal,
      stopOnInput,
    });
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
    params: Json | undefined,
  ): Promise<OperationResult<Id>> {
    return runOperation(this.implementations, id, params);
  }
}
